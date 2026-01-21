import { NextResponse } from "next/server";
import { stageSimulationSchema } from "@/lib/schema";
import { runRaffleWinnerFlow } from "@/lib/flow";
import { createId, nowIso } from "@/lib/utils";
import { getStorage } from "@/lib/storage";

const buildStageCustomer = (stage: number, index: number) => {
  const suffix = `${Date.now().toString(36)}-${index + 1}`;
  return {
    customerId: `stage${stage}-winner-${suffix}`,
    email: `winner${index + 1}.stage${stage}@example.com`,
  };
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = stageSimulationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { stage, count } = parsed.data;
  const storage = getStorage();
  const throttleMs = Math.round(60000 / 5);
  const startedAt = nowIso();

  const runs = [];
  for (let index = 0; index < count; index += 1) {
    const customer = buildStageCustomer(stage, index);
    const scheduledAt = new Date(Date.now() + index * throttleMs).toISOString();
    const run = await runRaffleWinnerFlow({
      ...customer,
      stage,
    });
    runs.push({
      runId: run.runId,
      customerId: customer.customerId,
      email: customer.email,
      scheduledAt,
      status: run.status,
    });
  }

  await storage.appendLog({
    logId: createId(),
    type: "stage_simulated",
    message: `Stage ${stage} batch simulated.`,
    createdAt: nowIso(),
    payload: { stage, count, throttleMs },
  });

  return NextResponse.json({
    stage,
    count,
    throttleMs,
    startedAt,
    runs,
  });
}
