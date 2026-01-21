import {
  ApplyDiscountResult,
  FlowInput,
  FlowRun,
  Settings,
  StaffEmailPayload,
  Step,
  Subscription,
} from "./types";
import { applyRechargeDiscount } from "./recharge";
import { mockSubscriptions } from "./mock";
import { defaultSettings } from "./settings";
import { getStorage } from "./storage";
import { createId, durationMs, nowIso, sleep } from "./utils";

const BACKOFFS_MS = [1000, 5000, 15000];
const MAX_SIMULATED_DELAY_MS = 400;

const createStep = (name: string, requestPayload?: unknown): Step => {
  const startedAt = nowIso();
  return {
    name,
    status: "pending",
    message: "",
    startedAt,
    endedAt: startedAt,
    durationMs: 0,
    requestPayload,
  };
};

const finalizeStep = (
  step: Step,
  status: Step["status"],
  message: string,
  responsePayload?: unknown
) => {
  const endedAt = nowIso();
  step.status = status;
  step.message = message;
  step.endedAt = endedAt;
  step.durationMs = durationMs(step.startedAt, endedAt);
  step.responsePayload = responsePayload;
};

const buildStaffEmail = (run: FlowRun): StaffEmailPayload => {
  return {
    to: "ops@merchant.example",
    subject: `Raffle winner discount applied: ${run.customerId}`,
    body: [
      "A raffle winner discount was applied successfully.",
      `Customer: ${run.customerId} (${run.email})`,
      `Run ID: ${run.runId}`,
      `Correlation ID: ${run.correlationId}`,
      "Please verify the subscription discounts in Recharge.",
    ].join("\n"),
    customerId: run.customerId,
    email: run.email,
    runId: run.runId,
    correlationId: run.correlationId,
  };
};

const applyDiscountWithRetries = async (params: {
  run: FlowRun;
  subscriptions: Subscription[];
  settings: Settings;
  forceFail?: boolean;
  stepName: string;
  source: "auto" | "manual";
}): Promise<{
  step: Step;
  success: boolean;
  updatedSubscriptions: Subscription[];
  result?: ApplyDiscountResult;
  errorMessage?: string;
}> => {
  const storage = getStorage();
  const step = createStep(params.stepName, {
    customerId: params.run.customerId,
    settings: params.settings,
    subscriptions: params.subscriptions,
  });

  let lastError = "";
  let updatedSubscriptions = params.subscriptions;

  for (let index = 0; index < BACKOFFS_MS.length; index += 1) {
    const backoffMs = BACKOFFS_MS[index];
    const attemptStart = nowIso();

    try {
      const result = await applyRechargeDiscount({
        customerId: params.run.customerId,
        email: params.run.email,
        subscriptions: updatedSubscriptions,
        settings: params.settings,
        forceFail: params.forceFail,
      });
      const attemptEnd = nowIso();
      params.run.attempts.push({
        attempt: index + 1,
        source: params.source,
        phase: "apply_discount",
        status: "success",
        startedAt: attemptStart,
        endedAt: attemptEnd,
        durationMs: durationMs(attemptStart, attemptEnd),
        backoffMs,
      });
      finalizeStep(step, "success", result.message, result);
      await storage.appendLog({
        logId: createId(),
        runId: params.run.runId,
        correlationId: params.run.correlationId,
        type: "recharge_attempt",
        message: result.message,
        createdAt: nowIso(),
        payload: { requestId: result.requestId, appliedCount: result.appliedCount },
      });
      updatedSubscriptions = result.updatedSubscriptions;
      return { step, success: true, updatedSubscriptions, result };
    } catch (error) {
      const attemptEnd = nowIso();
      const message = error instanceof Error ? error.message : "Unknown error";
      lastError = message;
      params.run.attempts.push({
        attempt: index + 1,
        source: params.source,
        phase: "apply_discount",
        status: "failed",
        startedAt: attemptStart,
        endedAt: attemptEnd,
        durationMs: durationMs(attemptStart, attemptEnd),
        backoffMs,
        errorMessage: message,
      });
      await storage.appendLog({
        logId: createId(),
        runId: params.run.runId,
        correlationId: params.run.correlationId,
        type: "recharge_failed",
        message,
        createdAt: nowIso(),
        payload: { attempt: index + 1 },
      });

      // Demo-friendly delay while preserving the backoff in audit trails.
      if (index < BACKOFFS_MS.length - 1) {
        await sleep(Math.min(backoffMs, MAX_SIMULATED_DELAY_MS));
      }
    }
  }

  finalizeStep(
    step,
    "failed",
    lastError || "Recharge apply discount failed",
    { error: lastError }
  );
  return { step, success: false, updatedSubscriptions, errorMessage: lastError };
};

