import { renewalTypeLabel } from "@/lib/constants/labels";
import { diffCalendarDays, todayIso } from "@/lib/utils/date";
import { getRemainingValue } from "@/lib/utils/payment";
import type {
  AttentionItem,
  AttentionKind,
  BlockedProjectItem,
  Business,
  Deal,
  MaintenanceRequest,
  Payment,
  Project,
  Renewal,
  Task,
  Urgency,
  WaitingOnClientItem,
  WorkStatus,
} from "@/types";

/**
 * Regras de atenção — **lógica pura**.
 *
 * Nada aqui lê o relógio, a base de dados ou o React: recebe arrays e um `now`
 * explícito, devolve itens ordenados. É a peça mais valiosa (e mais fácil de
 * errar em silêncio) da aplicação, por isso vive isolada e testada.
 *
 * Sem scoring e sem heurísticas: um item cai num de quatro baldes de urgência e
 * é ordenado por data. Previsível é mais útil do que esperto.
 */

/**
 * Janela, por tipo, dentro da qual algo já conta como "a chegar".
 * As renovações têm janela maior porque se resolvem com antecedência.
 */
export const ATTENTION_WINDOW_DAYS = {
  task: 7,
  deal: 7,
  payment: 7,
  maintenance: 7,
  renewal: 30,
} as const satisfies Record<AttentionKind, number>;

/** Dias sem contacto/movimento a partir dos quais algo em aberto conta como parado. */
export const STALLED_AFTER_DAYS = 14;

/**
 * Janela do painel dedicado de Renovações (Dashboard, secção 7) — maior do que
 * a janela de atenção de propósito: são trabalhos diferentes. Ficam lado a lado
 * para não divergirem sem que se note.
 */
export const RENEWALS_PANEL_WINDOW_DAYS = 60;

const URGENCY_RANK: Record<Urgency, number> = {
  overdue: 0,
  due_today: 1,
  due_soon: 2,
  stalled: 3,
};

const KIND_RANK: Record<AttentionKind, number> = {
  task: 0,
  deal: 1,
  payment: 2,
  renewal: 3,
  maintenance: 4,
};

/** Rotas de destino. Apontam para listas que já existem; passam a deep links quando os detalhes existirem. */
const HREF_BY_KIND: Record<AttentionKind, string> = {
  task: "/tasks",
  deal: "/commercial",
  payment: "/finance",
  renewal: "/renewals",
  maintenance: "/maintenance",
};

export interface AttentionInput {
  businesses: readonly Business[];
  deals: readonly Deal[];
  projects: readonly Project[];
  tasks: readonly Task[];
  renewals: readonly Renewal[];
  payments: readonly Payment[];
  maintenanceRequests: readonly MaintenanceRequest[];
}

/**
 * A regra de classificação, num sítio só.
 * `null` = está longe demais para ser assunto de hoje.
 */
export function classifyUrgency(
  dueDateIso: string,
  todayIsoDate: string,
  windowDays: number,
): Urgency | null {
  const diff = diffCalendarDays(dueDateIso, todayIsoDate);
  if (diff < 0) return "overdue";
  if (diff === 0) return "due_today";
  if (diff <= windowDays) return "due_soon";
  return null;
}

/**
 * Trabalho que ainda é nosso: nem concluído, nem à espera do cliente.
 *
 * `waiting_on_client` sai daqui de propósito — é a regra central do produto.
 * Um projeto à espera de fotografias **não** se transforma em trabalho nosso
 * atrasado pelo simples passar do tempo; se houver ação nossa, ela existe como
 * Task separada e é essa que entra no feed.
 */
function isOurOpenWork(status: WorkStatus): boolean {
  return status !== "done" && status !== "waiting_on_client";
}

function isClosedDealStage(stage: Deal["stage"]): boolean {
  return stage === "won" || stage === "lost";
}

function indexBy<T, K extends keyof T>(rows: readonly T[], key: K): Map<T[K], T> {
  return new Map(rows.map((row) => [row[key], row]));
}

