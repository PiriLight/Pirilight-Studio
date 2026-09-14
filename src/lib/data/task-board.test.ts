import { describe, expect, it } from "vitest";

import { TEST_TODAY } from "@/lib/mock";
import { BUSINESS_IDS } from "@/lib/mock/businesses";
import { MAINTENANCE_IDS } from "@/lib/mock/maintenance-requests";
import { TASK_IDS } from "@/lib/mock/tasks";
import { todayIso } from "@/lib/utils/date";
import type { Business, Deal, MaintenanceRequest, Project, Task } from "@/types";

import {
  applyTaskPatch,
  buildNewTask,
  buildTasksWithDetail,
  getTasksBoard,
  groupTasksByUrgency,
  resolveTaskContext,
  taskBelongsToBusiness,
  type BusinessTaskScope,
} from "./task-board";

const TODAY = "2026-03-29";
const audit = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Tarefa",
    status: "todo",
    waitingReason: null,
    priority: "normal",
    dueDate: TODAY,
    assigneeId: "sny",
    relatedEntityType: null,
    relatedEntityId: null,
    ...audit,
    ...overrides,
  };
}

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    name: "Negócio",
    industry: "Genérico",
    lifecycleStatus: "client",
    primaryContactId: null,
    location: "Leiria",
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

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    businessId: "biz-1",
    title: "Oportunidade",
    stage: "contacted",
    value: 500,
    responsibleUserId: "bino",
    nextAction: "Ligar",
    nextActionDate: "2026-03-30",
    lastInteractionDate: "2026-03-25",
    expectedCloseDate: null,
    ...audit,
    ...overrides,
  };
}

function makeMaintenanceRequest(overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
  return {
    id: "mnt-1",
    projectId: "proj-1",
    businessId: "biz-1",
    title: "Pedido",
    description: "Descrição",
    status: "todo",
    waitingReason: null,
    priority: "normal",
    responsibleUserId: null,
    requestedAt: "2026-01-01",
    dueDate: null,
    ...audit,
    ...overrides,
  };
}

const emptyContext = { businesses: [], projects: [], deals: [], maintenanceRequests: [] };

describe("resolveTaskContext", () => {
  it("resolve diretamente quando ligada a um Business", () => {
    const business = makeBusiness();
    const task = makeTask({ relatedEntityType: "business", relatedEntityId: business.id });

    expect(resolveTaskContext(task, { ...emptyContext, businesses: [business] })).toEqual({
      businessId: business.id,
      businessName: business.name,
      projectId: null,
      projectName: null,
    });
  });

  it("resolve via Project (businessId + projectId)", () => {
    const business = makeBusiness();
    const project = makeProject({ businessId: business.id });
    const task = makeTask({ relatedEntityType: "project", relatedEntityId: project.id });

    expect(
      resolveTaskContext(task, { ...emptyContext, businesses: [business], projects: [project] }),
    ).toEqual({
      businessId: business.id,
      businessName: business.name,
      projectId: project.id,
      projectName: project.name,
    });
  });

  it("resolve via Deal (só o negócio, sem project)", () => {
    const business = makeBusiness();
    const deal = makeDeal({ businessId: business.id });
    const task = makeTask({ relatedEntityType: "deal", relatedEntityId: deal.id });

    expect(
      resolveTaskContext(task, { ...emptyContext, businesses: [business], deals: [deal] }),
    ).toEqual({
      businessId: business.id,
      businessName: business.name,
      projectId: null,
      projectName: null,
    });
  });

  it("resolve via MaintenanceRequest (negócio + o project do pedido)", () => {
    const business = makeBusiness();
    const project = makeProject({ businessId: business.id });
    const request = makeMaintenanceRequest({ businessId: business.id, projectId: project.id });
    const task = makeTask({ relatedEntityType: "maintenance_request", relatedEntityId: request.id });

    expect(
      resolveTaskContext(task, {
        ...emptyContext,
        businesses: [business],
        projects: [project],
        maintenanceRequests: [request],
      }),
    ).toEqual({
      businessId: business.id,
      businessName: business.name,
      projectId: project.id,
      projectName: project.name,
    });
  });

  it("não resolve nada para uma Task sem relação", () => {
    expect(resolveTaskContext(makeTask(), emptyContext)).toEqual({
      businessId: null,
      businessName: null,
      projectId: null,
      projectName: null,
    });
  });

  it("não resolve nada para 'goal' (sem tabela de Goals ligada a Business nesta fase)", () => {
    const task = makeTask({ relatedEntityType: "goal", relatedEntityId: "goal-1" });
    expect(resolveTaskContext(task, emptyContext)).toEqual({
      businessId: null,
      businessName: null,
      projectId: null,
      projectName: null,
    });
  });

  it("ignora um relatedEntityId que não existe nos dados (integridade quebrada não rebenta)", () => {
    const task = makeTask({ relatedEntityType: "business", relatedEntityId: "biz-inexistente" });
    expect(resolveTaskContext(task, emptyContext)).toEqual({
      businessId: null,
      businessName: null,
      projectId: null,
      projectName: null,
    });
  });
});

