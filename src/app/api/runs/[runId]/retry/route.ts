import { NextResponse } from "next/server";
import { retryFlowRun } from "@/lib/flow";

type RouteParams = {
  params: Promise<{ runId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  const { runId } = await context.params;
  let forceFail = false;
  try {
    const body = await request.json();
    forceFail = Boolean(body?.forceFail);
  } catch {
    forceFail = false;
  }

  try {
    const run = await retryFlowRun(runId, forceFail);
    return NextResponse.json(run);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
