import { z } from "zod";

import { auditFields, entityId, isoDate, money } from "./common";

export const RENEWAL_TYPES = [
  "domain",
  "hosting",
  "card_subscription",
  "maintenance_plan",
] as const;
export const renewalTypeSchema = z.enum(RENEWAL_TYPES);
export type RenewalType = (typeof RENEWAL_TYPES)[number];

export const RENEWAL_CADENCES = ["monthly", "annual", "biennial"] as const;
export const renewalCadenceSchema = z.enum(RENEWAL_CADENCES);
export type RenewalCadence = (typeof RENEWAL_CADENCES)[number];

/**
 * Estados guardados: `pending`, `renewed`, `cancelled`.
 *
 * Repare-se que **não existe `overdue` guardado** — pela mesma razão que
 * `remainingValue` nunca é guardado: uma renovação "em atraso" é uma função da
 * data de hoje, e uma coluna com esse valor passaria a mentir no dia seguinte,
 * sem ninguém a editar. O atraso é derivado em `attention-rules`.
 */
export const RENEWAL_STATUSES = ["pending", "renewed", "cancelled"] as const;
export const renewalStatusSchema = z.enum(RENEWAL_STATUSES);
export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];

export const renewalSchema = z.strictObject({
  id: entityId,
  projectId: entityId,
  type: renewalTypeSchema,
  cadence: renewalCadenceSchema,
  dueDate: isoDate,
  amount: money,
  status: renewalStatusSchema,
  ...auditFields,
});

export type Renewal = z.infer<typeof renewalSchema>;
