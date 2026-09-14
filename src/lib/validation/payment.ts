import { z } from "zod";

import { auditFields, entityId, isoDate, money } from "./common";

/**
 * Finance deliberadamente simples: um registo por combinação
 * Business/Project, com um total e um recebido. Sem `Invoice`, sem
 * `Transaction`, sem lógica de faturação — nada disso resolve hoje um
 * problema real de duas pessoas.
 *
 * Estados guardados: `not_started`, `partial`, `paid`.
 * Tal como nas renovações, **`overdue` não é guardado** — é derivado da
 * `expectedDate` em `attention-rules` (`derivePaymentStatus`). Uma coluna
 * "em atraso" ficaria desatualizada no dia seguinte.
 */
export const STORED_PAYMENT_STATUSES = ["not_started", "partial", "paid"] as const;
export const storedPaymentStatusSchema = z.enum(STORED_PAYMENT_STATUSES);
export type StoredPaymentStatus = (typeof STORED_PAYMENT_STATUSES)[number];

/** Estado apresentado ao utilizador = estado guardado + `overdue` derivado. */
export const PAYMENT_STATUSES = [...STORED_PAYMENT_STATUSES, "overdue"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const paymentSchema = z
  .strictObject({
    id: entityId,
    businessId: entityId,
    /** `null` = pagamento ao nível do negócio, não ligado a um projeto específico. */
    projectId: entityId.nullable(),
    totalValue: money,
    amountReceived: money,
    paymentStatus: storedPaymentStatusSchema,
    expectedDate: isoDate,
    ...auditFields,
  })
  .refine((p) => p.amountReceived <= p.totalValue, {
    message: "amountReceived não pode exceder totalValue",
  })
  .refine(
    (p) =>
      p.paymentStatus === "paid"
        ? p.amountReceived === p.totalValue
        : p.paymentStatus === "not_started"
          ? p.amountReceived === 0
          : p.amountReceived > 0 && p.amountReceived < p.totalValue,
    { message: "paymentStatus tem de ser coerente com os montantes" },
  );

export type Payment = z.infer<typeof paymentSchema>;
