import type { Payment } from "@/types";

import { BUSINESS_IDS } from "./businesses";
import { PROJECT_IDS } from "./projects";
import type { SeedDates } from "./seed-dates";

export const PAYMENT_IDS = {
  boiNaBrasaWebPartial: "pay-boi-na-brasa-web",
  boiNaBrasaCardPaid: "pay-boi-na-brasa-card",
  talhoOverdue: "pay-talho-web",
  autoEletricaPartial: "pay-auto-eletrica-card",
  autoformigalNotStarted: "pay-autoformigal-web",
  beautyCardPartial: "pay-beauty-card",
  cafeCentralPaid: "pay-cafe-central-card",
  clinicaPaid: "pay-clinica-web",
  ginasioBusinessLevel: "pay-ginasio-plan",
  barbeariaPaid: "pay-barbearia-web",
} as const;

/**
 * Finance simples: total, recebido, e o resto calculado.
 *
 * `paymentStatus` guardado é só `not_started | partial | paid` — o estado
 * "em atraso" é **derivado** da `expectedDate` (ver `utils/payment.ts`),
 * porque uma coluna com esse valor ficaria desatualizada no dia seguinte.
 *
 * Cobertura: pagamento **parcial**, pagamento **vencido com saldo**, pagamento
 * totalmente pago (mesmo com data passada → nunca é atenção), um por começar,
 * e um ao nível do negócio (`projectId: null`).
 */
export function buildPayments(d: SeedDates): Payment[] {
  return [
    {
      // CENÁRIO: pagamento parcial (400 total, 200 recebidos).
      id: PAYMENT_IDS.boiNaBrasaWebPartial,
      businessId: BUSINESS_IDS.boiNaBrasa,
      projectId: PROJECT_IDS.boiNaBrasaWeb,
      totalValue: 400,
      amountReceived: 200,
      paymentStatus: "partial",
      expectedDate: d.day(10),
      createdAt: d.stamp(-70),
      updatedAt: d.stamp(-40),
    },
    {
      id: PAYMENT_IDS.boiNaBrasaCardPaid,
      businessId: BUSINESS_IDS.boiNaBrasa,
      projectId: PROJECT_IDS.boiNaBrasaCard,
      totalValue: 320,
      amountReceived: 320,
      paymentStatus: "paid",
      expectedDate: d.day(-280),
      createdAt: d.stamp(-320),
      updatedAt: d.stamp(-285),
    },
    {
      // CENÁRIO: pagamento em atraso (vencido há 9 dias, ainda com saldo).
      id: PAYMENT_IDS.talhoOverdue,
      businessId: BUSINESS_IDS.talho,
      projectId: PROJECT_IDS.talhoWeb,
      totalValue: 750,
      amountReceived: 250,
      paymentStatus: "partial",
      expectedDate: d.day(-9),
      createdAt: d.stamp(-85),
      updatedAt: d.stamp(-30),
    },
    {
      id: PAYMENT_IDS.autoEletricaPartial,
      businessId: BUSINESS_IDS.autoEletrica,
      projectId: PROJECT_IDS.autoEletricaCard,
      totalValue: 480,
      amountReceived: 240,
      paymentStatus: "partial",
      expectedDate: d.day(5),
      createdAt: d.stamp(-25),
      updatedAt: d.stamp(-20),
    },
    {
      id: PAYMENT_IDS.autoformigalNotStarted,
      businessId: BUSINESS_IDS.autoformigal,
      projectId: PROJECT_IDS.autoformigalWeb,
      totalValue: 1500,
      amountReceived: 0,
      paymentStatus: "not_started",
      expectedDate: d.day(25),
      createdAt: d.stamp(-45),
      updatedAt: d.stamp(-45),
    },
    {
      id: PAYMENT_IDS.beautyCardPartial,
      businessId: BUSINESS_IDS.beautyConnection,
      projectId: PROJECT_IDS.beautyCard,
      totalValue: 640,
      amountReceived: 320,
      paymentStatus: "partial",
      expectedDate: d.day(3),
      createdAt: d.stamp(-30),
      updatedAt: d.stamp(-25),
    },
    {
      // Pago, com data passada: nunca pode aparecer como atrasado.
      id: PAYMENT_IDS.cafeCentralPaid,
      businessId: BUSINESS_IDS.cafeCentral,
      projectId: PROJECT_IDS.cafeCentralCard,
      totalValue: 380,
      amountReceived: 380,
      paymentStatus: "paid",
      expectedDate: d.day(-55),
      createdAt: d.stamp(-120),
      updatedAt: d.stamp(-58),
    },
    {
      id: PAYMENT_IDS.clinicaPaid,
      businessId: BUSINESS_IDS.clinicaSorriso,
      projectId: PROJECT_IDS.clinicaWeb,
      totalValue: 1800,
      amountReceived: 1800,
      paymentStatus: "paid",
      expectedDate: d.day(-140),
      createdAt: d.stamp(-200),
      updatedAt: d.stamp(-145),
    },
    {
      // Ao nível do negócio, sem projeto associado.
      id: PAYMENT_IDS.ginasioBusinessLevel,
      businessId: BUSINESS_IDS.ginasioImpulso,
      projectId: null,
      totalValue: 240,
      amountReceived: 0,
      paymentStatus: "not_started",
      expectedDate: d.day(28),
      createdAt: d.stamp(-20),
      updatedAt: d.stamp(-20),
    },
    {
      id: PAYMENT_IDS.barbeariaPaid,
      businessId: BUSINESS_IDS.barbearia,
      projectId: PROJECT_IDS.barbeariaWeb,
      totalValue: 900,
      amountReceived: 900,
      paymentStatus: "paid",
      expectedDate: d.day(-470),
      createdAt: d.stamp(-520),
      updatedAt: d.stamp(-472),
    },
  ];
}
