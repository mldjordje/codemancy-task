import { NextResponse } from "next/server";
import { flowInputSchema } from "@/lib/schema";
import { runRaffleWinnerFlow } from "@/lib/flow";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = flowInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const run = await runRaffleWinnerFlow(parsed.data);
  return NextResponse.json(run);
}
