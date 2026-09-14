import { describe, expect, it } from "vitest";

import { buildMockData, TEST_TODAY } from "@/lib/mock";
import { BUSINESS_IDS } from "@/lib/mock/businesses";
import { DEAL_IDS } from "@/lib/mock/deals";
import { TASK_IDS } from "@/lib/mock/tasks";
import type { Deal, MaintenanceRequest, Project, Task } from "@/types";

import {
  computeDealFollowUp,
  countActiveProjects,
  countOpenTasks,
  deriveBusinessOverallStatus,
  deriveNextAction,
  deriveResponsibleUserId,
  getBusinessOverview,
  getBusinessSummaries,
  getCommercialPipeline,
  pickOpenDeal,
  toFollowUpUrgency,
} from "./business-overview";

const audit = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

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

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Tarefa",
    status: "todo",
    waitingReason: null,
    priority: "normal",
    dueDate: "2026-03-29",
    assigneeId: "sny",
    relatedEntityType: "business",
    relatedEntityId: "biz-1",
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
    requestedAt: "2026-03-01",
    dueDate: "2026-03-29",
    ...audit,
    ...overrides,
  };
}

describe("deriveNextAction", () => {
  const TODAY = "2026-03-29";
  const noMaintenance: MaintenanceRequest[] = [];

  it("uma Task atrasada vence uma data futura do Deal — sem prioridade artificial por tipo", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: "2026-04-28" })], // +30 dias, "future"
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({ nextActionDate: "2026-03-27" }), // -2 dias, overdue
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("deal");
    expect(action.urgency).toBe("overdue");
  });

  it("uma Task para hoje vence um Deal a 3 dias", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: TODAY })],
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({ nextActionDate: "2026-04-01" }), // +3 dias, due_soon
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("task");
    expect(action.urgency).toBe("due_today");
  });

  it("entre dois atrasados, vence o mais antigo — mesmo sendo o Deal", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: "2026-03-28" })], // -1 dia
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({ nextActionDate: "2026-03-25" }), // -4 dias, mais antigo
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("deal");
    expect(action.daysDelta).toBe(-4);
  });

  it("um Deal parado há 20 dias vence uma Task a 30 dias — 'stalled' não fica escondido atrás de 'future'", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: "2026-04-28" })], // +30 dias, future
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({
          nextAction: null,
          nextActionDate: null,
          lastInteractionDate: "2026-03-09", // 20 dias sem contacto
        }),
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("deal");
    expect(action.urgency).toBe("stalled");
  });

  it("uma Task a 5 dias (due_soon) vence um Deal 'stalled' há 20 dias", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: "2026-04-03" })], // +5 dias, due_soon (≤7)
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({
          nextAction: null,
          nextActionDate: null,
          lastInteractionDate: "2026-03-09",
        }),
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("task");
    expect(action.urgency).toBe("due_soon");
  });

  it("entre duas datas futuras distantes, vence a mais próxima", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: "2026-04-28" })], // +30 dias
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({ nextActionDate: "2026-04-10" }), // +12 dias — mais próximo
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("deal");
    expect(action.urgency).toBe("future");
    expect(action.daysDelta).toBe(12);
  });

  it("uma Task waiting_on_client não conta como trabalho nosso", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ status: "waiting_on_client", waitingReason: "photos", dueDate: "2026-03-20" })],
        maintenanceRequests: noMaintenance,
        openDeal: null,
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("none");
  });

  it("um Business inactive não gera candidato a partir do Deal", () => {
    const action = deriveNextAction(
      {
        tasks: [],
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({ nextActionDate: "2026-03-20" }),
        lifecycleStatus: "inactive",
      },
      TODAY,
    );
    expect(action.source).toBe("none");
  });

  it("um MaintenanceRequest aberto há muito tempo, sem data, entra como stalled", () => {
    const action = deriveNextAction(
      {
        tasks: [],
        maintenanceRequests: [
          makeMaintenanceRequest({ dueDate: null, requestedAt: "2026-03-09" }), // 20 dias
        ],
        openDeal: null,
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("maintenance");
    expect(action.urgency).toBe("stalled");
  });

  it("sem nenhum candidato, devolve 'Sem ações pendentes'", () => {
    const action = deriveNextAction(
      { tasks: [], maintenanceRequests: noMaintenance, openDeal: null, lifecycleStatus: "client" },
      TODAY,
    );
    expect(action).toEqual({
      source: "none",
      title: "Sem ações pendentes",
      date: null,
      urgency: null,
      daysDelta: null,
    });
  });

  it("Round 5: sem openDeal/lifecycleStatus (escopo Project), nunca gera candidato de Deal", () => {
    const action = deriveNextAction(
      { tasks: [makeTask({ dueDate: "2026-04-28" })], maintenanceRequests: noMaintenance },
      TODAY,
    );
    expect(action.source).toBe("task");
  });

  it("caso de regressão: Boi na Brasa deve ter uma próxima ação real, não 'Sem ações pendentes'", async () => {
    const overview = await getBusinessOverview(BUSINESS_IDS.boiNaBrasa, TEST_TODAY);
    expect(overview?.nextAction.source).toBe("task");
    expect(overview?.nextAction.urgency).toBe("overdue");
    // é literalmente a Task "Insistir pelas fotografias", ligada ao projeto
    // waiting_on_client — não o projeto em si.
    expect(overview?.tasks.some((t) => t.id === TASK_IDS.boiNaBrasaChasePhotos)).toBe(true);
  });

  it("Round 5.2 — caso de regressão: uma Task aberta sem dueDate nunca é 'Sem ações pendentes' (caso Café Central)", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: null, status: "todo" })],
        maintenanceRequests: noMaintenance,
        openDeal: null,
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("task");
    expect(action.title).toBe("Tarefa");
    expect(action.urgency).toBe("no_date");
    expect(action.date).toBeNull();
    expect(action.daysDelta).toBeNull();
  });

  it("Round 5.2 — uma Task sem data tem prioridade inferior a qualquer trabalho com data ou stalled", () => {
    const withDatedDeal = deriveNextAction(
      {
        tasks: [makeTask({ id: "sem-data", dueDate: null })],
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({ nextActionDate: "2026-04-28" }), // +30 dias, "future" — ainda tem data
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(withDatedDeal.source).toBe("deal"); // "future" (tem data) vence "no_date"

    const withStalledDeal = deriveNextAction(
      {
        tasks: [makeTask({ id: "sem-data", dueDate: null })],
        maintenanceRequests: noMaintenance,
        openDeal: makeDeal({
          nextAction: null,
          nextActionDate: null,
          lastInteractionDate: "2026-03-09", // 20 dias sem contacto → stalled
        }),
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(withStalledDeal.source).toBe("deal"); // stalled vence "no_date"
  });

  it("Round 5.2 — uma Task sem data continua a vencer 'Sem ações pendentes'", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ dueDate: null })],
        maintenanceRequests: noMaintenance,
        openDeal: null,
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).not.toBe("none");
  });

  it("Round 5.2 — uma Task waiting_on_client sem data continua excluída (não vira 'no_date')", () => {
    const action = deriveNextAction(
      {
        tasks: [makeTask({ status: "waiting_on_client", waitingReason: "content", dueDate: null })],
        maintenanceRequests: noMaintenance,
        openDeal: null,
        lifecycleStatus: "client",
      },
      TODAY,
    );
    expect(action.source).toBe("none");
  });
});