function makeItem(
  params: Omit<AttentionItem, "id" | "daysDelta"> & { todayIsoDate: string },
): AttentionItem {
  const { todayIsoDate, ...rest } = params;
  return {
    ...rest,
    id: `${rest.kind}:${rest.sourceId}`,
    daysDelta: diffCalendarDays(rest.dueOrStalledDate, todayIsoDate),
  };
}

export function taskAttention(
  tasks: readonly Task[],
  input: Pick<AttentionInput, "businesses" | "projects" | "deals" | "maintenanceRequests">,
  todayIsoDate: string,
): AttentionItem[] {
  const businessById = indexBy(input.businesses, "id");
  const projectById = indexBy(input.projects, "id");
  const dealById = indexBy(input.deals, "id");
  const maintenanceById = indexBy(input.maintenanceRequests, "id");

  const items: AttentionItem[] = [];

  for (const task of tasks) {
    if (!isOurOpenWork(task.status)) continue;
    if (task.dueDate === null) continue; // backlog sem data: vive em /tasks, não aqui

    const urgency = classifyUrgency(task.dueDate, todayIsoDate, ATTENTION_WINDOW_DAYS.task);
    if (urgency === null) continue;

    const businessId = resolveTaskBusinessId(task, { projectById, dealById, maintenanceById });
    const business = businessId === null ? undefined : businessById.get(businessId);

    items.push(
      makeItem({
        todayIsoDate,
        kind: "task",
        sourceId: task.id,
        title: task.title,
        dueOrStalledDate: task.dueDate,
        urgency,
        href: HREF_BY_KIND.task,
        businessId: business?.id ?? null,
        businessName: business?.name ?? null,
        ownerId: task.assigneeId,
      }),
    );
  }

  return items;
}

function resolveTaskBusinessId(
  task: Task,
  indexes: {
    projectById: Map<string, Project>;
    dealById: Map<string, Deal>;
    maintenanceById: Map<string, MaintenanceRequest>;
  },
): string | null {
  if (task.relatedEntityId === null) return null;

  switch (task.relatedEntityType) {
    case "business":
      return task.relatedEntityId;
    case "project":
      return indexes.projectById.get(task.relatedEntityId)?.businessId ?? null;
    case "deal":
      return indexes.dealById.get(task.relatedEntityId)?.businessId ?? null;
    case "maintenance_request":
      return indexes.maintenanceById.get(task.relatedEntityId)?.businessId ?? null;
    default:
      return null;
  }
}

export function dealAttention(
  deals: readonly Deal[],
  businesses: readonly Business[],
  todayIsoDate: string,
): AttentionItem[] {
  const businessById = indexBy(businesses, "id");
  const items: AttentionItem[] = [];

  for (const deal of deals) {
    if (isClosedDealStage(deal.stage)) continue;

    const business = businessById.get(deal.businessId);
    if (business?.lifecycleStatus === "inactive") continue;

    const common = {
      todayIsoDate,
      kind: "deal" as const,
      sourceId: deal.id,
      href: HREF_BY_KIND.deal,
      businessId: business?.id ?? null,
      businessName: business?.name ?? null,
      ownerId: deal.responsibleUserId,
    };

    if (deal.nextActionDate !== null) {
      const urgency = classifyUrgency(deal.nextActionDate, todayIsoDate, ATTENTION_WINDOW_DAYS.deal);
      if (urgency === null) continue;

      items.push(
        makeItem({
          ...common,
          title: deal.nextAction ?? deal.title,
          dueOrStalledDate: deal.nextActionDate,
          urgency,
        }),
      );
      continue;
    }

    // Sem próxima ação definida: só interessa se estiver mesmo parado.
    // (Um deal com próxima ação marcada nunca cai aqui — os dois caminhos são
    // mutuamente exclusivos, por isso nenhum deal aparece duas vezes.)
    const daysSinceContact = -diffCalendarDays(deal.lastInteractionDate, todayIsoDate);
    if (daysSinceContact < STALLED_AFTER_DAYS) continue;

    items.push(
      makeItem({
        ...common,
        title: `${deal.title} — sem contacto há ${daysSinceContact} dias`,
        dueOrStalledDate: deal.lastInteractionDate,
        urgency: "stalled",
      }),
    );
  }

  return items;
}

