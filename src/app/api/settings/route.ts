import { NextResponse } from "next/server";
import { settingsSchema } from "@/lib/schema";
import { getStorage } from "@/lib/storage";
import { createId, nowIso } from "@/lib/utils";

export async function GET() {
  const storage = getStorage();
  const settings = await storage.getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const storage = getStorage();
  await storage.saveSettings(parsed.data);
  await storage.appendLog({
    logId: createId(),
    type: "settings_updated",
    message: "Settings updated by merchant.",
    createdAt: nowIso(),
    payload: parsed.data,
  });

  return NextResponse.json(parsed.data);
}