describe("toFollowUpUrgency (Round 5.2)", () => {
  it("'future' e 'no_date' não têm cor de urgência própria — ambos viram null", () => {
    expect(toFollowUpUrgency("future")).toBeNull();
    expect(toFollowUpUrgency("no_date")).toBeNull();
  });

  it("os 4 valores partilhados com Urgency passam tal e qual", () => {
    expect(toFollowUpUrgency("overdue")).toBe("overdue");
    expect(toFollowUpUrgency("due_today")).toBe("due_today");
    expect(toFollowUpUrgency("due_soon")).toBe("due_soon");
    expect(toFollowUpUrgency("stalled")).toBe("stalled");
  });

  it("null continua null", () => {
    expect(toFollowUpUrgency(null)).toBeNull();
  });
});

describe("countActiveProjects / countOpenTasks (Round 5.1 — reaproveitadas ao vivo em Clientes)", () => {
  it("countActiveProjects reage a uma mudança de estado de in_progress para done", () => {
    const projects = [makeProject({ status: "in_progress" })];
    expect(countActiveProjects(projects)).toBe(1);

    const afterUpdate = [{ ...projects[0]!, status: "done" as const }];
    expect(countActiveProjects(afterUpdate)).toBe(0);
  });

  it("countOpenTasks reage a uma Task passar de todo para done", () => {
    const tasks = [makeTask({ status: "todo" })];
    expect(countOpenTasks(tasks)).toBe(1);

    const afterUpdate = [{ ...tasks[0]!, status: "done" as const }];
    expect(countOpenTasks(afterUpdate)).toBe(0);
  });

  it("countOpenTasks reage à criação de uma Task nova (sem depender de nenhum snapshot anterior)", () => {
    const before = [makeTask({ id: "t1", status: "todo" })];
    expect(countOpenTasks(before)).toBe(1);

    const afterCreate = [...before, makeTask({ id: "t2-nova", status: "todo" })];
    expect(countOpenTasks(afterCreate)).toBe(2);
  });

  it("countOpenTasks exclui waiting_on_client tal como done", () => {
    const tasks = [
      makeTask({ id: "t1", status: "waiting_on_client", waitingReason: "content" }),
      makeTask({ id: "t2", status: "done" }),
      makeTask({ id: "t3", status: "in_progress" }),
    ];
    expect(countOpenTasks(tasks)).toBe(1);
  });
});

