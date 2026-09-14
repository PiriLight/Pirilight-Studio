import { describe, expect, it } from "vitest";

import type { Business, Deal, MaintenanceRequest, Payment, Project, Renewal, Task } from "@/types";

import {
  ATTENTION_WINDOW_DAYS,
  buildAttentionItems,
  classifyUrgency,
  type AttentionInput,
} from "./attention-rules";

/**
 * Datas absolutas de propósito: estes testes nunca tocam na mock data nem no
 * relógio da máquina. `now` é 29 de março de 2026 — o dia da mudança para a
 * hora de verão em Portugal, o que dá de borla uma regressão contra erros de
 * fuso/DST na aritmética de datas.
 */
const NOW = new Date("2026-03-29T12:00:00Z");
const TODAY = "2026-03-29";

const business: Business = {
  id: "biz-1",
  name: "Negócio Teste",
  industry: "Testes",
  lifecycleStatus: "client",
  primaryContactId: null,
  location: "Leiria",
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const audit = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Tarefa",
    status: "todo",
    waitingReason: null,
    priority: "normal",
    dueDate: TODAY,
    assigneeId: "sny",
    relatedEntityType: "business",
    relatedEntityId: business.id,
    ...audit,
    ...overrides,
  };
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    businessId: business.id,
    title: "Oportunidade",
    stage: "contacted",
    value: 500,
    responsibleUserId: "bino",
    nextAction: "Ligar ao responsável",
    nextActionDate: TODAY,
    lastInteractionDate: "2026-03-27",
    expectedCloseDate: null,
    ...audit,
    ...overrides,
  };
}

function makeRenewal(overrides: Partial<Renewal> = {}): Renewal {
  return {
    id: "ren-1",
    projectId: "proj-1",
    type: "domain",
    cadence: "annual",
    dueDate: TODAY,
    amount: 18,
    status: "pending",
    ...audit,
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    businessId: business.id,
    projectId: null,
    totalValue: 400,
    amountReceived: 200,
    paymentStatus: "partial",
    expectedDate: TODAY,
    ...audit,
    ...overrides,
  };
}

function makeMaintenance(overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
  return {
    id: "mnt-1",
    projectId: "proj-1",
    businessId: business.id,
    title: "Pedido",
    description: "Descrição",
    status: "todo",
    waitingReason: null,
    priority: "normal",
    responsibleUserId: null,
    requestedAt: "2026-03-20",
    dueDate: TODAY,
    ...audit,
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    businessId: business.id,
    dealId: null,
    type: "website",
    name: "Projeto",
    status: "in_progress",
    waitingReason: null,
    startDate: "2026-01-10",
    launchDate: null,
    ...audit,
    ...overrides,
  };
}

function buildInput(overrides: Partial<AttentionInput> = {}): AttentionInput {
  return {
    businesses: [business],
    deals: [],
    projects: [makeProject()],
    tasks: [],
    renewals: [],
    payments: [],
    maintenanceRequests: [],
    ...overrides,
  };
}

describe("classifyUrgency", () => {
  it("classifica ontem como atrasado", () => {
    expect(classifyUrgency("2026-03-28", TODAY, 7)).toBe("overdue");
  });

  it("classifica hoje como due_today", () => {
    expect(classifyUrgency(TODAY, TODAY, 7)).toBe("due_today");
  });

  it("classifica amanhã como due_soon", () => {
    expect(classifyUrgency("2026-03-30", TODAY, 7)).toBe("due_soon");
  });

  it("inclui o último dia da janela e exclui o seguinte", () => {
    expect(classifyUrgency("2026-04-05", TODAY, 7)).toBe("due_soon"); // +7
    expect(classifyUrgency("2026-04-06", TODAY, 7)).toBeNull(); // +8
  });

  it("atravessa a mudança para a hora de verão sem perder um dia", () => {
    // 29 de março de 2026 é o dia em que Portugal muda para WEST.
    expect(classifyUrgency("2026-03-30", "2026-03-29", 7)).toBe("due_soon");
    expect(classifyUrgency("2026-03-29", "2026-03-28", 7)).toBe("due_soon");
  });
});

