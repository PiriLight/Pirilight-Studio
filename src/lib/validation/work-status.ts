import { z } from "zod";

/**
 * Vocabulário de estado **partilhado** por Task, Project e MaintenanceRequest.
 *
 * Existir um só vocabulário é o que garante que "À espera do cliente" tem a
 * mesma cor, o mesmo ícone e o mesmo significado em toda a aplicação — e que
 * trabalho bloqueado por terceiros nunca é confundido com trabalho nosso por
 * fazer.
 */
export const WORK_STATUSES = [
  "todo",
  "in_progress",
  "waiting_on_client",
  "blocked",
  "done",
] as const;

export const workStatusSchema = z.enum(WORK_STATUSES);
export type WorkStatus = (typeof WORK_STATUSES)[number];

/** Motivo pelo qual estamos à espera do cliente. Só existe com `waiting_on_client`. */
export const WAITING_REASONS = [
  "content",
  "photos",
  "approval",
  "payment",
  "access_login",
  "response",
  "other",
] as const;

export const waitingReasonSchema = z.enum(WAITING_REASONS);
export type WaitingReason = (typeof WAITING_REASONS)[number];

/** Estados em que o trabalho ainda está em aberto (nem concluído, nem à espera do cliente). */
export const OPEN_WORK_STATUSES: readonly WorkStatus[] = ["todo", "in_progress", "blocked"];

export function isOpenWorkStatus(status: WorkStatus): boolean {
  return OPEN_WORK_STATUSES.includes(status);
}

/**
 * Invariante partilhada: `waitingReason` existe **se e só se** o estado for
 * `waiting_on_client`. Aplicada a Task, Project e MaintenanceRequest.
 *
 * Codificar isto no schema (em vez de confiar na disciplina de quem escreve
 * dados) é o que impede o caso silencioso: um registo à espera do cliente sem
 * ninguém saber do quê.
 */
export function hasValidWaitingReason(value: {
  status: WorkStatus;
  waitingReason: WaitingReason | null;
}): boolean {
  return value.status === "waiting_on_client"
    ? value.waitingReason !== null
    : value.waitingReason === null;
}

export const WAITING_REASON_INVARIANT_MESSAGE =
  "waitingReason só pode (e tem de) existir quando status é 'waiting_on_client'";