describe("deriveBusinessOverallStatus", () => {
  const noTasks: Task[] = [];
  const noMaintenance: MaintenanceRequest[] = [];

  it("um bloqueio pesa mais do que qualquer outro estado", () => {
    expect(
      deriveBusinessOverallStatus({
        projects: [makeProject({ status: "in_progress" }), makeProject({ id: "p2", status: "blocked" })],
        tasks: noTasks,
        maintenanceRequests: noMaintenance,
      }),
    ).toBe("blocked");
  });

  it("à espera do cliente pesa mais do que em progresso", () => {
    expect(
      deriveBusinessOverallStatus({
        projects: [
          makeProject({ status: "in_progress" }),
          makeProject({ id: "p2", status: "waiting_on_client" }),
        ],
        tasks: noTasks,
        maintenanceRequests: noMaintenance,
      }),
    ).toBe("waiting_on_client");
  });

  it("tudo concluído dá 'done'", () => {
    expect(
      deriveBusinessOverallStatus({
        projects: [makeProject({ status: "done" })],
        tasks: noTasks,
        maintenanceRequests: noMaintenance,
      }),
    ).toBe("done");
  });

  it("sem projetos, tasks nem pedidos dá 'none'", () => {
    expect(
      deriveBusinessOverallStatus({ projects: [], tasks: noTasks, maintenanceRequests: noMaintenance }),
    ).toBe("none");
  });

  it("Round 5: uma Task waiting_on_client sem projetos abertos já não é 'Sem trabalho ativo' — é 'waiting_on_client'", () => {
    // Caso real: Óptica Visão Clara não tem nenhum projeto, mas tem uma Task
    // waiting_on_client ativa. Antes desta correção o resultado seria 'none'
    // (lido como "Sem trabalho ativo"), o que contradiz o princípio central —
    // há mesmo alguma coisa a acontecer, só que não depende de nós agora.
    expect(
      deriveBusinessOverallStatus({
        projects: [],
        tasks: [makeTask({ status: "waiting_on_client", waitingReason: "content" })],
        maintenanceRequests: noMaintenance,
      }),
    ).toBe("waiting_on_client");
  });

  it("Round 5: um MaintenanceRequest bloqueado pesa mesmo sem nenhum Project bloqueado", () => {
    expect(
      deriveBusinessOverallStatus({
        projects: [makeProject({ status: "in_progress" })],
        tasks: noTasks,
        maintenanceRequests: [makeMaintenanceRequest({ status: "blocked" })],
      }),
    ).toBe("blocked");
  });

  it("Round 5: caso real — a Óptica Visão Clara deixa de mostrar 'Sem trabalho ativo'", async () => {
    const overview = await getBusinessOverview(BUSINESS_IDS.optica, TEST_TODAY);
    expect(overview?.projects).toHaveLength(0);
    expect(overview?.overallStatus).toBe("waiting_on_client");
  });
});

