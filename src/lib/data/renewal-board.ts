import { renewalSchema } from "@/lib/validation/renewal";
import { renewalTypeLabel } from "@/lib/constants/labels";
import { diffCalendarDays, todayIso } from "@/lib/utils/date";
import type {
  Business,
  Deal,
  Project,
  Renewal,
  RenewalCadence,
  RenewalListRow,
  RenewalStatus,
  RenewalTiming,
  RenewalType,
} from "@/types";

import { deriveResponsibleUserId } from "./business-overview";
import { getBusinesses } from "./businesses";
import { getDeals } from "./deals";
import { getProjects } from "./projects";
import { getRenewals } from "./renewals";

/**
 * Lógica pura do domínio Renewal — Round 6. Timing operacional,
 * agrupamento, junções (Renewal → Project → Business → responsável) e as
 * mutações puras usadas por `useRenewalStore`, seguindo exatamente o
 * precedente de `task-board.ts`/`project-overview.ts`: nada aqui lê o
 * relógio da máquina, o React ou o `localStorage` — recebe arrays e um
 * `today`/`now` explícitos, devolve dados.
 */

// --- Timing operacional -----------------------------------------------------

/** `due_soon` vai até aqui; depois é `upcoming` até 30 dias, e `future` além disso. */
const RENEWAL_DUE_SOON_DAYS = 7;
/** `upcoming` vai até aqui; além disso é `future`. */
const RENEWAL_UPCOMING_DAYS = 30;

/**
 * Classifica uma Renewal pela urgência operacional de `/renewals` — **não**
 * é o `Urgency` global de `attention-rules.ts`/`getAttentionItems()`, que
 * continua com a sua própria janela (30 dias) e os seus 4 valores; este
 * ecrã é o painel dedicado, com uma escala mais rica.
 *
 * `renewed`/`cancelled` nunca têm timing — `null` — mesmo com `dueDate` no
 * passado: só uma Renewal `pending` pode estar "atrasada". Esta é a regra
 * central do Round 6, preservada por construção (o estado guardado nunca
 * empresta cor de urgência a `renewed`/`cancelled`).
 */
export function classifyRenewalTiming(renewal: Renewal, todayIsoDate: string): RenewalTiming | null {
  if (renewal.status !== "pending") return null;

  const diff = diffCalendarDays(renewal.dueDate, todayIsoDate);
  if (diff < 0) return "overdue";
  if (diff === 0) return "due_today";
  if (diff <= RENEWAL_DUE_SOON_DAYS) return "due_soon";
  if (diff <= RENEWAL_UPCOMING_DAYS) return "upcoming";
  return "future";
}

// --- Junções -----------------------------------------------------------------

/**
 * Junta uma Renewal com o Project/Business a que pertence e o responsável
 * (já derivado do Business, nunca um campo próprio da Renewal).
 */
export function buildRenewalListRow(
  renewal: Renewal,
  project: Project,
  business: Business,
  responsibleUserId: string | null,
  todayIsoDate: string,
): RenewalListRow {
  return {
    renewal,
    project,
    business,
    responsibleUserId,
    timing: classifyRenewalTiming(renewal, todayIsoDate),
  };
}

