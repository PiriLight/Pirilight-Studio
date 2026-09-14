import { z } from "zod";

import { auditFields, entityId, isoDate } from "./common";
import {
  WAITING_REASON_INVARIANT_MESSAGE,
  hasValidWaitingReason,
  waitingReasonSchema,
  workStatusSchema,
} from "./work-status";

export const PRIORITIES = ["low", "normal", "high"] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = (typeof PRIORITIES)[number];

/**
 * Entidades a que uma Task se pode ligar. Um par polimórfico
 * (`relatedEntityType` + `relatedEntityId`) em vez de meia dúzia de FKs
 * opcionais: qualquer módulo futuro passa a poder gerar tarefas sem alterar o
 * schema.
 *
 * O Postgres não consegue impor uma FK polimórfica — é um custo aceite
 * conscientemente para uma ferramenta de duas pessoas, e o
 * `mock-integrity.test.ts` é a rede de segurança.
 */
export const TASK_RELATED_ENTITY_TYPES = [
  "business",
  "project",
  "deal",
  "maintenance_request",
  "goal",
] as const;

export const taskRelatedEntityTypeSchema = z.enum(TASK_RELATED_ENTITY_TYPES);
export type TaskRelatedEntityType = (typeof TASK_RELATED_ENTITY_TYPES)[number];

export const taskSchema = z
  .strictObject({
    id: entityId,
    title: z.string().min(1),
    status: workStatusSchema,
    waitingReason: waitingReasonSchema.nullable(),
    priority: prioritySchema,
    /** `null` = backlog sem data: aparece em /tasks, nunca no feed de atenção. */
    dueDate: isoDate.nullable(),
    assigneeId: entityId,
    relatedEntityType: taskRelatedEntityTypeSchema.nullable(),
    relatedEntityId: entityId.nullable(),
    ...auditFields,
  })
  .refine(hasValidWaitingReason, { message: WAITING_REASON_INVARIANT_MESSAGE })
  .refine(
    (t) =>
      (t.relatedEntityType === null) === (t.relatedEntityId === null),
    { message: "relatedEntityType e relatedEntityId têm de existir em conjunto" },
  );

export type Task = z.infer<typeof taskSchema>;