export function renewalAttention(
  renewals: readonly Renewal[],
  input: Pick<AttentionInput, "projects" | "businesses">,
  todayIsoDate: string,
): AttentionItem[] {
  const projectById = indexBy(input.projects, "id");
  const businessById = indexBy(input.businesses, "id");
  const items: AttentionItem[] = [];

  for (const renewal of renewals) {
    if (renewal.status !== "pending") continue;

    const urgency = classifyUrgency(
      renewal.dueDate,
      todayIsoDate,
      ATTENTION_WINDOW_DAYS.renewal,
    );
    if (urgency === null) continue;

    const project = projectById.get(renewal.projectId);
    const business = project === undefined ? undefined : businessById.get(project.businessId);

    items.push(
      makeItem({
        todayIsoDate,
        kind: "renewal",
        sourceId: renewal.id,
        title: `${renewalTypeLabel(renewal.type)} — ${business?.name ?? project?.name ?? "Sem negócio"}`,
        dueOrStalledDate: renewal.dueDate,
        urgency,
        href: HREF_BY_KIND.renewal,
        businessId: business?.id ?? null,
        businessName: business?.name ?? null,
        ownerId: null,
      }),
    );
  }

  return items;
}

export function paymentAttention(
  payments: readonly Payment[],
  businesses: readonly Business[],
  todayIsoDate: string,
): AttentionItem[] {
  const businessById = indexBy(businesses, "id");
  const items: AttentionItem[] = [];

  for (const payment of payments) {
    if (payment.paymentStatus === "paid") continue;
    if (getRemainingValue(payment) <= 0) continue;

    const urgency = classifyUrgency(
      payment.expectedDate,
      todayIsoDate,
      ATTENTION_WINDOW_DAYS.payment,
    );
    if (urgency === null) continue;

    const business = businessById.get(payment.businessId);

    items.push(
      makeItem({
        todayIsoDate,
        kind: "payment",
        sourceId: payment.id,
        title: `Pagamento em falta — ${business?.name ?? "Sem negócio"}`,
        dueOrStalledDate: payment.expectedDate,
        urgency,
        href: HREF_BY_KIND.payment,
        businessId: business?.id ?? null,
        businessName: business?.name ?? null,
        ownerId: null,
      }),
    );
  }

  return items;
}

export function maintenanceAttention(
  requests: readonly MaintenanceRequest[],
  businesses: readonly Business[],
  todayIsoDate: string,
): AttentionItem[] {
  const businessById = indexBy(businesses, "id");
  const items: AttentionItem[] = [];

  for (const request of requests) {
    if (!isOurOpenWork(request.status)) continue;

    const business = businessById.get(request.businessId);
    const common = {
      todayIsoDate,
      kind: "maintenance" as const,
      sourceId: request.id,
      href: HREF_BY_KIND.maintenance,
      businessId: business?.id ?? null,
      businessName: business?.name ?? null,
      ownerId: null,
    };

    if (request.dueDate !== null) {
      const urgency = classifyUrgency(
        request.dueDate,
        todayIsoDate,
        ATTENTION_WINDOW_DAYS.maintenance,
      );
      if (urgency === null) continue;

      items.push(
        makeItem({ ...common, title: request.title, dueOrStalledDate: request.dueDate, urgency }),
      );
      continue;
    }

    const daysOpen = -diffCalendarDays(request.requestedAt, todayIsoDate);
    if (daysOpen < STALLED_AFTER_DAYS) continue;

    items.push(
      makeItem({
        ...common,
        title: `${request.title} — aberto há ${daysOpen} dias`,
        dueOrStalledDate: request.requestedAt,
        urgency: "stalled",
      }),
    );
  }

  return items;
}

/**
 * Ordem total e determinística: urgência → data (mais antigo primeiro) →
 * tipo → id. Sem empates ambíguos, para os testes serem estáveis e para a
 * lista não "saltar" entre renderizações.
 */
