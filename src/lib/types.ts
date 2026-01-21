export type Stage = 1 | 2 | 3;

export type RunStatus = "success" | "failed" | "already_processed" | "needs_review";
export type StepStatus = "pending" | "success" | "failed" | "skipped";

export interface Customer {
  customerId: string;
  email: string;
}

export interface Subscription {
  subscriptionId: string;
  status: "active" | "paused" | "cancelled";
  hasDiscount: boolean;
  discountPercent?: number;
  discountDurationDays?: number | null;
}

export interface Step {
  name: string;
  status: StepStatus;
  message: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

export interface Attempt {
  attempt: number;
  source: "auto" | "manual";
  phase: "apply_discount";
  status: "success" | "failed";
  startedAt: string;
  endedAt: string;
  durationMs: number;
  backoffMs: number;
  errorMessage?: string;
}

export interface FlowRun {
  runId: string;
  correlationId: string;
  customerId: string;
  email: string;
  stage: Stage;
  status: RunStatus;
  createdAt: string;
  steps: Step[];
  attempts: Attempt[];
}

export interface Settings {
  applyTo: "active_only" | "active_and_paused";
  existingDiscount: "skip" | "override";
  discountPercent: number;
  durationDays: number | null;
  applyToFutureSubscriptions: boolean;
}

export interface AuditLog {
  logId: string;
  runId?: string;
  correlationId?: string;
  type:
    | "run_started"
    | "idempotency_hit"
    | "subscriptions_fetched"
    | "recharge_attempt"
    | "recharge_failed"
    | "email_sent"
    | "customer_marked"
    | "run_completed"
    | "run_needs_review"
    | "settings_updated"
    | "stage_simulated"
    | "manual_retry";
  message: string;
  createdAt: string;
  payload?: unknown;
}

export interface StaffEmailPayload {
  to: string;
  subject: string;
  body: string;
  customerId: string;
  email: string;
  runId: string;
  correlationId: string;
}

export interface FlowInput {
  customerId: string;
  email: string;
  stage?: Stage;
  forceFail?: boolean;
}

export interface StageSimulationInput {
  stage: Stage;
  count: number;
}

export interface ApplyDiscountRequest {
  customerId: string;
  email: string;
  subscriptions: Subscription[];
  settings: Settings;
  forceFail?: boolean;
}

export interface ApplyDiscountResult {
  ok: boolean;
  requestId: string;
  appliedCount: number;
  skippedCount: number;
  message: string;
  updatedSubscriptions: Subscription[];
  skipped: Array<{ subscriptionId: string; reason: string }>;
  appliedToFutureSubscriptions: boolean;
}
