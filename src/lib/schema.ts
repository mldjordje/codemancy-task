import { z } from "zod";

const stageSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const flowInputSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required."),
  email: z.string().email("Email must be valid."),
  stage: stageSchema.optional(),
  forceFail: z.boolean().optional(),
});

export const settingsSchema = z.object({
  applyTo: z.enum(["active_only", "active_and_paused"]),
  existingDiscount: z.enum(["skip", "override"]),
  discountPercent: z.coerce.number().min(1).max(90),
  durationDays: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      if (typeof value === "number" && Number.isNaN(value)) {
        return null;
      }
      return Number(value);
    },
    z.number().int().positive().nullable()
  ),
  applyToFutureSubscriptions: z.preprocess(
    (value) => value === true || value === "true",
    z.boolean()
  ),
});

export const stageSimulationSchema = z.object({
  stage: stageSchema,
  count: z.coerce.number().int().min(1).max(50),
});

export const applyDiscountSchema = z.object({
  customerId: z.string().min(1),
  email: z.string().email(),
  subscriptions: z.array(
    z.object({
      subscriptionId: z.string(),
      status: z.enum(["active", "paused", "cancelled"]),
      hasDiscount: z.boolean(),
      discountPercent: z.number().optional(),
      discountDurationDays: z.number().nullable().optional(),
    })
  ),
  settings: settingsSchema,
  forceFail: z.boolean().optional(),
});