export function rankAttention(items: readonly AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (byUrgency !== 0) return byUrgency;

    if (a.dueOrStalledDate !== b.dueOrStalledDate) {
      return a.dueOrStalledDate < b.dueOrStalledDate ? -1 : 1;
    }

    const byKind = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (byKind !== 0) return byKind;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Agrega as cinco origens e ordena. É esta a função que o Dashboard consome. */
export function buildAttentionItems(input: AttentionInput, now: Date): AttentionItem[] {
  const today = todayIso(now);

  return rankAttention([
    ...taskAttention(input.tasks, input, today),
    ...dealAttention(input.deals, input.businesses, today),
    ...paymentAttention(input.payments, input.businesses, today),
    ...renewalAttention(input.renewals, input, today),
    ...maintenanceAttention(input.maintenanceRequests, input.businesses, today),
  ]);
}

/**
 * Feed separado: o que está parado à espera de terceiros.
 *
 * Existir em separado é o ponto todo — isto **não** é trabalho nosso atrasado,
 * e nunca pode ser apresentado como tal.
 */
export function buildWaitingOnClientItems(
  input: Pick<AttentionInput, "projects" | "tasks" | "maintenanceRequests" | "businesses">,
): WaitingOnClientItem[] {
  const businessById = indexBy(input.businesses, "id");
  const projectById = indexBy(input.projects, "id");
  const items: WaitingOnClientItem[] = [];

  for (const project of input.projects) {
    if (project.status !== "waiting_on_client" || project.waitingReason === null) continue;
    const business = businessById.get(project.businessId);

    items.push({
      id: `project:${project.id}`,
      kind: "project",
      sourceId: project.id,
      title: project.name,
      waitingReason: project.waitingReason,
      waitingSince: project.updatedAt.slice(0, 10),
      href: project.type === "website" ? "/websites" : "/piricards",
      businessId: project.businessId,
      businessName: business?.name ?? "",
    });
  }

  for (const task of input.tasks) {
    if (task.status !== "waiting_on_client" || task.waitingReason === null) continue;

    const businessId =
      task.relatedEntityType === "business"
        ? task.relatedEntityId
        : task.relatedEntityType === "project" && task.relatedEntityId !== null
          ? (projectById.get(task.relatedEntityId)?.businessId ?? null)
          : null;
    const business = businessId === null ? undefined : businessById.get(businessId);

    items.push({
      id: `task:${task.id}`,
      kind: "task",
      sourceId: task.id,
      title: task.title,
      waitingReason: task.waitingReason,
      waitingSince: task.updatedAt.slice(0, 10),
      href: "/tasks",
      businessId: businessId ?? "",
      businessName: business?.name ?? "",
    });
  }

  for (const request of input.maintenanceRequests) {
    if (request.status !== "waiting_on_client" || request.waitingReason === null) continue;
    const business = businessById.get(request.businessId);

    items.push({
      id: `maintenance:${request.id}`,
      kind: "maintenance",
      sourceId: request.id,
      title: request.title,
      waitingReason: request.waitingReason,
      waitingSince: request.updatedAt.slice(0, 10),
      href: "/maintenance",
      businessId: request.businessId,
      businessName: business?.name ?? "",
    });
  }

  return items.sort((a, b) => (a.waitingSince < b.waitingSince ? -1 : a.waitingSince > b.waitingSince ? 1 : 0));
}

/** Projetos bloqueados: ao contrário do "à espera do cliente", isto é nosso para desbloquear. */
export function buildBlockedProjects(
  projects: readonly Project[],
  businesses: readonly Business[],
): BlockedProjectItem[] {
  const businessById = indexBy(businesses, "id");

  return projects
    .filter((project) => project.status === "blocked")
    .map((project) => ({
      projectId: project.id,
      name: project.name,
      status: project.status,
      businessId: project.businessId,
      businessName: businessById.get(project.businessId)?.name ?? "",
      href: project.type === "website" ? "/websites" : "/piricards",
    }));
}
