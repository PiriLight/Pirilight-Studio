import { isOpenDealStage } from "@/lib/validation/deal";
import { diffCalendarDays, todayIso } from "@/lib/utils/date";
import { summarizePayments } from "@/lib/utils/payment";
import type {
  Business,
  BusinessOverallStatus,
  BusinessOverview,
  BusinessSummary,
  CommercialDealCard,
  Deal,
  LifecycleStatus,
  MaintenanceRequest,
  NextAction,
  Project,
  ProjectWithDetail,
  RankedUrgency,
  Task,
  Urgency,
} from "@/types";

import { ATTENTION_WINDOW_DAYS, STALLED_AFTER_DAYS, classifyUrgency } from "./attention-rules";
import { getBusinesses, getBusinessById, getContactsByBusinessId } from "./businesses";
import { getDeals, getDealsByBusinessId } from "./deals";
import { getMaintenanceRequestsByBusinessId } from "./misc";
import { getPaymentsByBusinessId, getPaymentsByProjectId } from "./payments";
import {
  getPiriCardByProjectId,
  getProjectsByBusinessId,
  getWebsiteByProjectId,
} from "./projects";
import { getRenewalsByBusinessId } from "./renewals";
import { getTasksByBusinessId } from "./tasks";

/**
 * Leituras compostas — o que num backend real seria um `join`. Vivem aqui, e
 * não nas páginas, porque a derivação (estado geral, responsável, próxima
 * renovação) é a mesma seja qual for o ecrã que a usa, e é o tipo de lógica
 * que vale a pena testar isoladamente.
 */

/**
 * O estado mais importante a saber sobre um negócio agora — nunca guardado.
 * Considera Projects, Tasks e MaintenanceRequests ligados ao negócio, não só
 * Projects: um negócio com uma Task `waiting_on_client` ativa mas sem
 * projetos em aberto tem mesmo alguma coisa a acontecer, e "Sem trabalho
 * ativo" seria falso. Um bloqueio pesa mais do que "à espera", que pesa mais
 * do que "em progresso" — a mesma prioridade que rege o feed de atenção,
 * aplicada ao nível do negócio, agora across as três origens.
 */
export function deriveBusinessOverallStatus(input: {
  projects: readonly Project[];
  tasks: readonly Task[];
  maintenanceRequests: readonly MaintenanceRequest[];
}): BusinessOverallStatus {
  const { projects, tasks, maintenanceRequests } = input;
  const statuses = [
    ...projects.map((p) => p.status),
    ...tasks.map((t) => t.status),
    ...maintenanceRequests.map((m) => m.status),
  ];

  if (statuses.length === 0) return "none";
  if (statuses.some((s) => s === "blocked")) return "blocked";
  if (statuses.some((s) => s === "waiting_on_client")) return "waiting_on_client";
  if (statuses.some((s) => s === "in_progress" || s === "todo")) return "in_progress";
  return "done";
}

/**
 * Quantos Projects deste negócio ainda não estão concluídos. Extraída como
 * função pura (Round 5.1) para nunca haver duas versões desta regra: usada
 * tanto pelo `getBusinessSummary` (servidor) como pela contagem ao vivo de
 * Clientes (`useLiveBusinessScope`, cliente) sobre o estado atual da
 * `useProjectStore`.
 */
export function countActiveProjects(projects: readonly Project[]): number {
  return projects.filter((p) => p.status !== "done").length;
}

/**
 * Quantas Tasks deste negócio ainda são trabalho nosso em aberto (nem
 * concluídas, nem à espera do cliente). Mesma razão de existir que
 * `countActiveProjects` — reaproveitada no servidor e ao vivo no cliente.
 */
export function countOpenTasks(tasks: readonly Task[]): number {
  return tasks.filter((t) => t.status !== "done" && t.status !== "waiting_on_client").length;
}

/** O responsável mais recente: quem tratou por último de alguma oportunidade deste negócio. */
export function deriveResponsibleUserId(deals: readonly Deal[]): string | null {
  if (deals.length === 0) return null;
  const [mostRecent] = [...deals].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return mostRecent?.responsibleUserId ?? null;
}

/** O deal aberto mais relevante — o que ainda tem trabalho comercial por fazer. */
export function pickOpenDeal(deals: readonly Deal[]): Deal | null {
  const open = deals.filter((d) => isOpenDealStage(d.stage));
  if (open.length === 0) return null;
  const [mostRecent] = [...open].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return mostRecent ?? null;
}

