import type { Deal } from "@/types";

import { BUSINESS_IDS } from "./businesses";
import type { SeedDates } from "./seed-dates";
import { USER_IDS } from "./users";

export const DEAL_IDS = {
  oftRacing: "deal-oft-racing-1",
  padaria: "deal-padaria-1",
  phoneStop: "deal-phone-stop-1",
  studioVetorial: "deal-studio-vetorial-1",
  optica: "deal-optica-1",
  boiNaBrasaWon: "deal-boi-na-brasa-1",
  beautyConnectionWon: "deal-beauty-connection-1",
  autoformigalWon: "deal-autoformigal-1",
  talhoLost: "deal-talho-2",
  autoEletricaWon: "deal-auto-eletrica-1",
} as const;

/**
 * O follow-up é o coração do módulo Comercial: cada oportunidade aberta diz o
 * que é a próxima ação, quando, e de quem é.
 *
 * Cobertura deliberada:
 * - follow-up para **hoje** (Phone Stop);
 * - follow-up **atrasado** (Studio Vetorial);
 * - follow-up **futuro** (Padaria, OFT Racing);
 * - **stalled**: sem próxima ação e sem contacto há 21 dias (Óptica);
 * - deals **fechados** (`won`/`lost`) que nunca podem gerar trabalho pendente,
 *   mesmo com datas antigas por preencher.
 */
export function buildDeals(d: SeedDates): Deal[] {
  return [
    {
      id: DEAL_IDS.oftRacing,
      businessId: BUSINESS_IDS.oftRacing,
      title: "Website + PiriCards para a equipa",
      stage: "new",
      value: 1450,
      responsibleUserId: USER_IDS.bino,
      nextAction: "Enviar apresentação da PiriLight",
      nextActionDate: d.day(3),
      lastInteractionDate: d.day(-4),
      expectedCloseDate: d.day(45),
      createdAt: d.stamp(-9),
      updatedAt: d.stamp(-4),
    },
    {
      id: DEAL_IDS.padaria,
      businessId: BUSINESS_IDS.padaria,
      title: "PiriCards para clientes habituais",
      stage: "contacted",
      value: 320,
      responsibleUserId: USER_IDS.sny,
      nextAction: "Levar amostras à loja",
      nextActionDate: d.day(2),
      lastInteractionDate: d.day(-5),
      expectedCloseDate: d.day(30),
      createdAt: d.stamp(-21),
      updatedAt: d.stamp(-5),
    },
    {
      // CENÁRIO: follow-up para hoje.
      id: DEAL_IDS.phoneStop,
      businessId: BUSINESS_IDS.phoneStop,
      title: "Website com marcações online",
      stage: "contacted",
      value: 890,
      responsibleUserId: USER_IDS.bino,
      nextAction: "Ligar ao responsável",
      nextActionDate: d.day(0),
      lastInteractionDate: d.day(-2),
      expectedCloseDate: d.day(21),
      createdAt: d.stamp(-28),
      updatedAt: d.stamp(-2),
    },
    {
      // CENÁRIO: follow-up atrasado (3 dias).
      id: DEAL_IDS.studioVetorial,
      businessId: BUSINESS_IDS.studioVetorial,
      title: "Redesign do site institucional",
      stage: "proposal_sent",
      value: 2100,
      responsibleUserId: USER_IDS.sny,
      nextAction: "Confirmar receção da proposta",
      nextActionDate: d.day(-3),
      lastInteractionDate: d.day(-10),
      expectedCloseDate: d.day(14),
      createdAt: d.stamp(-40),
      updatedAt: d.stamp(-10),
    },
    {
      // CENÁRIO: stalled — sem próxima ação e sem contacto há 21 dias.
      id: DEAL_IDS.optica,
      businessId: BUSINESS_IDS.optica,
      title: "Website + campanha de lançamento",
      stage: "negotiating",
      value: 1650,
      responsibleUserId: USER_IDS.bino,
      nextAction: null,
      nextActionDate: null,
      lastInteractionDate: d.day(-21),
      expectedCloseDate: null,
      createdAt: d.stamp(-60),
      updatedAt: d.stamp(-21),
    },
    {
      // Fechado: datas antigas, nunca pode gerar item de atenção.
      id: DEAL_IDS.talhoLost,
      businessId: BUSINESS_IDS.talho,
      title: "Loja online (não avançou)",
      stage: "lost",
      value: 2400,
      responsibleUserId: USER_IDS.sny,
      nextAction: "Retomar dentro de uns meses",
      nextActionDate: d.day(-60),
      lastInteractionDate: d.day(-75),
      expectedCloseDate: d.day(-40),
      createdAt: d.stamp(-140),
      updatedAt: d.stamp(-60),
    },
    {
      id: DEAL_IDS.boiNaBrasaWon,
      businessId: BUSINESS_IDS.boiNaBrasa,
      title: "Website institucional + ementa digital",
      stage: "won",
      value: 1200,
      responsibleUserId: USER_IDS.sny,
      nextAction: null,
      nextActionDate: null,
      lastInteractionDate: d.day(-12),
      expectedCloseDate: d.day(-90),
      createdAt: d.stamp(-400),
      updatedAt: d.stamp(-90),
    },
    {
      id: DEAL_IDS.beautyConnectionWon,
      businessId: BUSINESS_IDS.beautyConnection,
      title: "PiriCards de fidelização",
      stage: "won",
      value: 640,
      responsibleUserId: USER_IDS.bino,
      nextAction: null,
      nextActionDate: null,
      lastInteractionDate: d.day(-8),
      expectedCloseDate: d.day(-60),
      createdAt: d.stamp(-210),
      updatedAt: d.stamp(-60),
    },
    {
      id: DEAL_IDS.autoformigalWon,
      businessId: BUSINESS_IDS.autoformigal,
      title: "Website da oficina",
      stage: "won",
      value: 1500,
      responsibleUserId: USER_IDS.sny,
      nextAction: null,
      nextActionDate: null,
      lastInteractionDate: d.day(-3),
      expectedCloseDate: d.day(-50),
      createdAt: d.stamp(-150),
      updatedAt: d.stamp(-50),
    },
    {
      id: DEAL_IDS.autoEletricaWon,
      businessId: BUSINESS_IDS.autoEletrica,
      title: "PiriCards para clientes de oficina",
      stage: "won",
      value: 480,
      responsibleUserId: USER_IDS.bino,
      nextAction: null,
      nextActionDate: null,
      lastInteractionDate: d.day(-7),
      expectedCloseDate: d.day(-30),
      createdAt: d.stamp(-95),
      updatedAt: d.stamp(-30),
    },
  ];
}