describe("estados terminais nunca geram atenção", () => {
  it("tarefa concluída com data passada não aparece", () => {
    const items = buildAttentionItems(
      buildInput({ tasks: [makeTask({ status: "done", dueDate: "2026-03-01" })] }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("deals ganhos ou perdidos não aparecem, mesmo com follow-up antigo", () => {
    const items = buildAttentionItems(
      buildInput({
        deals: [
          makeDeal({ id: "deal-won", stage: "won", nextActionDate: "2026-01-01" }),
          makeDeal({ id: "deal-lost", stage: "lost", nextActionDate: "2026-01-01" }),
        ],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("renovação cancelada ou já renovada não aparece", () => {
    const items = buildAttentionItems(
      buildInput({
        renewals: [
          makeRenewal({ id: "ren-cancelled", status: "cancelled", dueDate: "2026-03-01" }),
          makeRenewal({ id: "ren-renewed", status: "renewed", dueDate: "2026-03-01" }),
        ],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("pagamento totalmente pago não aparece, mesmo vencido", () => {
    const items = buildAttentionItems(
      buildInput({
        payments: [
          makePayment({
            paymentStatus: "paid",
            amountReceived: 400,
            expectedDate: "2026-02-01",
          }),
        ],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("pedido de manutenção concluído não aparece", () => {
    const items = buildAttentionItems(
      buildInput({
        maintenanceRequests: [makeMaintenance({ status: "done", dueDate: "2026-02-01" })],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });
});

describe("regras por tipo", () => {
  it("follow-up de ontem fica atrasado e o de hoje fica due_today", () => {
    const items = buildAttentionItems(
      buildInput({
        deals: [
          makeDeal({ id: "deal-ontem", nextActionDate: "2026-03-28" }),
          makeDeal({ id: "deal-hoje", nextActionDate: TODAY }),
        ],
      }),
      NOW,
    );

    expect(items.map((i) => [i.sourceId, i.urgency])).toEqual([
      ["deal-ontem", "overdue"],
      ["deal-hoje", "due_today"],
    ]);
  });

  it("renovação amanhã é due_soon e a 45 dias fica fora da janela", () => {
    const items = buildAttentionItems(
      buildInput({
        renewals: [
          makeRenewal({ id: "ren-amanha", dueDate: "2026-03-30" }),
          makeRenewal({ id: "ren-longe", dueDate: "2026-05-13" }),
        ],
      }),
      NOW,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.sourceId).toBe("ren-amanha");
    expect(items[0]?.urgency).toBe("due_soon");
  });

  it("renovação usa uma janela maior (30 dias) do que os restantes tipos", () => {
    expect(ATTENTION_WINDOW_DAYS.renewal).toBeGreaterThan(ATTENTION_WINDOW_DAYS.task);

    const items = buildAttentionItems(
      buildInput({ renewals: [makeRenewal({ dueDate: "2026-04-20" })] }), // +22 dias
      NOW,
    );
    expect(items[0]?.urgency).toBe("due_soon");
  });

  it("pagamento vencido com saldo fica atrasado", () => {
    const items = buildAttentionItems(
      buildInput({ payments: [makePayment({ expectedDate: "2026-03-20" })] }),
      NOW,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("payment");
    expect(items[0]?.urgency).toBe("overdue");
    expect(items[0]?.daysDelta).toBe(-9);
  });

  it("tarefa bloqueada com data passada é nossa, logo conta como atrasada", () => {
    const items = buildAttentionItems(
      buildInput({ tasks: [makeTask({ status: "blocked", dueDate: "2026-03-25" })] }),
      NOW,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.urgency).toBe("overdue");
  });

  it("tarefa sem data (backlog) nunca entra no feed", () => {
    const items = buildAttentionItems(buildInput({ tasks: [makeTask({ dueDate: null })] }), NOW);
    expect(items).toHaveLength(0);
  });
});

describe("stalled — só para o que está mesmo em aberto", () => {
  it("deal aberto, sem próxima ação e sem contacto há 21 dias fica stalled", () => {
    const items = buildAttentionItems(
      buildInput({
        deals: [
          makeDeal({
            stage: "negotiating",
            nextAction: null,
            nextActionDate: null,
            lastInteractionDate: "2026-03-08",
          }),
        ],
      }),
      NOW,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.urgency).toBe("stalled");
    expect(items[0]?.title).toContain("21 dias");
  });

  it("deal fechado e parado nunca fica stalled", () => {
    const items = buildAttentionItems(
      buildInput({
        deals: [
          makeDeal({
            stage: "lost",
            nextAction: null,
            nextActionDate: null,
            lastInteractionDate: "2026-01-01",
          }),
        ],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("deal sem próxima ação mas com contacto recente não fica stalled", () => {
    const items = buildAttentionItems(
      buildInput({
        deals: [
          makeDeal({ nextAction: null, nextActionDate: null, lastInteractionDate: "2026-03-25" }),
        ],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("um negócio parado, por si só, nunca gera item de atenção", () => {
    const items = buildAttentionItems(
      buildInput({
        businesses: [{ ...business, lifecycleStatus: "inactive", updatedAt: "2025-01-01T00:00:00.000Z" }],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("deal de um negócio inativo não gera follow-up", () => {
    const items = buildAttentionItems(
      buildInput({
        businesses: [{ ...business, lifecycleStatus: "inactive" }],
        deals: [makeDeal({ nextActionDate: "2026-03-01" })],
      }),
      NOW,
    );
    expect(items).toHaveLength(0);
  });

  it("pedido de manutenção aberto e sem data há 20 dias fica stalled", () => {
    const items = buildAttentionItems(
      buildInput({
        maintenanceRequests: [makeMaintenance({ dueDate: null, requestedAt: "2026-03-09" })],
      }),
      NOW,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.urgency).toBe("stalled");
  });
});

describe("ordenação determinística", () => {
  it("ordena por urgência, depois data, depois tipo, depois id", () => {
    const items = buildAttentionItems(
      buildInput({
        tasks: [
          makeTask({ id: "task-hoje", dueDate: TODAY }),
          makeTask({ id: "task-atrasada", dueDate: "2026-03-20" }),
          makeTask({ id: "task-breve", dueDate: "2026-04-02" }),
        ],
        deals: [
          makeDeal({ id: "deal-atrasado", nextActionDate: "2026-03-20" }),
          makeDeal({
            id: "deal-parado",
            nextAction: null,
            nextActionDate: null,
            lastInteractionDate: "2026-03-01",
          }),
        ],
      }),
      NOW,
    );

    expect(items.map((i) => i.sourceId)).toEqual([
      "task-atrasada", // overdue, 03-20, task antes de deal
      "deal-atrasado", // overdue, 03-20
      "task-hoje", // due_today
      "task-breve", // due_soon
      "deal-parado", // stalled
    ]);
  });

  it("não produz itens duplicados", () => {
    const items = buildAttentionItems(
      buildInput({
        deals: [makeDeal({ nextActionDate: "2026-03-01", lastInteractionDate: "2026-01-01" })],
      }),
      NOW,
    );

    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preenche id, daysDelta e o negócio associado", () => {
    const items = buildAttentionItems(
      buildInput({ tasks: [makeTask({ dueDate: "2026-03-26" })] }),
      NOW,
    );

    expect(items[0]).toMatchObject({
      id: "task:task-1",
      daysDelta: -3,
      businessId: "biz-1",
      businessName: "Negócio Teste",
      ownerId: "sny",
      href: "/tasks",
    });
  });
});