/**
 * Urgência do follow-up de um deal — a mesma regra do feed de atenção
 * (`attention-rules.dealAttention`), mas devolvendo sempre o `daysDelta`
 * quando há uma data, mesmo fora da janela de 7 dias: o board Comercial
 * mostra "em 20 dias" a cinzento, não esconde a data.
 */
export function computeDealFollowUp(
  deal: Deal,
  todayIsoDate: string,
): { urgency: Urgency | null; daysDelta: number | null } {
  if (!isOpenDealStage(deal.stage)) return { urgency: null, daysDelta: null };

  if (deal.nextActionDate !== null) {
    return {
      urgency: classifyUrgency(deal.nextActionDate, todayIsoDate, ATTENTION_WINDOW_DAYS.deal),
      daysDelta: diffCalendarDays(deal.nextActionDate, todayIsoDate),
    };
  }

  const daysSinceContact = -diffCalendarDays(deal.lastInteractionDate, todayIsoDate);
  if (daysSinceContact >= STALLED_AFTER_DAYS) {
    return { urgency: "stalled", daysDelta: diffCalendarDays(deal.lastInteractionDate, todayIsoDate) };
  }

  return { urgency: null, daysDelta: null };
}

const NEXT_ACTION_RANK: Record<RankedUrgency, number> = {
  overdue: 0,
  due_today: 1,
  due_soon: 2,
  stalled: 3,
  future: 4,
  no_date: 5,
};

/** `due_soon` fica limitado a esta janela; para além disso é só `future`. */
const NEXT_ACTION_DUE_SOON_DAYS = 7;

/**
 * Classificação usada só por `deriveNextAction` — sem corte de janela como
 * `classifyUrgency`, mas com um quinto valor (`future`) para uma data
 * distante nunca se confundir com "urgente". Devolve sempre uma
 * classificação, nunca `null`.
 */
function classifyForRanking(
  dateIso: string,
  todayIsoDate: string,
): { urgency: RankedUrgency; daysDelta: number } {
  const daysDelta = diffCalendarDays(dateIso, todayIsoDate);
  const urgency: RankedUrgency =
    daysDelta < 0
      ? "overdue"
      : daysDelta === 0
        ? "due_today"
        : daysDelta <= NEXT_ACTION_DUE_SOON_DAYS
          ? "due_soon"
          : "future";
  return { urgency, daysDelta };
}

interface NextActionCandidate {
  source: NextAction["source"];
  title: string;
  date: string | null;
  urgency: RankedUrgency;
  /** `null` só para `no_date` — sem dueDate não há um "dias de diferença" para mostrar. */
  daysDelta: number | null;
  /** Chave de desempate dentro do mesmo nível de urgência — a mais antiga vence. */
  sortDate: string;
}

/**
 * A próxima ação REAL de um negócio — não só `Deal.nextAction`.
 *
 * Junta candidatos de três origens (Tasks nossas abertas, MaintenanceRequests
 * nossos abertos, o follow-up do Deal aberto) e ordena só pela urgência real:
 * `overdue` > `due_today` > `due_soon` (≤7 dias) > `stalled` > `future`
 * (>7 dias). Dentro do mesmo nível, a data mais antiga vence — o que tanto
 * escolhe "o mais atrasado" em `overdue` como "o mais próximo" em `future` ou
 * `due_soon`, e "o parado há mais tempo" em `stalled`, com a mesma regra.
 *
 * Não reaproveita `computeDealFollowUp` de propósito: aquela função tem corte
 * de janela (é para o board/tabs, onde uma data distante fica só cinzenta,
 * sem urgência); aqui uma data distante ainda tem de poder perder para um
 * Deal `stalled`, o que só a classificação em 5 valores permite.
 *
 * `openDeal`/`lifecycleStatus` são opcionais: um Project (Round 5) não tem
 * Deal nem `lifecycleStatus` próprios, só Tasks/MaintenanceRequests ligados a
 * ele — omitir os dois campos simplesmente não gera candidato de Deal, sem
 * mudar o comportamento de quem já os passa (Business Detail).
 *
 * Regras já aprovadas, preservadas por construção: um Project
 * `waiting_on_client` sozinho nunca entra (não há input de Project aqui); uma
 * Task `waiting_on_client` não é trabalho nosso (excluída); um Deal
 * `won`/`lost` nunca chega (`openDeal` já vem filtrado); um Business
 * `inactive` não gera candidato de Deal.
 */
