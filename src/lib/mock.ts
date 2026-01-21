import { Subscription } from "./types";

const hashSeed = (value: string) =>
  value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

export const mockSubscriptions = (customerId: string): Subscription[] => {
  const seed = hashSeed(customerId);
  const count = 2 + (seed % 3);
  const statuses: Subscription["status"][] = ["active", "paused", "cancelled"];

  return Array.from({ length: count }).map((_, index) => {
    const hasDiscount = (seed + index * 3) % 4 === 0;
    const discountPercent = hasDiscount ? 5 + ((seed + index) % 3) * 5 : undefined;
    return {
      subscriptionId: `sub_${customerId}_${index + 1}`,
      status: statuses[(seed + index) % statuses.length],
      hasDiscount,
      discountPercent,
      discountDurationDays: hasDiscount ? null : undefined,
    };
  });
};