describe("taskBelongsToBusiness (Round 5.1 — substitui taskIds congelados)", () => {
  const scope: BusinessTaskScope = {
    businessId: "biz-1",
    projectIds: ["proj-1", "proj-2"],
    dealIds: ["deal-1"],
    maintenanceRequestIds: ["mnt-1"],
  };

  it("uma Task ligada diretamente ao Business pertence — mesmo criada 'depois' de qualquer snapshot", () => {
    // O ponto central da correção: esta função nunca olha para uma lista de
    // taskIds pré-calculada — resolve estruturalmente, por isso uma Task
    // completamente nova, nunca vista antes, ainda assim resolve corretamente.
    const newTask = makeTask({
      id: "task-recem-criada",
      relatedEntityType: "business",
      relatedEntityId: "biz-1",
    });
    expect(taskBelongsToBusiness(newTask, scope)).toBe(true);
  });

  it("uma Task ligada a um Project do Business pertence", () => {
    const newTask = makeTask({ relatedEntityType: "project", relatedEntityId: "proj-2" });
    expect(taskBelongsToBusiness(newTask, scope)).toBe(true);
  });

  it("uma Task ligada a um Deal do Business pertence", () => {
    const task = makeTask({ relatedEntityType: "deal", relatedEntityId: "deal-1" });
    expect(taskBelongsToBusiness(task, scope)).toBe(true);
  });

  it("uma Task ligada a um MaintenanceRequest do Business pertence", () => {
    const task = makeTask({ relatedEntityType: "maintenance_request", relatedEntityId: "mnt-1" });
    expect(taskBelongsToBusiness(task, scope)).toBe(true);
  });

  it("uma Task de outro Business (Project/Deal/Business que não está no scope) nunca conta", () => {
    expect(
      taskBelongsToBusiness(makeTask({ relatedEntityType: "business", relatedEntityId: "biz-outro" }), scope),
    ).toBe(false);
    expect(
      taskBelongsToBusiness(makeTask({ relatedEntityType: "project", relatedEntityId: "proj-outro" }), scope),
    ).toBe(false);
    expect(
      taskBelongsToBusiness(makeTask({ relatedEntityType: "deal", relatedEntityId: "deal-outro" }), scope),
    ).toBe(false);
    expect(
      taskBelongsToBusiness(
        makeTask({ relatedEntityType: "maintenance_request", relatedEntityId: "mnt-outro" }),
        scope,
      ),
    ).toBe(false);
  });

  it("uma Task sem relação (ou 'goal') nunca conta", () => {
    expect(taskBelongsToBusiness(makeTask(), scope)).toBe(false);
    expect(
      taskBelongsToBusiness(makeTask({ relatedEntityType: "goal", relatedEntityId: "goal-1" }), scope),
    ).toBe(false);
  });
});

