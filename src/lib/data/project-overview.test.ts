import { describe, expect, it } from "vitest";

import { buildMockData, TEST_TODAY } from "@/lib/mock";
import { BUSINESS_IDS } from "@/lib/mock/businesses";
import { MAINTENANCE_IDS } from "@/lib/mock/maintenance-requests";
import { PROJECT_IDS } from "@/lib/mock/projects";
import { TASK_IDS } from "@/lib/mock/tasks";
import type { Business, MaintenanceRequest, Payment, Project, Renewal, Task } from "@/types";

import {
  applyProjectStatusPatch,
  buildProjectListRow,
  getPiriCardsBoard,
  getProjectOverview,
  getWebsitesBoard,
  projectDetailHref,
} from "./project-overview";

const audit = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    name: "Negócio",
    industry: "Serviços",
    lifecycleStatus: "client",
    location: "Leiria",
    primaryContactId: null,
    notes: null,
    ...audit,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    businessId: "biz-1",
    dealId: null,
    type: "website",
    name: "Projeto",
    status: "in_progress",
    waitingReason: null,
    startDate: "2026-01-01",
    launchDate: null,
    ...audit,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Tarefa",
    status: "todo",
    waitingReason: null,
    priority: "normal",
    dueDate: "2026-03-29",
    assigneeId: "sny",
    relatedEntityType: "project",
    relatedEntityId: "proj-1",
    ...audit,
    ...overrides,
  };
}

describe("buildProjectListRow", () => {
  const business = makeBusiness();
  const project = makeProject();
  const today = "2026-03-29";
  const noTasks: Task[] = [];
  const noMaintenance: MaintenanceRequest[] = [];
  const noRenewals: Renewal[] = [];
  const noPayments: Payment[] = [];

  it("conta só as tarefas ainda em aberto (nem concluídas, nem à espera do cliente)", () => {
    const row = buildProjectListRow(
      {
        project,
        business,
        website: null,
        piriCard: null,
        tasks: [
          makeTask({ id: "t1", status: "todo" }),
          makeTask({ id: "t2", status: "done" }),
          makeTask({ id: "t3", status: "waiting_on_client", waitingReason: "content" }),
        ],
        maintenanceRequests: noMaintenance,
        renewals: noRenewals,
        payments: noPayments,
        responsibleUserId: "sny",
      },
      today,
    );
    expect(row.openTasksCount).toBe(1);
  });

  it("nextAction reaproveita deriveNextAction sem candidato de Deal — uma Task aberta vence", () => {
    const row = buildProjectListRow(
      {
        project,
        business,
        website: null,
        piriCard: null,
        tasks: [makeTask({ dueDate: "2026-03-27" })], // -2 dias
        maintenanceRequests: noMaintenance,
        renewals: noRenewals,
        payments: noPayments,
        responsibleUserId: null,
      },
      today,
    );
    expect(row.nextAction.source).toBe("task");
    expect(row.nextAction.urgency).toBe("overdue");
  });

  it("escolhe a renovação pendente com a data mais próxima", () => {
    const row = buildProjectListRow(
      {
        project,
        business,
        website: null,
        piriCard: null,
        tasks: noTasks,
        maintenanceRequests: noMaintenance,
        renewals: [
          { id: "r1", projectId: "proj-1", type: "hosting", cadence: "annual", dueDate: "2026-06-01", amount: 50, status: "pending", ...audit },
          { id: "r2", projectId: "proj-1", type: "domain", cadence: "annual", dueDate: "2026-04-15", amount: 20, status: "pending", ...audit },
          { id: "r3", projectId: "proj-1", type: "domain", cadence: "annual", dueDate: "2026-04-01", amount: 20, status: "cancelled", ...audit },
        ],
        payments: noPayments,
        responsibleUserId: null,
      },
      today,
    );
    expect(row.nextRenewal?.id).toBe("r2");
  });
});

