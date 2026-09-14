import { maintenanceRequestSchema } from "@/lib/validation/maintenance-request";
import { diffCalendarDays } from "@/lib/utils/date";
import type {
  Business,
  MaintenanceListRow,
  MaintenanceRequest,
  MaintenanceTiming,
  Priority,
  Project,
  WaitingReason,
  WorkStatus,
} from "@/types";

import { getBusinesses } from "./businesses";
import { getMaintenanceRequests } from "./misc";
import { getProjects } from "./projects";

/**
 * Lógica pura do domínio MaintenanceRequest — Round 9. Mesmo precedente de
 * `task-board.ts`/`renewal-board.ts`: nada aqui lê o relógio, o React ou o
 * `localStorage` — recebe arrays e um `today`/`now` explícitos, devolve
 * dados. `attention-rules.ts`/`getAttentionItems()` não são tocados — este
 * ficheiro é só a hierarquia/filtros do painel dedicado `/maintenance`.
 */

// --- Junção (Business/Project) ----------------------------------------------

/** Junta um pedido com o Project/Business a que pertence. `null` se algum não resolver (nunca deveria, ver mock-integrity). */
export function buildMaintenanceListRow(
  request: MaintenanceRequest,
  projectById: ReadonlyMap<string, Project>,
  businessById: ReadonlyMap<string, Business>,
): MaintenanceListRow | null {
  const project = projectById.get(request.projectId);
  if (project === undefined) return null;
  const business = businessById.get(request.businessId);
  if (business === undefined) return null;
  return { request, project, business };
}

