import { z } from "zod";

import { auditFields, entityId, isoDate, money } from "./common";

/**
 * Oportunidade comercial — filha de `Business`. Guarda apenas o que é
 * específico da oportunidade; nunca duplica nome, contacto ou dados do
 * Business (isso vive no Business, a fonte única).
 */
export const DEAL_STAGES = [
  "new",
  "contacted",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
] as const;

export const dealStageSchema = z.enum(DEAL_STAGES);
export type DealStage = (typeof DEAL_STAGES)[number];

/** Stages terminais: a oportunidade está fechada e nunca gera trabalho pendente. */
export const CLOSED_DEAL_STAGES: readonly DealStage[] = ["won", "lost"];

export function isOpenDealStage(stage: DealStage): boolean {
  return !CLOSED_DEAL_STAGES.includes(stage);
}

/**
 * O follow-up é conceito de primeira classe: `nextAction` + `nextActionDate` +
 * `responsibleUserId` respondem diretamente a "o que é a seguir, quando, e de
 * quem é". São `nullable` de propósito — um deal **sem** próxima ação definida
 * é precisamente o caso que a regra `stalled` existe para apanhar.
 */
export const dealSchema = z.strictObject({
  id: entityId,
  businessId: entityId,
  title: z.string().min(1),
  stage: dealStageSchema,
  value: money,
  responsibleUserId: entityId,
  nextAction: z.string().min(1).nullable(),
  nextActionDate: isoDate.nullable(),
  lastInteractionDate: isoDate,
  expectedCloseDate: isoDate.nullable(),
  ...auditFields,
});

export type Deal = z.infer<typeof dealSchema>;
