import { taskSchema } from "@/lib/validation/task";
import { diffCalendarDays } from "@/lib/utils/date";
import type {
  Business,
  Deal,
  MaintenanceRequest,
  Priority,
  Project,
  Task,
  TaskWithDetail,
  WaitingReason,
  WorkStatus,
} from "@/types";

import { getBusinesses } from "./businesses";
import { getDeals } from "./deals";
import { getMaintenanceRequests } from "./misc";
import { getProjects } from "./projects";
import { getTasks } from "./tasks";

/**
 * Tudo o que a página Tarefas precisa: Tasks + Business/Project resolvidos +
 * agrupamento por urgência. Reaproveitado pela tab Tarefas do Business
 * Detail (Round 4) — a mesma lógica, nos dois sítios, para nunca haver duas
 * versões divergentes da mesma regra.
 */

interface TaskContextData {
  businesses: readonly Business[];
  projects: readonly Project[];
  deals: readonly Deal[];
  maintenanceRequests: readonly MaintenanceRequest[];
}

interface TaskContextIndexes {
  businessById: Map<string, Business>;
  projectById: Map<string, Project>;
  dealById: Map<string, Deal>;
  maintenanceById: Map<string, MaintenanceRequest>;
}

function buildIndexes(data: TaskContextData): TaskContextIndexes {
  return {
    businessById: new Map(data.businesses.map((b) => [b.id, b])),
    projectById: new Map(data.projects.map((p) => [p.id, p])),
    dealById: new Map(data.deals.map((d) => [d.id, d])),
    maintenanceById: new Map(data.maintenanceRequests.map((m) => [m.id, m])),
  };
}

function resolveWithIndexes(task: Task, idx: TaskContextIndexes): Omit<TaskWithDetail, "task"> {
  let businessId: string | null = null;
  let projectId: string | null = null;

  if (task.relatedEntityId !== null) {
    switch (task.relatedEntityType) {
      case "business":
        businessId = task.relatedEntityId;
        break;
      case "project": {
        const project = idx.projectById.get(task.relatedEntityId);
        if (project !== undefined) {
          businessId = project.businessId;
          projectId = project.id;
        }
        break;
      }
      case "deal": {
        const deal = idx.dealById.get(task.relatedEntityId);
        if (deal !== undefined) businessId = deal.businessId;
        break;
      }
      case "maintenance_request": {
        const request = idx.maintenanceById.get(task.relatedEntityId);
        if (request !== undefined) {
          businessId = request.businessId;
          projectId = request.projectId;
        }
        break;
      }
      // "goal": nenhum negócio resolvível nesta fase (não há tabela de Goals
      // ligada a Business); fica sem contexto, como uma Task sem relação.
      default:
        break;
    }
  }

  const business = businessId === null ? undefined : idx.businessById.get(businessId);
  const project = projectId === null ? undefined : idx.projectById.get(projectId);

  return {
    businessId: business?.id ?? null,
    businessName: business?.name ?? null,
    projectId: project?.id ?? null,
    projectName: project?.name ?? null,
  };
}

/**
 * Resolve o Business/Project de uma única Task. Sobretudo para testes e para
 * quem só tem uma Task à mão — em produção, `buildTasksWithDetail` constrói
 * os índices uma só vez para uma lista inteira.
 */
export function resolveTaskContext(
  task: Task,
  data: TaskContextData,
): Omit<TaskWithDetail, "task"> {
  return resolveWithIndexes(task, buildIndexes(data));
}

export function buildTasksWithDetail(
  tasks: readonly Task[],
  data: TaskContextData,
): TaskWithDetail[] {
  const idx = buildIndexes(data);
  return tasks.map((task) => ({ task, ...resolveWithIndexes(task, idx) }));
}

/**
 * Os ids **estruturais** de um negócio — os que nunca mudam depois de criados
 * (um Project/Deal/MaintenanceRequest não muda de Business). Ao contrário de
 * uma lista de `taskIds` (que "congela" no momento em que é calculada e nunca
 * vê uma Task criada depois), estes ids continuam corretos para sempre, por
 * isso são seguros para pré-calcular no servidor uma única vez.
 */
export interface BusinessTaskScope {
  businessId: string;
  projectIds: readonly string[];
  dealIds: readonly string[];
  maintenanceRequestIds: readonly string[];
}

/**
 * Testa se uma Task pertence a um negócio, resolvendo o par polimórfico
 * (`relatedEntityType`/`relatedEntityId`) contra os ids estruturais desse
 * negócio — sem precisar de saber, de antemão, que Tasks existem.
 *
 * É esta indireção que permite às vistas reativas (`LiveOverallStatusBadge`,
 * `useLiveBusinessScope`) filtrar a `useTaskStore` **ao vivo**: uma Task
 * criada depois do carregamento da página passa exatamente pela mesma
 * verificação e entra corretamente, sem depender de uma lista de ids
 * calculada no passado.
 */
export function taskBelongsToBusiness(task: Task, scope: BusinessTaskScope): boolean {
  if (task.relatedEntityId === null) return false;

  switch (task.relatedEntityType) {
    case "business":
      return task.relatedEntityId === scope.businessId;
    case "project":
      return scope.projectIds.includes(task.relatedEntityId);
    case "deal":
      return scope.dealIds.includes(task.relatedEntityId);
    case "maintenance_request":
      return scope.maintenanceRequestIds.includes(task.relatedEntityId);
    // "goal": nenhum negócio resolvível nesta fase — mesma regra de resolveWithIndexes.
    default:
      return false;
  }
}