/** O board `/renewals`: cada Renewal já com Project/Business/responsável juntos. */
export async function getRenewalsBoard(now: Date = new Date()): Promise<RenewalListRow[]> {
  const [renewals, projects, businesses, deals] = await Promise.all([
    getRenewals(now),
    getProjects(now),
    getBusinesses(now),
    getDeals(now),
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const dealsByBusinessId = new Map<string, Deal[]>();
  for (const deal of deals) {
    const list = dealsByBusinessId.get(deal.businessId) ?? [];
    list.push(deal);
    dealsByBusinessId.set(deal.businessId, list);
  }

  const today = todayIso(now);
  const rows: RenewalListRow[] = [];

  for (const renewal of renewals) {
    const project = projectById.get(renewal.projectId);
    if (project === undefined) continue; // integridade referencial garante que isto não acontece
    const business = businessById.get(project.businessId);
    if (business === undefined) continue;

    const responsibleUserId = deriveResponsibleUserId(dealsByBusinessId.get(business.id) ?? []);
    rows.push(buildRenewalListRow(renewal, project, business, responsibleUserId, today));
  }

  return rows;
}

// --- Hierarquia da lista ------------------------------------------------------

export interface RenewalBuckets {
  overdue: RenewalListRow[];
  dueToday: RenewalListRow[];
  dueSoon: RenewalListRow[];
  upcoming: RenewalListRow[];
  /** 31–60 dias — "Próximos 60 dias" (secção 11), mais fino do que o `RenewalTiming` de `classifyRenewalTiming`. */
  sixtyDays: RenewalListRow[];
  /** Além de 60 dias — "Mais tarde". */
  later: RenewalListRow[];
  renewed: RenewalListRow[];
  cancelled: RenewalListRow[];
}

/** Desempate estável dentro do mesmo dueDate: Business, depois Project, depois id. */
function byDueDateAscending(a: RenewalListRow, b: RenewalListRow): number {
  if (a.renewal.dueDate !== b.renewal.dueDate) {
    return a.renewal.dueDate < b.renewal.dueDate ? -1 : 1;
  }
  if (a.business.name !== b.business.name) {
    return a.business.name < b.business.name ? -1 : 1;
  }
  if (a.project.name !== b.project.name) {
    return a.project.name < b.project.name ? -1 : 1;
  }
  return a.renewal.id < b.renewal.id ? -1 : a.renewal.id > b.renewal.id ? 1 : 0;
}

/** `upcoming` vai até aqui (secção 11); além disso é "Mais tarde". */
const RENEWAL_SIXTY_DAYS = 60;

/**
 * Separa as Renewals pela hierarquia pedida para `/renewals` (secção 11) —
 * mesmo padrão de `groupTasksByUrgency` (Round 4): `renewed`/`cancelled` são
 * desviadas para os seus próprios baldes ANTES de qualquer lógica de data,
 * para nunca caírem num balde de urgência só porque a `dueDate` está no
 * passado.
 *
 * Esta hierarquia tem mais um nível de detalhe do que `RenewalTiming`
 * (`classifyRenewalTiming`) — 8 grupos em vez de 5+2, com "Próximos 60 dias"
 * e "Mais tarde" a dividirem o que `classifyRenewalTiming` trata só como
 * `future`. É uma classificação própria, calculada diretamente da `dueDate`,
 * não uma composição de `classifyRenewalTiming` — a mesma escolha que
 * `groupTasksByUrgency` já faz com a sua própria janela de 7 dias, em vez de
 * reaproveitar `describeDueDate`.
 */
export function groupRenewalsByTiming(
  rows: readonly RenewalListRow[],
  todayIsoDate: string,
): RenewalBuckets {
  const buckets: RenewalBuckets = {
    overdue: [],
    dueToday: [],
    dueSoon: [],
    upcoming: [],
    sixtyDays: [],
    later: [],
    renewed: [],
    cancelled: [],
  };

  for (const row of rows) {
    if (row.renewal.status === "renewed") {
      buckets.renewed.push(row);
      continue;
    }
    if (row.renewal.status === "cancelled") {
      buckets.cancelled.push(row);
      continue;
    }

    const diff = diffCalendarDays(row.renewal.dueDate, todayIsoDate);
    if (diff < 0) buckets.overdue.push(row);
    else if (diff === 0) buckets.dueToday.push(row);
    else if (diff <= RENEWAL_DUE_SOON_DAYS) buckets.dueSoon.push(row);
    else if (diff <= RENEWAL_UPCOMING_DAYS) buckets.upcoming.push(row);
    else if (diff <= RENEWAL_SIXTY_DAYS) buckets.sixtyDays.push(row);
    else buckets.later.push(row);
  }

  buckets.overdue.sort(byDueDateAscending);
  buckets.dueToday.sort(byDueDateAscending);
  buckets.dueSoon.sort(byDueDateAscending);
  buckets.upcoming.sort(byDueDateAscending);
  buckets.sixtyDays.sort(byDueDateAscending);
  buckets.later.sort(byDueDateAscending);
  // Renovadas/Canceladas: a mais recentemente atualizada primeiro (mesmo padrão de "Concluídas" em Tasks).
  buckets.renewed.sort((a, b) => (a.renewal.updatedAt > b.renewal.updatedAt ? -1 : 1));
  buckets.cancelled.sort((a, b) => (a.renewal.updatedAt > b.renewal.updatedAt ? -1 : 1));

  return buckets;
}

// --- Helpers partilhados (Clientes / Websites / PiriCards / Visão geral) ----

/**
 * A Renewal `pending` mais próxima entre as de um conjunto de Projects — o
 * helper puro partilhado por Clientes ("Próxima renovação" + filtro "Com
 * renovação próxima"), `/websites` e `/piricards` ("Próxima renovação" por
 * Project). `renewed`/`cancelled` nunca contam. `null` se não houver nenhuma.
 */
export function getNextPendingRenewalForProjects(
  renewals: readonly Renewal[],
  projectIds: readonly string[],
): Renewal | null {
  const pending = renewals.filter((r) => r.status === "pending" && projectIds.includes(r.projectId));
  if (pending.length === 0) return null;

  const sorted = [...pending].sort((a, b) =>
    a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0,
  );
  return sorted[0] ?? null;
}

/**
 * Eventos de calendário só das Renewals `pending` de um conjunto de
 * Projects, a partir de hoje (inclusive) — usado pela secção "Próximos
 * eventos" do Business Detail (Visão geral), ao lado dos eventos de
 * Deal/Task (que continuam estáticos, ver `buildUpcomingEvents`).
 */
export function buildRenewalEvents(
  renewals: readonly Renewal[],
  projectIds: readonly string[],
  todayIsoDate: string,
): { date: string; text: string }[] {
  const events: { date: string; text: string }[] = [];

  for (const renewal of renewals) {
    if (renewal.status !== "pending") continue;
    if (!projectIds.includes(renewal.projectId)) continue;
    events.push({ date: renewal.dueDate, text: `Renovação — ${renewalTypeLabel(renewal.type)}` });
  }

  return events.filter((event) => diffCalendarDays(event.date, todayIsoDate) >= 0);
}

// --- Mutações puras (usadas pela useRenewalStore) ----------------------------

export interface NewRenewalInput {
  projectId: string;
  type: RenewalType;
  cadence: RenewalCadence;
  dueDate: string;
  amount: number;
  status: RenewalStatus;
}

export type RenewalPatch = Partial<NewRenewalInput>;

function generateRenewalId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `ren-local-${random}`;
}

/** Cria e valida uma Renewal nova a partir do formulário. Passa sempre pelo schema. */
export function buildNewRenewal(input: NewRenewalInput, now: Date = new Date()): Renewal {
  const timestamp = now.toISOString();

  return renewalSchema.parse({
    id: generateRenewalId(),
    projectId: input.projectId,
    type: input.type,
    cadence: input.cadence,
    dueDate: input.dueDate,
    amount: input.amount,
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/** Aplica um patch parcial a uma Renewal existente. Passa sempre pelo schema antes de ser devolvida. */
export function applyRenewalPatch(renewal: Renewal, patch: RenewalPatch, now: Date = new Date()): Renewal {
  return renewalSchema.parse({
    ...renewal,
    ...patch,
    updatedAt: now.toISOString(),
  });
}

/** Atalho para as três ações de um clique do menu — mudar só o `status`. */
export function applyRenewalStatus(renewal: Renewal, status: RenewalStatus, now: Date = new Date()): Renewal {
  return applyRenewalPatch(renewal, { status }, now);
}