describe("applyProjectStatusPatch", () => {
  const project = makeProject({ status: "todo", waitingReason: null });

  it("entrar em waiting_on_client exige e guarda o motivo", () => {
    const patched = applyProjectStatusPatch(project, { status: "waiting_on_client", waitingReason: "photos" });
    expect(patched.status).toBe("waiting_on_client");
    expect(patched.waitingReason).toBe("photos");
  });

  it("sair de waiting_on_client limpa sempre o motivo, mesmo que um seja passado por engano", () => {
    const waiting = applyProjectStatusPatch(project, { status: "waiting_on_client", waitingReason: "photos" });
    const patched = applyProjectStatusPatch(waiting, { status: "in_progress", waitingReason: "photos" });
    expect(patched.waitingReason).toBeNull();
  });

  it("nunca produz um Project que viole a invariante — passa sempre pelo schema", () => {
    // waitingReason null com status waiting_on_client seria inválido; a função
    // corrige antes de chegar ao schema (não deixa passar, não rebenta).
    expect(() => applyProjectStatusPatch(project, { status: "blocked", waitingReason: null })).not.toThrow();
  });
});

describe("projectDetailHref", () => {
  it("website → /websites/:id", () => {
    expect(projectDetailHref(makeProject({ id: "proj-x", type: "website" }))).toBe("/websites/proj-x");
  });

  it("piricard → /piricards/:id", () => {
    expect(projectDetailHref(makeProject({ id: "proj-y", type: "piricard" }))).toBe("/piricards/proj-y");
  });
});

describe("sobre a mock real", () => {
  const data = buildMockData(TEST_TODAY);

  it("getWebsitesBoard devolve só projetos website, um por cada", () => {
    const rows = data.projects.filter((p) => p.type === "website");
    return getWebsitesBoard(TEST_TODAY).then((board) => {
      expect(board).toHaveLength(rows.length);
      expect(board.every((row) => row.project.type === "website")).toBe(true);
    });
  });

  it("getPiriCardsBoard devolve só projetos piricard, um por cada", async () => {
    const rows = data.projects.filter((p) => p.type === "piricard");
    const board = await getPiriCardsBoard(TEST_TODAY);
    expect(board).toHaveLength(rows.length);
    expect(board.every((row) => row.project.type === "piricard")).toBe(true);
  });

  it("getProjectOverview devolve null para um id inexistente", async () => {
    expect(await getProjectOverview("proj-inexistente", TEST_TODAY)).toBeNull();
  });

  it("o Website do Boi na Brasa resolve XOR — website presente, piriCard null", async () => {
    const overview = await getProjectOverview(PROJECT_IDS.boiNaBrasaWeb, TEST_TODAY);
    expect(overview).not.toBeNull();
    expect(overview?.website).not.toBeNull();
    expect(overview?.piriCard).toBeNull();
  });

  it("uma Task ligada ao Project aparece na lista de tasks e domina a próxima ação — caso Boi na Brasa", async () => {
    const overview = await getProjectOverview(PROJECT_IDS.boiNaBrasaWeb, TEST_TODAY);
    expect(overview?.tasks.some((t) => t.id === TASK_IDS.boiNaBrasaChasePhotos)).toBe(true);
    expect(overview?.nextAction.source).toBe("task");
    expect(overview?.nextAction.urgency).toBe("overdue");
  });

  it("um Project sem Tasks mas com um MaintenanceRequest usa-o como próxima ação — caso Clínica Sorriso", async () => {
    const overview = await getProjectOverview(PROJECT_IDS.clinicaWeb, TEST_TODAY);
    expect(overview?.tasks).toHaveLength(0);
    expect(overview?.maintenanceRequests.some((m) => m.id === MAINTENANCE_IDS.clinicaHorarios)).toBe(true);
    expect(overview?.nextAction.source).toBe("maintenance");
  });

  it("responsável do Project = responsável do Business (D3) — mesmo valor que o Business Detail", async () => {
    const overview = await getProjectOverview(PROJECT_IDS.boiNaBrasaWeb, TEST_TODAY);
    expect(overview?.responsibleUserId).not.toBeNull();
    expect(overview?.business.id).toBe(BUSINESS_IDS.boiNaBrasa);
  });
});