/** O board `/maintenance`: cada pedido já com Project/Business juntos. */
export async function getMaintenanceBoard(now: Date = new Date()): Promise<MaintenanceListRow[]> {
  const [requests, projects, businesses] = await Promise.all([
    getMaintenanceRequests(now),
    getProjects(now),
    getBusinesses(now),
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const businessById = new Map(businesses.map((b) => [b.id, b]));

  const rows: MaintenanceListRow[] = [];
  for (const request of requests) {
    const row = buildMaintenanceListRow(request, projectById, businessById);
    if (row !== null) rows.push(row); // integridade referencial garante que isto não acontece
  }
  return rows;
}

// --- Classificação temporal --------------------------------------------------

/** `due_soon` vai até aqui; além disso é `future`. Mesma janela de `ATTENTION_WINDOW_DAYS.maintenance`, independente de propósito. */
const MAINTENANCE_DUE_SOON_DAYS = 7;

/**
 * Classifica um pedido pela hierarquia de `/maintenance` (secção 8 do
 * pedido) — uma ordem de precedência, não um conjunto de condições
 * independentes, por isso cada pedido cai em exatamente uma classificação:
 *
 * 1. `waiting_on_client` → nunca é lido como atraso nosso, mesmo com `dueDate`
 *    no passado (regra central desde o Round 2).
 * 2. `done` → nunca reaparece como pendente, por muito antigo que seja.
 * 3. `overdue` / 4. `today` → só chegam aqui pedidos com `dueDate`; um pedido
 *    `blocked` que também esteja atrasado ou para hoje cai aqui (com o badge
 *    vermelho "Bloqueado" na mesma) — a data manda quando já é urgente.
 * 5. `blocked` → só os que não caíram já em overdue/today (secção 5 do
 *    pedido: "deve aparecer com destaque", sem precisar de fingir uma data).
 * 6. `due_soon` / 7. `future` → só pedidos com `dueDate`, não bloqueados.
 * 8. `no_date` → em aberto, não bloqueado, sem `dueDate` — nunca "Atrasado"
 *    só por não ter prazo (secção 9 do pedido).
 */
export function classifyMaintenanceTiming(
  request: Pick<MaintenanceRequest, "status" | "dueDate">,
  todayIsoDate: string,
): MaintenanceTiming {
  if (request.status === "waiting_on_client") return "waiting_on_client";
  if (request.status === "done") return "done";

  if (request.dueDate !== null) {
    const diff = diffCalendarDays(request.dueDate, todayIsoDate);
    if (diff < 0) return "overdue";
    if (diff === 0) return "today";
  }

  if (request.status === "blocked") return "blocked";
  if (request.dueDate === null) return "no_date";

  const diff = diffCalendarDays(request.dueDate, todayIsoDate);
  return diff <= MAINTENANCE_DUE_SOON_DAYS ? "due_soon" : "future";
}

export interface MaintenanceBuckets {
  overdue: MaintenanceListRow[];
  dueToday: MaintenanceListRow[];
  blocked: MaintenanceListRow[];
  dueSoon: MaintenanceListRow[];
  future: MaintenanceListRow[];
  noDate: MaintenanceListRow[];
  waitingOnClient: MaintenanceListRow[];
  done: MaintenanceListRow[];
}

function byDueDateAscending(a: MaintenanceListRow, b: MaintenanceListRow): number {
  const dateA = a.request.dueDate;
  const dateB = b.request.dueDate;
  if (dateA === dateB) return 0;
  if (dateA === null) return 1;
  if (dateB === null) return -1;
  return dateA < dateB ? -1 : 1;
}

/**
 * Separa os pedidos pela hierarquia de `/maintenance`, usando
 * `classifyMaintenanceTiming` — nunca duas secções para o mesmo pedido.
 */
export function groupMaintenanceByTiming(
  rows: readonly MaintenanceListRow[],
  todayIsoDate: string,
): MaintenanceBuckets {
  const buckets: MaintenanceBuckets = {
    overdue: [],
    dueToday: [],
    blocked: [],
    dueSoon: [],
    future: [],
    noDate: [],
    waitingOnClient: [],
    done: [],
  };

  for (const row of rows) {
    switch (classifyMaintenanceTiming(row.request, todayIsoDate)) {
      case "overdue":
        buckets.overdue.push(row);
        break;
      case "today":
        buckets.dueToday.push(row);
        break;
      case "blocked":
        buckets.blocked.push(row);
        break;
      case "due_soon":
        buckets.dueSoon.push(row);
        break;
      case "future":
        buckets.future.push(row);
        break;
      case "no_date":
        buckets.noDate.push(row);
        break;
      case "waiting_on_client":
        buckets.waitingOnClient.push(row);
        break;
      case "done":
        buckets.done.push(row);
        break;
    }
  }

  buckets.overdue.sort(byDueDateAscending);
  buckets.dueToday.sort(byDueDateAscending);
  buckets.blocked.sort(byDueDateAscending);
  buckets.dueSoon.sort(byDueDateAscending);
  buckets.future.sort(byDueDateAscending);
  // Sem prazo: o pedido pendente há mais tempo primeiro.
  buckets.noDate.sort((a, b) => (a.request.requestedAt < b.request.requestedAt ? -1 : 1));
  // À espera do cliente: o que está à espera há mais tempo primeiro (mesmo critério de buildWaitingOnClientItems).
  buckets.waitingOnClient.sort((a, b) => (a.request.updatedAt < b.request.updatedAt ? -1 : 1));
  // Concluídos: o mais recentemente concluído primeiro.
  buckets.done.sort((a, b) => (a.request.updatedAt > b.request.updatedAt ? -1 : 1));

  return buckets;
}

/**
 * Total de pedidos `blocked`, independentemente da secção visual em que
 * caem (um `blocked` também `overdue` aparece em "Em atraso", mas continua
 * a contar aqui — secção 8 do pedido).
 */
export function countBlockedMaintenanceRequests(rows: readonly MaintenanceListRow[]): number {
  return rows.filter((row) => row.request.status === "blocked").length;
}

// --- Mutações puras (usadas pela useMaintenanceStore) ------------------------

export interface NewMaintenanceRequestInput {
  projectId: string;
  title: string;
  description: string;
  status: WorkStatus;
  waitingReason: WaitingReason | null;
  priority: Priority;
  responsibleUserId: string | null;
  requestedAt: string;
  dueDate: string | null;
}

export type MaintenanceRequestPatch = Partial<NewMaintenanceRequestInput> & { businessId?: string };

function generateMaintenanceId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `mnt-local-${random}`;
}

/**
 * Cria e valida um pedido novo a partir do formulário. O `businessId` nunca
 * vem do utilizador — é sempre derivado do Project escolhido (secção 14 do
 * pedido: "Não quero que o utilizador escolha Business A e Project B e crie
 * dados inconsistentes"), por isso esta função recebe `businessId` já
 * resolvido pelo chamador (`buildNewMaintenanceRequest`), nunca como input
 * livre. Passa sempre pelo schema.
 */
export function buildNewMaintenanceRequest(
  input: NewMaintenanceRequestInput & { businessId: string },
  now: Date = new Date(),
): MaintenanceRequest {
  const timestamp = now.toISOString();
  const waitingReason = input.status === "waiting_on_client" ? input.waitingReason : null;

  return maintenanceRequestSchema.parse({
    id: generateMaintenanceId(),
    projectId: input.projectId,
    businessId: input.businessId,
    title: input.title,
    description: input.description,
    status: input.status,
    waitingReason,
    priority: input.priority,
    responsibleUserId: input.responsibleUserId,
    requestedAt: input.requestedAt,
    dueDate: input.dueDate,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Aplica um patch parcial a um pedido existente. `waitingReason` é sempre
 * recalculado a partir do estado final (nunca fica pendurado de um estado
 * anterior). Se `businessId` não vier no patch mas `projectId` vier, o
 * chamador (`useMaintenanceStore`) é responsável por recalculá-lo a partir
 * do novo Project antes de chamar esta função — ver secção 16 do pedido.
 */
export function applyMaintenanceRequestPatch(
  request: MaintenanceRequest,
  patch: MaintenanceRequestPatch,
  now: Date = new Date(),
): MaintenanceRequest {
  const nextStatus = patch.status ?? request.status;
  const waitingReason =
    nextStatus === "waiting_on_client"
      ? (patch.waitingReason !== undefined ? patch.waitingReason : request.waitingReason)
      : null;

  return maintenanceRequestSchema.parse({
    ...request,
    ...patch,
    status: nextStatus,
    waitingReason,
    updatedAt: now.toISOString(),
  });
}

/** Atalho para as ações rápidas do menu — mudar só o `status` (+ motivo, quando aplicável). */
export function applyMaintenanceRequestStatus(
  request: MaintenanceRequest,
  status: WorkStatus,
  waitingReason: WaitingReason | null,
  now: Date = new Date(),
): MaintenanceRequest {
  return applyMaintenanceRequestPatch(request, { status, waitingReason }, now);
}