export function deriveNextAction(
  input: {
    tasks: readonly Task[];
    maintenanceRequests: readonly MaintenanceRequest[];
    openDeal?: Deal | null;
    lifecycleStatus?: LifecycleStatus;
  },
  today: string,
): NextAction {
  const candidates: NextActionCandidate[] = [];

  for (const task of input.tasks) {
    if (task.status === "done" || task.status === "waiting_on_client") continue;

    if (task.dueDate === null) {
      // Round 5.2: uma Task nossa em aberto sem dueDate ainda é trabalho por
      // fazer — nunca "nenhuma ação". Fica no último nível (`no_date`), mas
      // continua a existir como candidata; desempate pela mais antiga criada.
      candidates.push({
        source: "task",
        title: task.title,
        date: null,
        urgency: "no_date",
        daysDelta: null,
        sortDate: task.createdAt,
      });
      continue;
    }

    const { urgency, daysDelta } = classifyForRanking(task.dueDate, today);
    candidates.push({
      source: "task",
      title: task.title,
      date: task.dueDate,
      urgency,
      daysDelta,
      sortDate: task.dueDate,
    });
  }

  for (const request of input.maintenanceRequests) {
    if (request.status === "done" || request.status === "waiting_on_client") continue;

    if (request.dueDate !== null) {
      const { urgency, daysDelta } = classifyForRanking(request.dueDate, today);
      candidates.push({
        source: "maintenance",
        title: request.title,
        date: request.dueDate,
        urgency,
        daysDelta,
        sortDate: request.dueDate,
      });
      continue;
    }

    const daysOpen = -diffCalendarDays(request.requestedAt, today);
    if (daysOpen >= STALLED_AFTER_DAYS) {
      candidates.push({
        source: "maintenance",
        title: `${request.title} — aberto há ${daysOpen} dias`,
        date: null,
        urgency: "stalled",
        daysDelta: diffCalendarDays(request.requestedAt, today),
        sortDate: request.requestedAt,
      });
    }
  }

  const openDeal = input.openDeal ?? null;
  if (openDeal !== null && input.lifecycleStatus !== "inactive") {
    const deal = openDeal;

    if (deal.nextActionDate !== null) {
      const { urgency, daysDelta } = classifyForRanking(deal.nextActionDate, today);
      candidates.push({
        source: "deal",
        title: deal.nextAction ?? deal.title,
        date: deal.nextActionDate,
        urgency,
        daysDelta,
        sortDate: deal.nextActionDate,
      });
    } else {
      const daysSinceContact = -diffCalendarDays(deal.lastInteractionDate, today);
      if (daysSinceContact >= STALLED_AFTER_DAYS) {
        candidates.push({
          source: "deal",
          title: `${deal.title} — sem contacto há ${daysSinceContact} dias`,
          date: null,
          urgency: "stalled",
          daysDelta: diffCalendarDays(deal.lastInteractionDate, today),
          sortDate: deal.lastInteractionDate,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    const byRank = NEXT_ACTION_RANK[a.urgency] - NEXT_ACTION_RANK[b.urgency];
    if (byRank !== 0) return byRank;
    return a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1 : 0;
  });

  const winner = candidates[0];
  if (winner === undefined) {
    return { source: "none", title: "Sem ações pendentes", date: null, urgency: null, daysDelta: null };
  }

  return {
    source: winner.source,
    title: winner.title,
    date: winner.date,
    urgency: winner.urgency,
    daysDelta: winner.daysDelta,
  };
}

/**
 * Traduz o `RankedUrgency` de `deriveNextAction` (5-6 valores) para o
 * `Urgency` global de 4 valores que `FollowUpStatus` sabe apresentar.
 * `future` e `no_date` não têm cor de urgência própria — o componente já
 * sabe mostrar uma data distante (ou nenhuma) num tom calmo quando recebe
 * `null`. Extraído para não repetir esta tradução em cada consumidor.
 */
export function toFollowUpUrgency(urgency: RankedUrgency | null): Urgency | null {
  if (urgency === "future" || urgency === "no_date") return null;
  return urgency;
}

/** O board Comercial: um card por Deal (inclui Ganho/Perdido — é o histórico do funil). */
export async function getCommercialPipeline(now: Date = new Date()): Promise<CommercialDealCard[]> {
  const [deals, businesses] = await Promise.all([getDeals(now), getBusinesses(now)]);
  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const today = todayIso(now);

  const cards: CommercialDealCard[] = [];
  for (const deal of deals) {
    const business = businessById.get(deal.businessId);
    if (business === undefined) continue; // integridade referencial garante que isto não acontece

    cards.push({ deal, business, ...computeDealFollowUp(deal, today) });
  }
  return cards;
}

async function buildProjectsWithDetail(
  projects: readonly Project[],
  now: Date,
): Promise<ProjectWithDetail[]> {
  return Promise.all(
    projects.map(async (project) => {
      const [website, piriCard, payments] = await Promise.all([
        project.type === "website" ? getWebsiteByProjectId(project.id, now) : Promise.resolve(null),
        project.type === "piricard" ? getPiriCardByProjectId(project.id, now) : Promise.resolve(null),
        getPaymentsByProjectId(project.id, now),
      ]);

      return {
        project,
        website,
        piriCard,
        paymentSummary: summarizePayments(payments, todayIso(now)),
      };
    }),
  );
}

/** Resumo de um negócio para a lista de Clientes. */
export async function getBusinessSummary(
  business: Business,
  now: Date = new Date(),
): Promise<BusinessSummary> {
  const [projects, payments, renewals, tasks, deals, maintenanceRequests] = await Promise.all([
    getProjectsByBusinessId(business.id, now),
    getPaymentsByBusinessId(business.id, now),
    getRenewalsByBusinessId(business.id, now),
    getTasksByBusinessId(business.id, now),
    getDealsByBusinessId(business.id, now),
    getMaintenanceRequestsByBusinessId(business.id, now),
  ]);

  const pendingRenewals = renewals
    .filter((r) => r.status === "pending")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));

  return {
    business,
    activeProjectsCount: countActiveProjects(projects),
    hasWebsite: projects.some((p) => p.type === "website"),
    hasPiriCard: projects.some((p) => p.type === "piricard"),
    overallStatus: deriveBusinessOverallStatus({ projects, tasks, maintenanceRequests }),
    paymentSummary: summarizePayments(payments, todayIso(now)),
    nextRenewal: pendingRenewals[0] ?? null,
    openTasksCount: countOpenTasks(tasks),
    responsibleUserId: deriveResponsibleUserId(deals),
  };
}

/** Um resumo por negócio — usado pela lista de Clientes. */
export async function getBusinessSummaries(
  businesses: readonly Business[],
  now: Date = new Date(),
): Promise<BusinessSummary[]> {
  return Promise.all(businesses.map((business) => getBusinessSummary(business, now)));
}

/** Tudo o que o Business Detail Hub precisa, numa só leitura composta. */
export async function getBusinessOverview(
  businessId: string,
  now: Date = new Date(),
): Promise<BusinessOverview | null> {
  const business = await getBusinessById(businessId, now);
  if (business === null) return null;

  const [contacts, deals, projects, renewals, tasks, maintenanceRequests, payments] =
    await Promise.all([
      getContactsByBusinessId(businessId, now),
      getDealsByBusinessId(businessId, now),
      getProjectsByBusinessId(businessId, now),
      getRenewalsByBusinessId(businessId, now),
      getTasksByBusinessId(businessId, now),
      getMaintenanceRequestsByBusinessId(businessId, now),
      getPaymentsByBusinessId(businessId, now),
    ]);

  const projectsWithDetail = await buildProjectsWithDetail(projects, now);
  const primaryContact = contacts.find((c) => c.id === business.primaryContactId) ?? null;
  const openDeal = pickOpenDeal(deals);
  const today = todayIso(now);

  return {
    business,
    primaryContact,
    contacts,
    deals,
    openDeal,
    projects: projectsWithDetail,
    renewals,
    tasks,
    maintenanceRequests,
    payments,
    paymentSummary: summarizePayments(payments, today),
    responsibleUserId: deriveResponsibleUserId(deals),
    overallStatus: deriveBusinessOverallStatus({ projects, tasks, maintenanceRequests }),
    nextAction: deriveNextAction(
      { tasks, maintenanceRequests, openDeal, lifecycleStatus: business.lifecycleStatus },
      today,
    ),
  };
}