/** Tudo o que `/tasks` precisa, numa só leitura composta. */
export async function getTasksBoard(now: Date = new Date()): Promise<TaskWithDetail[]> {
  const [tasks, businesses, projects, deals, maintenanceRequests] = await Promise.all([
    getTasks(now),
    getBusinesses(now),
    getProjects(now),
    getDeals(now),
    getMaintenanceRequests(now),
  ]);

  return buildTasksWithDetail(tasks, { businesses, projects, deals, maintenanceRequests });
}

// --- Hierarquia de urgência ------------------------------------------------

export interface TaskBuckets {
  overdue: TaskWithDetail[];
  dueToday: TaskWithDetail[];
  /** 1–7 dias — inclui "Amanhã", ver `describeDueDate`. */
  dueSoon: TaskWithDetail[];
  /** >7 dias, ou sem `dueDate` (backlog). */
  future: TaskWithDetail[];
  waitingOnClient: TaskWithDetail[];
  done: TaskWithDetail[];
}

const TASK_DUE_SOON_DAYS = 7;

function byDueDateAscending(a: TaskWithDetail, b: TaskWithDetail): number {
  const dateA = a.task.dueDate;
  const dateB = b.task.dueDate;
  if (dateA === dateB) return 0;
  if (dateA === null) return 1; // sem data fica sempre por último dentro do bucket
  if (dateB === null) return -1;
  return dateA < dateB ? -1 : 1;
}

/**
 * Separa as Tasks pela hierarquia pedida para `/tasks` — nunca pela janela de
 * `classifyUrgency`/`attention-rules.ts` (aqui mostra-se sempre tudo, nunca se
 * exclui por estar "longe demais"). `waiting_on_client` e `done` nunca caem
 * num bucket de data, mesmo com `dueDate` no passado: é a mesma regra central
 * já aplicada em `attention-rules.ts`/`deriveNextAction`, só que aqui a Task
 * continua visível — na sua própria secção — em vez de desaparecer do feed.
 */
export function groupTasksByUrgency(
  tasks: readonly TaskWithDetail[],
  todayIsoDate: string,
): TaskBuckets {
  const buckets: TaskBuckets = {
    overdue: [],
    dueToday: [],
    dueSoon: [],
    future: [],
    waitingOnClient: [],
    done: [],
  };

  for (const item of tasks) {
    const { status, dueDate } = item.task;

    if (status === "done") {
      buckets.done.push(item);
      continue;
    }
    if (status === "waiting_on_client") {
      buckets.waitingOnClient.push(item);
      continue;
    }
    if (dueDate === null) {
      buckets.future.push(item);
      continue;
    }

    const diff = diffCalendarDays(dueDate, todayIsoDate);
    if (diff < 0) buckets.overdue.push(item);
    else if (diff === 0) buckets.dueToday.push(item);
    else if (diff <= TASK_DUE_SOON_DAYS) buckets.dueSoon.push(item);
    else buckets.future.push(item);
  }

  buckets.overdue.sort(byDueDateAscending);
  buckets.dueToday.sort(byDueDateAscending);
  buckets.dueSoon.sort(byDueDateAscending);
  buckets.future.sort(byDueDateAscending);
  // À espera do cliente: a que está à espera há mais tempo primeiro.
  buckets.waitingOnClient.sort((a, b) => (a.task.updatedAt < b.task.updatedAt ? -1 : 1));
  // Concluídas: a mais recentemente concluída primeiro.
  buckets.done.sort((a, b) => (a.task.updatedAt > b.task.updatedAt ? -1 : 1));

  return buckets;
}

// --- Mutações puras (usadas pela useTaskStore) -----------------------------

/**
 * O par `relatedEntityType`/`relatedEntityId` que o formulário de Task
 * consegue produzir — só Business ou Project (secção 8 do Round 4). Uma Task
 * já ligada a um Deal/MaintenanceRequest/Goal mantém essa relação intacta até
 * alguém a editar a partir daqui; nesse momento passa a uma destas duas.
 */
export type TaskFormRelatedEntityType = "business" | "project";

export interface NewTaskInput {
  title: string;
  assigneeId: string;
  status: WorkStatus;
  waitingReason: WaitingReason | null;
  priority: Priority;
  dueDate: string | null;
  relatedEntityType: TaskFormRelatedEntityType | null;
  relatedEntityId: string | null;
}

export type TaskPatch = Partial<NewTaskInput>;

function generateTaskId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `task-local-${random}`;
}

/**
 * Cria e valida uma Task nova a partir do formulário. Passa sempre pelo
 * schema — nunca devolve (nem persiste) um objeto que viole a invariante
 * `waitingReason`.
 */
export function buildNewTask(input: NewTaskInput, now: Date = new Date()): Task {
  const timestamp = now.toISOString();
  const waitingReason = input.status === "waiting_on_client" ? input.waitingReason : null;

  return taskSchema.parse({
    id: generateTaskId(),
    title: input.title,
    status: input.status,
    waitingReason,
    priority: input.priority,
    dueDate: input.dueDate,
    assigneeId: input.assigneeId,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Aplica um patch parcial a uma Task existente. `waitingReason` é sempre
 * recalculado a partir do estado final (nunca fica pendurado de um estado
 * anterior), e o resultado passa sempre pelo schema antes de ser devolvido.
 */
export function applyTaskPatch(task: Task, patch: TaskPatch, now: Date = new Date()): Task {
  const nextStatus = patch.status ?? task.status;
  const waitingReason =
    nextStatus === "waiting_on_client"
      ? (patch.waitingReason !== undefined ? patch.waitingReason : task.waitingReason)
      : null;

  return taskSchema.parse({
    ...task,
    ...patch,
    status: nextStatus,
    waitingReason,
    updatedAt: now.toISOString(),
  });
}
