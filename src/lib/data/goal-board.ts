import { goalSchema } from "@/lib/validation/goal";
import type { Goal, GoalNextAction, GoalStatus, GoalTimeframe, Task, User } from "@/types";

import { deriveNextAction } from "./business-overview";

/**
 * Lógica pura do domínio Goal — Round 8. Mesmo precedente de
 * `task-board.ts`/`renewal-board.ts`: nada aqui lê o relógio, o React ou o
 * `localStorage` — recebe arrays e (quando preciso) um `now`/`today`
 * explícitos, devolve dados. Toda mutação passa pelo `goalSchema` antes de
 * ser devolvida — nunca só validado na UI.
 */

// --- Estado derivado (nunca guardado) --------------------------------------

/**
 * `progress` continua a ser o único valor guardado (secção 8 do pedido) —
 * `GoalStatus` é só uma leitura desse número, nunca um campo próprio do
 * schema. Concluir uma Task ligada não muda isto: só editar `progress`
 * (formulário ou "Atualizar progresso") o faz.
 */
export function deriveGoalStatus(progress: number): GoalStatus {
  return progress >= 100 ? "done" : "in_progress";
}

// --- Tasks ligadas -----------------------------------------------------------

/**
 * Resolve `linkedTaskIds` contra a lista **viva** de Tasks (`useTaskStore`) —
 * nunca um snapshot congelado. Ids que já não existem são ignorados em vez de
 * rebentar: um Goal nunca deve deixar de renderizar por causa de uma
 * referência solta.
 */
export function getGoalLinkedTasks(goal: Pick<Goal, "linkedTaskIds">, tasks: readonly Task[]): Task[] {
  if (goal.linkedTaskIds.length === 0) return [];
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const resolved: Task[] = [];
  for (const id of goal.linkedTaskIds) {
    const task = byId.get(id);
    if (task !== undefined) resolved.push(task);
  }
  return resolved;
}

/**
 * O responsável de um Goal para apresentação — `ownerId === null` é sempre
 * "Empresa" (nunca "Sem responsável", pedido explícito), e um id que já não
 * resolve num User real (não deveria acontecer, mas os ids vêm de dados
 * externos) cai no mesmo neutro em vez de rebentar.
 */
export function goalOwnerLabel(ownerId: string | null, userById: ReadonlyMap<string, User>): string {
  if (ownerId === null) return "Empresa";
  return userById.get(ownerId)?.name ?? "Empresa";
}

/**
 * O próximo passo interno de um Goal — resolvido só a partir das Tasks
 * ligadas. Reaproveita `deriveNextAction` tal e qual (já filtra `done` e
 * `waiting_on_client`, já classifica overdue/hoje/próximos 7 dias/futura/sem
 * data pela mesma regra usada em todo o resto da app) em vez de duplicar essa
 * classificação — só acrescenta a distinção que `deriveNextAction` não faz
 * porque não precisa de fazer noutros sítios: quando NENHUMA Task aberta
 * qualifica, "sem candidato" pode significar duas coisas diferentes aqui —
 * não há trabalho nosso pendente (`kind: "none"`) ou há, mas está tudo à
 * espera do cliente (`kind: "waiting_on_client"`, nunca lido como atraso
 * nosso — a mesma regra central desde o Round 2).
 */
export function deriveGoalNextAction(linkedTasks: readonly Task[], today: string): GoalNextAction {
  const result = deriveNextAction({ tasks: linkedTasks, maintenanceRequests: [] }, today);

  if (result.source !== "none") {
    return {
      kind: "task",
      title: result.title,
      urgency: result.urgency,
      daysDelta: result.daysDelta,
      waitingReason: null,
    };
  }

  // `deriveNextAction` já excluiu as `waiting_on_client` dos candidatos — se
  // houver alguma, é a única explicação possível para "nenhum candidato" com
  // Tasks ligadas. A que está à espera há mais tempo primeiro (mesmo critério
  // de `buildWaitingOnClientItems`).
  const waiting = [...linkedTasks]
    .filter((task) => task.status === "waiting_on_client")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1))[0];

  if (waiting !== undefined) {
    return {
      kind: "waiting_on_client",
      title: "À espera do cliente",
      urgency: null,
      daysDelta: null,
      waitingReason: waiting.waitingReason,
    };
  }

  return { kind: "none", title: "Sem ação interna pendente", urgency: null, daysDelta: null, waitingReason: null };
}

// --- Mutações puras (usadas pela useGoalStore) -------------------------------

export interface NewGoalInput {
  title: string;
  timeframe: GoalTimeframe;
  /** `null` = objetivo da empresa. */
  ownerId: string | null;
  progress: number;
  linkedTaskIds: string[];
}

export type GoalPatch = Partial<NewGoalInput>;

function generateGoalId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `goal-local-${random}`;
}

/** Cria e valida um Goal novo a partir do formulário. Passa sempre pelo schema. */
export function buildNewGoal(input: NewGoalInput, now: Date = new Date()): Goal {
  const timestamp = now.toISOString();

  return goalSchema.parse({
    id: generateGoalId(),
    title: input.title,
    timeframe: input.timeframe,
    progress: input.progress,
    ownerId: input.ownerId,
    linkedTaskIds: input.linkedTaskIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/** Aplica um patch parcial a um Goal existente. Passa sempre pelo schema antes de ser devolvido. */
export function applyGoalPatch(goal: Goal, patch: GoalPatch, now: Date = new Date()): Goal {
  return goalSchema.parse({
    ...goal,
    ...patch,
    updatedAt: now.toISOString(),
  });
}

/**
 * Atalho para a ação rápida "Atualizar progresso" — só muda `progress`.
 * Concluir uma Task ligada nunca chama isto: o progresso continua sempre
 * manual (pedido explícito).
 */
export function applyGoalProgress(goal: Goal, progress: number, now: Date = new Date()): Goal {
  return applyGoalPatch(goal, { progress }, now);
}
