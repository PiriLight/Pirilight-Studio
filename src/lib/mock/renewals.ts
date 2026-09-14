import type { Renewal } from "@/types";

import { PROJECT_IDS } from "./projects";
import type { SeedDates } from "./seed-dates";

export const RENEWAL_IDS = {
  boiNaBrasaDomain: "ren-boi-na-brasa-domain",
  boiNaBrasaHosting: "ren-boi-na-brasa-hosting",
  autoformigalHosting: "ren-autoformigal-hosting",
  ginasioPlan: "ren-ginasio-plan",
  clinicaDomain: "ren-clinica-domain",
  beautySubscription: "ren-beauty-subscription",
  cafeCentralCancelled: "ren-cafe-central-cancelled",
  barbeariaRenewed: "ren-barbearia-renewed",
} as const;

/**
 * Renovações — o tipo de coisa que só dá para "esquecer" uma vez.
 *
 * Cobertura: uma **amanhã**, uma **já vencida**, uma dentro da janela de 30
 * dias, uma a 45 dias (fora da janela de atenção mas dentro do painel de 60),
 * mais uma cancelada e uma já renovada (nunca geram atenção).
 */
export function buildRenewals(d: SeedDates): Renewal[] {
  return [
    {
      // CENÁRIO: renovação amanhã.
      id: RENEWAL_IDS.boiNaBrasaDomain,
      projectId: PROJECT_IDS.boiNaBrasaWeb,
      type: "domain",
      cadence: "annual",
      dueDate: d.day(1),
      amount: 18,
      status: "pending",
      createdAt: d.stamp(-350),
      updatedAt: d.stamp(-350),
    },
    {
      // Já vencida.
      id: RENEWAL_IDS.boiNaBrasaHosting,
      projectId: PROJECT_IDS.boiNaBrasaWeb,
      type: "hosting",
      cadence: "annual",
      dueDate: d.day(-4),
      amount: 96,
      status: "pending",
      createdAt: d.stamp(-360),
      updatedAt: d.stamp(-360),
    },
    {
      // Fora da janela de atenção (30 dias), dentro do painel de renovações (60).
      id: RENEWAL_IDS.autoformigalHosting,
      projectId: PROJECT_IDS.autoformigalWeb,
      type: "hosting",
      cadence: "annual",
      dueDate: d.day(45),
      amount: 96,
      status: "pending",
      createdAt: d.stamp(-320),
      updatedAt: d.stamp(-320),
    },
    {
      // Dentro da janela de 30 dias.
      id: RENEWAL_IDS.ginasioPlan,
      projectId: PROJECT_IDS.ginasioWeb,
      type: "maintenance_plan",
      cadence: "annual",
      dueDate: d.day(28),
      amount: 240,
      status: "pending",
      createdAt: d.stamp(-340),
      updatedAt: d.stamp(-340),
    },
    {
      id: RENEWAL_IDS.clinicaDomain,
      projectId: PROJECT_IDS.clinicaWeb,
      type: "domain",
      cadence: "annual",
      dueDate: d.day(120),
      amount: 18,
      status: "pending",
      createdAt: d.stamp(-245),
      updatedAt: d.stamp(-245),
    },
    {
      id: RENEWAL_IDS.beautySubscription,
      projectId: PROJECT_IDS.beautyCard,
      type: "card_subscription",
      cadence: "monthly",
      dueDate: d.day(12),
      amount: 25,
      status: "pending",
      createdAt: d.stamp(-30),
      updatedAt: d.stamp(-30),
    },
    {
      // Cancelada: nunca gera atenção, mesmo vencida.
      id: RENEWAL_IDS.cafeCentralCancelled,
      projectId: PROJECT_IDS.cafeCentralCard,
      type: "card_subscription",
      cadence: "monthly",
      dueDate: d.day(-10),
      amount: 25,
      status: "cancelled",
      createdAt: d.stamp(-120),
      updatedAt: d.stamp(-15),
    },
    {
      // Já renovada: idem.
      id: RENEWAL_IDS.barbeariaRenewed,
      projectId: PROJECT_IDS.barbeariaWeb,
      type: "domain",
      cadence: "annual",
      dueDate: d.day(-30),
      amount: 18,
      status: "renewed",
      createdAt: d.stamp(-400),
      updatedAt: d.stamp(-29),
    },
  ];
}