describe("buildTasksWithDetail", () => {
  it("aplica resolveTaskContext a cada Task da lista", () => {
    const business = makeBusiness();
    const tasks = [
      makeTask({ id: "t1", relatedEntityType: "business", relatedEntityId: business.id }),
      makeTask({ id: "t2" }),
    ];

    const result = buildTasksWithDetail(tasks, { ...emptyContext, businesses: [business] });

    expect(result.map((r) => r.businessName)).toEqual([business.name, null]);
  });
});

describe("groupTasksByUrgency", () => {
  function bucketOf(task: Task) {
    const buckets = groupTasksByUrgency([{ task, businessId: null, businessName: null, projectId: null, projectName: null }], TODAY);
    return (Object.keys(buckets) as (keyof typeof buckets)[]).find((key) => buckets[key].length > 0);
  }

  it("data no passado → overdue", () => {
    expect(bucketOf(makeTask({ dueDate: "2026-03-20" }))).toBe("overdue");
  });

  it("hoje → dueToday", () => {
    expect(bucketOf(makeTask({ dueDate: TODAY }))).toBe("dueToday");
  });

  it("dentro de 7 dias → dueSoon", () => {
    expect(bucketOf(makeTask({ dueDate: "2026-04-03" }))).toBe("dueSoon");
  });

  it("mais de 7 dias → future", () => {
    expect(bucketOf(makeTask({ dueDate: "2026-04-20" }))).toBe("future");
  });

  it("sem dueDate (backlog em aberto) → future", () => {
    expect(bucketOf(makeTask({ dueDate: null }))).toBe("future");
  });

  it("blocked com data no passado ainda conta como overdue (é nosso para desbloquear)", () => {
    expect(bucketOf(makeTask({ status: "blocked", dueDate: "2026-03-01" }))).toBe("overdue");
  });

  it("waiting_on_client NUNCA cai num bucket de data, mesmo com dueDate vencida", () => {
    const task = makeTask({
      status: "waiting_on_client",
      waitingReason: "photos",
      dueDate: "2026-01-01", // muito no passado
    });
    expect(bucketOf(task)).toBe("waitingOnClient");
  });

  it("Round 4.1: Task waiting_on_client + dueDate passada não é overdue, não conta em Atrasadas, e continua em À espera do cliente", () => {
    const item = {
      task: makeTask({ status: "waiting_on_client", waitingReason: "photos", dueDate: "2026-01-01" }),
      businessId: null,
      businessName: null,
      projectId: null,
      projectName: null,
    };

    const buckets = groupTasksByUrgency([item], TODAY);

    expect(buckets.overdue).toHaveLength(0);
    expect(buckets.overdue.some((i) => i.task.id === item.task.id)).toBe(false);
    expect(buckets.waitingOnClient.map((i) => i.task.id)).toEqual([item.task.id]);
  });

  it("done cai sempre em done, mesmo com dueDate vencida", () => {
    expect(bucketOf(makeTask({ status: "done", dueDate: "2026-01-01" }))).toBe("done");
  });

  it("ordena cada bucket de data por dueDate ascendente", () => {
    const items = [
      makeTask({ id: "late", dueDate: "2026-03-25" }),
      makeTask({ id: "early", dueDate: "2026-03-10" }),
    ].map((task) => ({ task, businessId: null, businessName: null, projectId: null, projectName: null }));

    const { overdue } = groupTasksByUrgency(items, TODAY);
    expect(overdue.map((i) => i.task.id)).toEqual(["early", "late"]);
  });

  it("waitingOnClient ordena pela mais antiga à espera primeiro (updatedAt ascendente)", () => {
    const items = [
      makeTask({
        id: "recent",
        status: "waiting_on_client",
        waitingReason: "photos",
        updatedAt: "2026-03-20T00:00:00.000Z",
      }),
      makeTask({
        id: "old",
        status: "waiting_on_client",
        waitingReason: "photos",
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ].map((task) => ({ task, businessId: null, businessName: null, projectId: null, projectName: null }));

    const { waitingOnClient } = groupTasksByUrgency(items, TODAY);
    expect(waitingOnClient.map((i) => i.task.id)).toEqual(["old", "recent"]);
  });

  it("done ordena pela mais recentemente concluída primeiro (updatedAt descendente)", () => {
    const items = [
      makeTask({ id: "old", status: "done", updatedAt: "2026-02-01T00:00:00.000Z" }),
      makeTask({ id: "recent", status: "done", updatedAt: "2026-03-20T00:00:00.000Z" }),
    ].map((task) => ({ task, businessId: null, businessName: null, projectId: null, projectName: null }));

    const { done } = groupTasksByUrgency(items, TODAY);
    expect(done.map((i) => i.task.id)).toEqual(["recent", "old"]);
  });
});

describe("buildNewTask", () => {
  const now = new Date("2026-03-29T10:00:00.000Z");

  it("cria uma Task válida com id gerado e datas de auditoria", () => {
    const task = buildNewTask(
      {
        title: "Nova tarefa",
        assigneeId: "sny",
        status: "todo",
        waitingReason: null,
        priority: "normal",
        dueDate: "2026-04-01",
        relatedEntityType: null,
        relatedEntityId: null,
      },
      now,
    );

    expect(task.id).toMatch(/^task-local-/);
    expect(task.title).toBe("Nova tarefa");
    expect(task.createdAt).toBe(now.toISOString());
    expect(task.updatedAt).toBe(now.toISOString());
  });

  it("limpa waitingReason quando o estado não é waiting_on_client, mesmo que o input traga um", () => {
    const task = buildNewTask(
      {
        title: "Nova tarefa",
        assigneeId: "sny",
        status: "todo",
        waitingReason: "photos",
        priority: "normal",
        dueDate: null,
        relatedEntityType: null,
        relatedEntityId: null,
      },
      now,
    );

    expect(task.waitingReason).toBeNull();
  });

  it("rejeita waiting_on_client sem motivo (invariante do schema)", () => {
    expect(() =>
      buildNewTask(
        {
          title: "Nova tarefa",
          assigneeId: "sny",
          status: "waiting_on_client",
          waitingReason: null,
          priority: "normal",
          dueDate: null,
          relatedEntityType: null,
          relatedEntityId: null,
        },
        now,
      ),
    ).toThrow();
  });

  it("aceita uma relação Business ou Project", () => {
    const task = buildNewTask(
      {
        title: "Nova tarefa",
        assigneeId: "bino",
        status: "todo",
        waitingReason: null,
        priority: "high",
        dueDate: null,
        relatedEntityType: "business",
        relatedEntityId: "biz-1",
      },
      now,
    );

    expect(task.relatedEntityType).toBe("business");
    expect(task.relatedEntityId).toBe("biz-1");
  });
});

describe("applyTaskPatch", () => {
  const now = new Date("2026-03-29T10:00:00.000Z");

  it("limpa waitingReason automaticamente ao sair de waiting_on_client", () => {
    const task = makeTask({ status: "waiting_on_client", waitingReason: "photos" });
    const patched = applyTaskPatch(task, { status: "todo" }, now);

    expect(patched.status).toBe("todo");
    expect(patched.waitingReason).toBeNull();
  });

  it("mantém waitingReason quando o patch não mexe no estado nem no motivo", () => {
    const task = makeTask({ status: "waiting_on_client", waitingReason: "approval" });
    const patched = applyTaskPatch(task, { title: "Título novo" }, now);

    expect(patched.status).toBe("waiting_on_client");
    expect(patched.waitingReason).toBe("approval");
    expect(patched.title).toBe("Título novo");
  });

  it("rejeita mudar para waiting_on_client sem motivo", () => {
    const task = makeTask({ status: "todo" });
    expect(() => applyTaskPatch(task, { status: "waiting_on_client" }, now)).toThrow();
  });

  it("permite mudar para waiting_on_client desde que o motivo venha no mesmo patch", () => {
    const task = makeTask({ status: "todo" });
    const patched = applyTaskPatch(
      task,
      { status: "waiting_on_client", waitingReason: "response" },
      now,
    );

    expect(patched.status).toBe("waiting_on_client");
    expect(patched.waitingReason).toBe("response");
  });

  it("atualiza updatedAt sempre que aplicado", () => {
    const task = makeTask({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const patched = applyTaskPatch(task, { priority: "high" }, now);
    expect(patched.updatedAt).toBe(now.toISOString());
  });

  it("permite trocar a relação de Deal para Business (D12: 'despromoção' ao editar)", () => {
    const task = makeTask({ relatedEntityType: "deal", relatedEntityId: "deal-9" });
    const patched = applyTaskPatch(task, { relatedEntityType: "business", relatedEntityId: "biz-9" }, now);

    expect(patched.relatedEntityType).toBe("business");
    expect(patched.relatedEntityId).toBe("biz-9");
  });
});

describe("getTasksBoard (integração com os dados mock)", () => {
  it("resolve o Business e o Project da tarefa-chave do Boi na Brasa", async () => {
    const board = await getTasksBoard(TEST_TODAY);
    const chasePhotos = board.find((item) => item.task.id === TASK_IDS.boiNaBrasaChasePhotos);

    expect(chasePhotos?.businessId).toBe(BUSINESS_IDS.boiNaBrasa);
    expect(chasePhotos?.businessName).toBe("Boi na Brasa");
    expect(chasePhotos?.projectName).toBeTruthy();
  });

  it("resolve o Business de uma tarefa ligada a um pedido de manutenção", async () => {
    const board = await getTasksBoard(TEST_TODAY);
    const maintenanceTask = board.find((item) => item.task.id === TASK_IDS.clinicaMaintenance);

    expect(maintenanceTask?.businessName).toBe("Clínica Dentária Sorriso");
  });

  it("inclui todas as 12 tarefas mock, cada uma exatamente uma vez", async () => {
    const board = await getTasksBoard(TEST_TODAY);
    expect(board).toHaveLength(Object.keys(TASK_IDS).length);
  });

  it("a tarefa waiting_on_client (Óptica) nunca aparece nos buckets de data, mesmo com groupTasksByUrgency", async () => {
    const board = await getTasksBoard(TEST_TODAY);
    const today = todayIso(TEST_TODAY);
    const buckets = groupTasksByUrgency(board, today);

    const inDateBuckets = [...buckets.overdue, ...buckets.dueToday, ...buckets.dueSoon, ...buckets.future].some(
      (item) => item.task.id === TASK_IDS.opticaWaiting,
    );
    expect(inDateBuckets).toBe(false);
    expect(buckets.waitingOnClient.some((item) => item.task.id === TASK_IDS.opticaWaiting)).toBe(true);
  });

  it("uma tarefa concluída deixa de aparecer em qualquer bucket de trabalho ativo", async () => {
    const board = await getTasksBoard(TEST_TODAY);
    const today = todayIso(TEST_TODAY);
    const buckets = groupTasksByUrgency(board, today);

    const activeBuckets = [
      ...buckets.overdue,
      ...buckets.dueToday,
      ...buckets.dueSoon,
      ...buckets.future,
      ...buckets.waitingOnClient,
    ];
    expect(activeBuckets.some((item) => item.task.id === TASK_IDS.autoformigalDone)).toBe(false);
    expect(buckets.done.some((item) => item.task.id === TASK_IDS.autoformigalDone)).toBe(true);
  });

  it(`inclui o pedido de manutenção ${MAINTENANCE_IDS.clinicaHorarios} apenas como contexto da task, não como item duplicado`, async () => {
    const board = await getTasksBoard(TEST_TODAY);
    // Garantia simples de que a resolução por maintenance_request não gera entradas fantasma.
    expect(board.filter((item) => item.task.id === TASK_IDS.clinicaMaintenance)).toHaveLength(1);
  });
});