describe("deriveResponsibleUserId / pickOpenDeal", () => {
  it("escolhe o deal atualizado mais recentemente", () => {
    const deals = [
      makeDeal({ id: "d1", responsibleUserId: "sny", updatedAt: "2026-01-01T00:00:00.000Z" }),
      makeDeal({ id: "d2", responsibleUserId: "bino", updatedAt: "2026-03-01T00:00:00.000Z" }),
    ];
    expect(deriveResponsibleUserId(deals)).toBe("bino");
  });

  it("sem deals devolve null", () => {
    expect(deriveResponsibleUserId([])).toBeNull();
  });

  it("pickOpenDeal ignora deals fechados", () => {
    const deals = [
      makeDeal({ id: "d1", stage: "won", updatedAt: "2026-03-05T00:00:00.000Z" }),
      makeDeal({ id: "d2", stage: "negotiating", updatedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(pickOpenDeal(deals)?.id).toBe("d2");
  });

  it("sem deals abertos devolve null mesmo havendo deals fechados", () => {
    expect(pickOpenDeal([makeDeal({ stage: "lost" })])).toBeNull();
  });
});

describe("computeDealFollowUp", () => {
  const TODAY = "2026-03-29";

  it("deal fechado nunca tem urgência", () => {
    expect(computeDealFollowUp(makeDeal({ stage: "won", nextActionDate: "2026-01-01" }), TODAY)).toEqual(
      { urgency: null, daysDelta: null },
    );
  });

  it("mostra sempre o daysDelta quando há data, mesmo fora da janela de 7 dias", () => {
    const result = computeDealFollowUp(makeDeal({ nextActionDate: "2026-04-18" }), TODAY); // +20
    expect(result.urgency).toBeNull();
    expect(result.daysDelta).toBe(20);
  });

  it("dentro da janela devolve a urgência real", () => {
    expect(computeDealFollowUp(makeDeal({ nextActionDate: "2026-03-29" }), TODAY).urgency).toBe(
      "due_today",
    );
  });

  it("sem próxima ação e sem contacto recente fica stalled", () => {
    const result = computeDealFollowUp(
      makeDeal({ nextAction: null, nextActionDate: null, lastInteractionDate: "2026-03-08" }),
      TODAY,
    );
    expect(result.urgency).toBe("stalled");
  });

  it("sem próxima ação mas com contacto recente não tem urgência", () => {
    const result = computeDealFollowUp(
      makeDeal({ nextAction: null, nextActionDate: null, lastInteractionDate: "2026-03-27" }),
      TODAY,
    );
    expect(result).toEqual({ urgency: null, daysDelta: null });
  });
});

describe("sobre a mock real", () => {
  const data = buildMockData(TEST_TODAY);

  it("getCommercialPipeline inclui todos os deals, incluindo ganhos e perdidos", async () => {
    const cards = await getCommercialPipeline(TEST_TODAY);
    expect(cards).toHaveLength(data.deals.length);
    expect(cards.some((c) => c.deal.stage === "won")).toBe(true);
    expect(cards.some((c) => c.deal.stage === "lost")).toBe(true);
  });

  it("getBusinessSummaries devolve exatamente um resumo por negócio", async () => {
    const summaries = await getBusinessSummaries(data.businesses, TEST_TODAY);
    expect(summaries).toHaveLength(data.businesses.length);
  });

  it("o resumo do Boi na Brasa reflete a espera por fotografias e o pagamento parcial", async () => {
    const [summary] = await getBusinessSummaries(
      data.businesses.filter((b) => b.id === BUSINESS_IDS.boiNaBrasa),
      TEST_TODAY,
    );
    expect(summary).toMatchObject({
      overallStatus: "waiting_on_client",
      hasWebsite: true,
      hasPiriCard: true,
    });
    expect(summary?.paymentSummary.remainingValue).toBeGreaterThan(0);
    expect(summary?.nextRenewal).not.toBeNull();
  });

  it("getBusinessOverview devolve null para um id inexistente", async () => {
    expect(await getBusinessOverview("biz-inexistente", TEST_TODAY)).toBeNull();
  });

  it("getBusinessOverview do Talho do Bairro mostra o projeto bloqueado e o pagamento em atraso", async () => {
    const overview = await getBusinessOverview(BUSINESS_IDS.talho, TEST_TODAY);
    expect(overview).not.toBeNull();
    expect(overview?.overallStatus).toBe("blocked");
    expect(overview?.paymentSummary.hasOverdue).toBe(true);
    expect(overview?.openDeal).toBeNull(); // o único deal do Talho está 'lost'
    expect(overview?.deals.map((d) => d.id)).toContain(DEAL_IDS.talhoLost);
  });

  it("os projetos do overview já vêm com o detalhe (website/piricard) junto", async () => {
    const overview = await getBusinessOverview(BUSINESS_IDS.boiNaBrasa, TEST_TODAY);
    const websiteProject = overview?.projects.find((p) => p.project.type === "website");
    const cardProject = overview?.projects.find((p) => p.project.type === "piricard");

    expect(websiteProject?.website).not.toBeNull();
    expect(websiteProject?.piriCard).toBeNull();
    expect(cardProject?.piriCard).not.toBeNull();
  });
});
