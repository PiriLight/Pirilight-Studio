import type { Payment, PaymentStatus, PaymentSummary } from "@/types";

import { isBeforeIso } from "./date";

/**
 * O valor em falta é **sempre calculado**, nunca guardado — é a única forma de
 * garantir que não mente quando o recebido é atualizado.
 *
 * Não é limitado a zero de propósito: um valor negativo significa que
 * recebemos mais do que o total, ou seja, um erro nos dados. Escondê-lo com um
 * `Math.max(0, …)` só atrasaria a descoberta. (O schema já impede o caso, com
 * `amountReceived <= totalValue`.)
 */
export function getRemainingValue(payment: Pick<Payment, "totalValue" | "amountReceived">): number {
  return roundEuros(payment.totalValue - payment.amountReceived);
}

/** Arredonda a cêntimos, evitando o lixo típico da vírgula flutuante. */
export function roundEuros(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Estado apresentado ao utilizador = estado guardado + `overdue` derivado.
 *
 * `overdue` nunca é guardado (ver `validation/payment.ts`): depende da data de
 * hoje, por isso é calculado no momento da leitura.
 */
export function derivePaymentStatus(payment: Payment, todayIso: string): PaymentStatus {
  if (payment.paymentStatus === "paid") return "paid";
  if (getRemainingValue(payment) > 0 && isBeforeIso(payment.expectedDate, todayIso)) {
    return "overdue";
  }
  return payment.paymentStatus;
}

/** Agrega vários pagamentos (de um negócio ou de um projeto) numa vista única. */
export function summarizePayments(payments: readonly Payment[], todayIso: string): PaymentSummary {
  const totalValue = roundEuros(payments.reduce((sum, p) => sum + p.totalValue, 0));
  const amountReceived = roundEuros(payments.reduce((sum, p) => sum + p.amountReceived, 0));

  return {
    totalValue,
    amountReceived,
    remainingValue: roundEuros(totalValue - amountReceived),
    hasOverdue: payments.some((p) => derivePaymentStatus(p, todayIso) === "overdue"),
    // Round 5.1: nunca inferido de totalValue === 0 — um Payment real pode
    // legitimamente ter um total de 0€, e isso não é o mesmo que não existir.
    hasPayments: payments.length > 0,
  };
}

/**
 * O que `PaymentProgress` precisa de saber para decidir o que mostrar — sem
 * usar `totalValue === 0` como sinónimo de "sem pagamentos" (Round 5.1).
 * Extraída como função pura para ser testável sem montar o componente (este
 * projeto não tem testes de componentes — só de lógica pura).
 */
export interface PaymentProgressView {
  hasPayments: boolean;
  /** Sempre entre 0 e 100; 100 quando `totalValue === 0` (nada em falta, nada a dividir). */
  percent: number;
  isPaid: boolean;
}

export function derivePaymentProgressView(summary: PaymentSummary): PaymentProgressView {
  if (!summary.hasPayments) {
    return { hasPayments: false, percent: 0, isPaid: false };
  }

  const percent =
    summary.totalValue === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((summary.amountReceived / summary.totalValue) * 100)));

  return { hasPayments: true, percent, isPaid: summary.remainingValue <= 0 };
}