export const runRaffleWinnerFlow = async (
  input: FlowInput
): Promise<FlowRun> => {
  const storage = getStorage();
  const settings = (await storage.getSettings()) ?? defaultSettings;
  const run: FlowRun = {
    runId: createId(),
    correlationId: createId(),
    customerId: input.customerId,
    email: input.email,
    stage: input.stage ?? 1,
    status: "failed",
    createdAt: nowIso(),
    steps: [],
    attempts: [],
  };

  await storage.appendLog({
    logId: createId(),
    runId: run.runId,
    correlationId: run.correlationId,
    type: "run_started",
    message: "Flow triggered by rafflewinner tag.",
    createdAt: nowIso(),
    payload: { stage: run.stage, forceFail: input.forceFail ?? false },
  });

  try {
    const idempotencyStep = createStep("Idempotency check", {
      customerId: run.customerId,
    });
    const processedAtExisting = await storage.getProcessedCustomer(run.customerId);
    if (processedAtExisting) {
      finalizeStep(
        idempotencyStep,
        "success",
        `Customer already processed on ${processedAtExisting}.`,
        { processedAt: processedAtExisting }
      );
      run.steps.push(idempotencyStep);
      run.status = "already_processed";
      await storage.appendLog({
        logId: createId(),
        runId: run.runId,
        correlationId: run.correlationId,
        type: "idempotency_hit",
        message: "Customer was already processed.",
        createdAt: nowIso(),
        payload: { processedAt: processedAtExisting },
      });
      await storage.saveRun(run);
      return run;
    }
    finalizeStep(
      idempotencyStep,
      "success",
      "Customer not processed yet."
    );
    run.steps.push(idempotencyStep);

    const subscriptionsStep = createStep("Fetch subscriptions", {
      customerId: run.customerId,
    });
    const subscriptions = mockSubscriptions(run.customerId);
    finalizeStep(
      subscriptionsStep,
      "success",
      `Fetched ${subscriptions.length} subscriptions.`,
      { subscriptions }
    );
    run.steps.push(subscriptionsStep);
    await storage.appendLog({
      logId: createId(),
      runId: run.runId,
      correlationId: run.correlationId,
      type: "subscriptions_fetched",
      message: "Fetched subscriptions from Recharge (mock).",
      createdAt: nowIso(),
      payload: { count: subscriptions.length },
    });

    const discountResult = await applyDiscountWithRetries({
      run,
      subscriptions,
      settings,
      forceFail: input.forceFail,
      stepName: "Apply Recharge discount",
      source: "auto",
    });
    run.steps.push(discountResult.step);

    if (!discountResult.success) {
      run.status = "needs_review";
      await storage.appendLog({
        logId: createId(),
        runId: run.runId,
        correlationId: run.correlationId,
        type: "run_needs_review",
        message: "Retries exhausted. Manual review required.",
        createdAt: nowIso(),
        payload: { error: discountResult.errorMessage },
      });
      await storage.saveRun(run);
      return run;
    }

    const emailStep = createStep("Send staff email", {
      channel: "Shopify email",
    });
    const emailPayload = buildStaffEmail(run);
    finalizeStep(emailStep, "success", "Staff email sent.", emailPayload);
    run.steps.push(emailStep);
    await storage.appendLog({
      logId: createId(),
      runId: run.runId,
      correlationId: run.correlationId,
      type: "email_sent",
      message: "Internal notification email dispatched.",
      createdAt: nowIso(),
      payload: { subject: emailPayload.subject },
    });

    const markProcessedStep = createStep("Mark customer processed");
    const processedAt = nowIso();
    await storage.markCustomerProcessed(run.customerId, processedAt);
    finalizeStep(
      markProcessedStep,
      "success",
      `Customer processed at ${processedAt}.`,
      { processedAt }
    );
    run.steps.push(markProcessedStep);
    run.status = "success";
    await storage.appendLog({
      logId: createId(),
      runId: run.runId,
      correlationId: run.correlationId,
      type: "customer_marked",
      message: "Customer marked as processed.",
      createdAt: nowIso(),
      payload: { processedAt },
    });

    await storage.appendLog({
      logId: createId(),
      runId: run.runId,
      correlationId: run.correlationId,
      type: "run_completed",
      message: "Flow completed successfully.",
      createdAt: nowIso(),
    });

    await storage.saveRun(run);
    return run;
  } catch (error) {
    const failureStep = createStep("Unhandled exception");
    const message = error instanceof Error ? error.message : "Unknown error";
    finalizeStep(failureStep, "failed", message);
    run.steps.push(failureStep);
    run.status = "failed";
    await storage.saveRun(run);
    return run;
  }
};

