import { projectSchema } from "@/lib/validation/project";
import { todayIso } from "@/lib/utils/date";
import { summarizePayments } from "@/lib/utils/payment";
import type {
  Business,
  MaintenanceRequest,
  PiriCard,
  Payment,
  Project,
  ProjectListRow,
  ProjectOverview,
  ProjectType,
  Renewal,
  Task,
  WaitingReason,
  Website,
  WorkStatus,
} from "@/types";

import { deriveNextAction, deriveResponsibleUserId } from "./business-overview";
import { getBusinessById } from "./businesses";
import { getDealsByBusinessId } from "./deals";
import { getMaintenanceRequestsByProjectId } from "./misc";
import { getPaymentsByProjectId } from "./payments";
import { getPiriCardByProjectId, getProjectById, getProjectsByType, getWebsiteByProjectId } from "./projects";
import { getRenewalsByProjectId } from "./renewals";
import { getTasksForEntity } from "./tasks";

/**
 * Leituras compostas de `/websites` e `/piricards` — irmão de
 * `business-overview.ts`, mesma disciplina: a agregação vive aqui, nunca nas
 * páginas. Reaproveita só funções de leitura já existentes (nenhuma nova em
 * `lib/data/*` além deste ficheiro) e a mesma `deriveNextAction`/
 * `deriveResponsibleUserId` do Business Detail — sem duplicar lógica.
 */

interface GatheredProjectData {
  business: Business;
  website: Website | null;
  piriCard: PiriCard | null;
  tasks: Task[];
  maintenanceRequests: MaintenanceRequest[];
  renewals: Renewal[];
  payments: Payment[];
  responsibleUserId: string | null;
}

async function gatherProjectData(project: Project, now: Date): Promise<GatheredProjectData> {
  const [business, website, piriCard, tasks, maintenanceRequests, renewals, payments, deals] =
    await Promise.all([
      getBusinessById(project.businessId, now),
      project.type === "website" ? getWebsiteByProjectId(project.id, now) : Promise.resolve(null),
      project.type === "piricard" ? getPiriCardByProjectId(project.id, now) : Promise.resolve(null),
      getTasksForEntity("project", project.id, now),
      getMaintenanceRequestsByProjectId(project.id, now),
      getRenewalsByProjectId(project.id, now),
      getPaymentsByProjectId(project.id, now),
      getDealsByBusinessId(project.businessId, now),
    ]);

  if (business === null) {
    // Integridade referencial garantida por `mock-integrity.test.ts` — não deve acontecer.
    throw new Error(`Project ${project.id} aponta para um Business inexistente (${project.businessId})`);
  }

  return {
    business,
    website,
    piriCard,
    tasks,
    maintenanceRequests,
    renewals,
    payments,
    // D3: o responsável de um Project é o responsável do seu Business — nunca
    // um campo próprio. Ver a justificação completa no plano do Round 5.
    responsibleUserId: deriveResponsibleUserId(deals),
  };
}

/**
 * Junta um Project já lido com o resto dos seus dados numa única
 * `ProjectListRow` — a mesma função corre no servidor (`getWebsitesBoard`/
 * `getPiriCardsBoard`) e no cliente (`ProjectsBoard`, quando o estado ao vivo
 * de `useProjectStore`/`useTaskStore` muda), para nunca haver duas versões
 * divergentes do cálculo de "próxima ação"/"tarefas abertas"/pagamento.
 */
export function buildProjectListRow(
  input: {
    project: Project;
    business: Business;
    website: Website | null;
    piriCard: PiriCard | null;
    tasks: readonly Task[];
    maintenanceRequests: readonly MaintenanceRequest[];
    renewals: readonly Renewal[];
    payments: readonly Payment[];
    responsibleUserId: string | null;
  },
  today: string,
): ProjectListRow {
  const { project, business, website, piriCard, tasks, maintenanceRequests, renewals, payments, responsibleUserId } =
    input;

  const openTasksCount = tasks.filter(
    (t) => t.status !== "done" && t.status !== "waiting_on_client",
  ).length;

  const pendingRenewals = [...renewals]
    .filter((r) => r.status === "pending")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));

  return {
    project,
    business,
    website,
    piriCard,
    responsibleUserId,
    paymentSummary: summarizePayments(payments, today),
    nextRenewal: pendingRenewals[0] ?? null,
    openTasksCount,
    // D2: sem `openDeal`/`lifecycleStatus` — um Project não tem Deal nem
    // lifecycle próprios, só Tasks/MaintenanceRequests ligados a ele.
    nextAction: deriveNextAction({ tasks, maintenanceRequests }, today),
    maintenanceRequests: [...maintenanceRequests],
  };
}

async function getProjectListRowsByType(
  type: ProjectType,
  now: Date = new Date(),
): Promise<ProjectListRow[]> {
  const projects = await getProjectsByType(type, now);
  const today = todayIso(now);

  return Promise.all(
    projects.map(async (project) => {
      const data = await gatherProjectData(project, now);
      return buildProjectListRow({ project, ...data }, today);
    }),
  );
}

/** O board `/websites`. */
export async function getWebsitesBoard(now: Date = new Date()): Promise<ProjectListRow[]> {
  return getProjectListRowsByType("website", now);
}

/** O board `/piricards`. */
export async function getPiriCardsBoard(now: Date = new Date()): Promise<ProjectListRow[]> {
  return getProjectListRowsByType("piricard", now);
}

/** Tudo o que o Website/PiriCard Detail precisa, numa só leitura composta. */
export async function getProjectOverview(
  projectId: string,
  now: Date = new Date(),
): Promise<ProjectOverview | null> {
  const project = await getProjectById(projectId, now);
  if (project === null) return null;

  const data = await gatherProjectData(project, now);
  const today = todayIso(now);
  const row = buildProjectListRow({ project, ...data }, today);

  return {
    ...row,
    tasks: data.tasks,
    maintenanceRequests: data.maintenanceRequests,
    renewals: data.renewals,
    payments: data.payments,
  };
}

/** `/websites/:projectId` ou `/piricards/:projectId` — Website/PiriCard não têm `id` próprio, só `projectId`. */
export function projectDetailHref(project: Project): string {
  return project.type === "website" ? `/websites/${project.id}` : `/piricards/${project.id}`;
}

export interface ProjectStatusPatch {
  status: WorkStatus;
  waitingReason: WaitingReason | null;
}

/**
 * Aplica uma mudança de estado a um Project existente — espelha
 * `applyTaskPatch` (Round 4): `waitingReason` é sempre recalculado a partir
 * do estado final (nunca fica pendurado de um estado anterior), e o
 * resultado passa sempre pelo schema antes de ser devolvido.
 */
export function applyProjectStatusPatch(
  project: Project,
  patch: ProjectStatusPatch,
  now: Date = new Date(),
): Project {
  const waitingReason = patch.status === "waiting_on_client" ? patch.waitingReason : null;

  return projectSchema.parse({
    ...project,
    status: patch.status,
    waitingReason,
    updatedAt: now.toISOString(),
  });
}
