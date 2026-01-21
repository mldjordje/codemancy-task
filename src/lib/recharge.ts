import { ApplyDiscountRequest, ApplyDiscountResult } from "./types";
import { createId } from "./utils";

export const applyRechargeDiscount = async (
  request: ApplyDiscountRequest
): Promise<ApplyDiscountResult> => {
  if (request.forceFail) {
    throw new Error("Recharge API error: 502 Bad Gateway (simulated)");
  }

  const eligibleStatuses =
    request.settings.applyTo === "active_only" ? ["active"] : ["active", "paused"];

  let appliedCount = 0;
  let skippedCount = 0;
  const skipped: ApplyDiscountResult["skipped"] = [];

  const updatedSubscriptions = request.subscriptions.map((subscription) => {
    if (!eligibleStatuses.includes(subscription.status)) {
      skippedCount += 1;
      skipped.push({
        subscriptionId: subscription.subscriptionId,
        reason: `Status ${subscription.status} is excluded by policy`,
      });
      return subscription;
    }

    if (subscription.hasDiscount && request.settings.existingDiscount === "skip") {
      skippedCount += 1;
      skipped.push({
        subscriptionId: subscription.subscriptionId,
        reason: "Existing discount preserved",
      });
      return subscription;
    }

    appliedCount += 1;
    return {
      ...subscription,
      hasDiscount: true,
      discountPercent: request.settings.discountPercent,
      discountDurationDays: request.settings.durationDays,
    };
  });

  return {
    ok: true,
    requestId: createId(),
    appliedCount,
    skippedCount,
    message:
      appliedCount === 0
        ? "No eligible subscriptions to update"
        : `Applied ${request.settings.discountPercent}% discount to ${appliedCount} subscriptions`,
    updatedSubscriptions,
    skipped,
    appliedToFutureSubscriptions: request.settings.applyToFutureSubscriptions,
  };
};
