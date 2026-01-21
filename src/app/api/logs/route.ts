import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export async function GET() {
  const storage = getStorage();
  const logs = await storage.listLogs();
  return NextResponse.json(logs);
}
