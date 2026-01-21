import { NextResponse } from "next/server";
import { applyDiscountSchema } from "@/lib/schema";
import { applyRechargeDiscount } from "@/lib/recharge";
import { getStorage } from "@/lib/storage";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = applyDiscountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const storage = getStorage();
  const settings = parsed.data.settings ?? (await storage.getSettings());
  const result = await applyRechargeDiscount({ ...parsed.data, settings });

  return NextResponse.json(result);
}
