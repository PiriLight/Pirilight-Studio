import { z } from "zod";

import { auditFields, entityId } from "./common";

export const GOAL_TIMEFRAMES = ["quarter", "year"] as const;
export const goalTimeframeSchema = z.enum(GOAL_TIMEFRAMES);
export type GoalTimeframe = (typeof GOAL_TIMEFRAMES)[number];

/**
 * Phase 1B. `progress` é guardado (não calculado a partir das tasks ligadas)
 * — simplificação assumida enquanto não houver dados reais que justifiquem
 * o rollup automático.
 */
export const goalSchema = z.strictObject({
  id: entityId,
  title: z.string().min(1),
  timeframe: goalTimeframeSchema,
  progress: z.number().int().min(0).max(100),
  /** `null` = objetivo da empresa, não de uma pessoa. */
  ownerId: entityId.nullable(),
  linkedTaskIds: z.array(entityId),
  ...auditFields,
});

export type Goal = z.infer<typeof goalSchema>;