export const retryFlowRun = async (
  runId: string,
  forceFail?: boolean
): Promise<FlowRun> => {
  const storage = getStorage();
  const run = await storage.getRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }

  const settings = (await storage.getSettings()) ?? defaultSettings;

  await storage.appendLog({
    logId: createId(),
    runId: run.runId,
    correlationId: run.correlationId,
    type: "manual_retry",
    message: "Manual retry initiated.",
    createdAt: nowIso(),
  });

  const idempotencyStep = createStep("Manual retry: idempotency check", {
    customerId: run.customerId,
  });
  const processedAt = await storage.getProcessedCustomer(run.customerId);
  if (processedAt) {
    finalizeStep(
      idempotencyStep,
      "success",
      `Customer already processed on ${processedAt}.`,
      { processedAt }
    );
    run.steps.push(idempotencyStep);
    run.status = "already_processed";
    await storage.saveRun(run);
    return run;
  }
  finalizeStep(idempotencyStep, "success", "Customer not processed yet.");
  run.steps.push(idempotencyStep);

  const subscriptionsStep = createStep("Manual retry: fetch subscriptions", {
    customerId: run.customerId,
  });
  const subscriptions = mockSubscriptions(run.customerId);
  finalizeStep(
    subscriptionsStep,
    "success",
    `Fetched ${subscriptions.length} subscriptions.`,
    { subscriptions }
  );
  run.steps.push(subscriptionsStep);

  const discountResult = await applyDiscountWithRetries({
    run,
    subscriptions,
    settings,
    forceFail,
    stepName: "Manual retry: apply Recharge discount",
    source: "manual",
  });
  run.steps.push(discountResult.step);

  if (!discountResult.success) {
    run.status = "needs_review";
    await storage.saveRun(run);
    return run;
  }

  const emailStep = createStep("Manual retry: send staff email");
  const emailPayload = buildStaffEmail(run);
  finalizeStep(emailStep, "success", "Staff email sent.", emailPayload);
  run.steps.push(emailStep);

  const markProcessedStep = createStep("Manual retry: mark customer processed");
  const processedAtRetry = nowIso();
  await storage.markCustomerProcessed(run.customerId, processedAtRetry);
  finalizeStep(
    markProcessedStep,
    "success",
    `Customer processed at ${processedAtRetry}.`,
    { processedAt: processedAtRetry }
  );
  run.steps.push(markProcessedStep);

  run.status = "success";
  await storage.saveRun(run);
  return run;
};
