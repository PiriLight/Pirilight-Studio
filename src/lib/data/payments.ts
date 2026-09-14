import { summarizePayments } from "@/lib/utils/payment";
import { todayIso } from "@/lib/utils/date";
import type { Payment, PaymentSummary } from "@/types";

import { getMockData, read } from "./internal";

export async function getPayments(now: Date = new Date()): Promise<Payment[]> {
  return read(getMockData(now).payments);
}

export async function getPaymentsByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<Payment[]> {
  return read(getMockData(now).payments.filter((p) => p.businessId === businessId));
}

export async function getPaymentsByProjectId(
  projectId: string,
  now: Date = new Date(),
): Promise<Payment[]> {
  return read(getMockData(now).payments.filter((p) => p.projectId === projectId));
}

/** Agregado usado pelo futuro `PaymentProgress` (total / recebido / em falta). */
export async function getPaymentSummaryForBusiness(
  businessId: string,
  now: Date = new Date(),
): Promise<PaymentSummary> {
  const payments = getMockData(now).payments.filter((p) => p.businessId === businessId);
  return summarizePayments(payments, todayIso(now));
}

export async function getPaymentSummaryForProject(
  projectId: string,
  now: Date = new Date(),
): Promise<PaymentSummary> {
  const payments = getMockData(now).payments.filter((p) => p.projectId === projectId);
  return summarizePayments(payments, todayIso(now));
}
