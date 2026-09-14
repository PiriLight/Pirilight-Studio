import { describe, expect, it } from "vitest";

import type { MaintenanceRequest } from "@/types";

import {
  applyMaintenanceRequestPatch,
  applyMaintenanceRequestStatus,
  buildNewMaintenanceRequest,
  classifyMaintenanceTiming,
  countBlockedMaintenanceRequests,
  groupMaintenanceByTiming,
} from "./maintenance-board";

const audit = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const TODAY = "2026-03-29";

function makeRequest(overrides: Partial<MaintenanceRequest> = {}): MaintenanceRequest {
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
    dueDate: TODAY,
    ...audit,
    ...overrides,
  };
}

function makeRow(overrides: Partial<MaintenanceRequest> = {}) {
  return {
    request: makeRequest(overrides),
    project: { id: "proj-1" } as never,
    business: { id: "biz-1" } as never,
  };
}

describe("classifyMaintenanceTiming — precedência (secção 8 do Round 9)", () => {
  it("waiting_on_client nunca é lido como atraso, mesmo com dueDate no passado", () => {
    expect(classifyMaintenanceTiming({ status: "waiting_on_client", dueDate: "2026-01-01" }, TODAY)).toBe(
      "waiting_on_client",
    );
  });

  it("done nunca reaparece como pendente, por muito antigo que seja", () => {
    expect(classifyMaintenanceTiming({ status: "done", dueDate: "2020-01-01" }, TODAY)).toBe("done");
  });

  it("dueDate no passado e status aberto → overdue", () => {
    expect(classifyMaintenanceTiming({ status: "todo", dueDate: "2026-03-20" }, TODAY)).toBe("overdue");
  });

  it("dueDate hoje → today", () => {
    expect(classifyMaintenanceTiming({ status: "in_progress", dueDate: TODAY }, TODAY)).toBe("today");
  });

  it("blocked E atrasado → overdue (a data manda quando já é urgente), badge fica à parte", () => {
    expect(classifyMaintenanceTiming({ status: "blocked", dueDate: "2026-03-20" }, TODAY)).toBe("overdue");
  });

  it("blocked E para hoje → today", () => {
    expect(classifyMaintenanceTiming({ status: "blocked", dueDate: TODAY }, TODAY)).toBe("today");
  });

  it("blocked sem estar atrasado/hoje → blocked, mesmo com prazo no futuro", () => {
    expect(classifyMaintenanceTiming({ status: "blocked", dueDate: "2026-04-30" }, TODAY)).toBe("blocked");
  });

  it("blocked sem dueDate → blocked (não vira 'sem prazo')", () => {
    expect(classifyMaintenanceTiming({ status: "blocked", dueDate: null }, TODAY)).toBe("blocked");
  });

  it("aberto, não bloqueado, sem dueDate → no_date, nunca overdue", () => {
    expect(classifyMaintenanceTiming({ status: "todo", dueDate: null }, TODAY)).toBe("no_date");
  });

  it("dueDate dentro de 7 dias → due_soon", () => {
    expect(classifyMaintenanceTiming({ status: "todo", dueDate: "2026-04-03" }, TODAY)).toBe("due_soon");
  });

  it("dueDate além de 7 dias → future", () => {
    expect(classifyMaintenanceTiming({ status: "todo", dueDate: "2026-04-30" }, TODAY)).toBe("future");
  });
});

describe("groupMaintenanceByTiming", () => {
  it("separa cada pedido em exatamente um balde, sem duplicação", () => {
    const rows = [
      makeRow({ id: "r-overdue", status: "todo", dueDate: "2026-03-20" }),
      makeRow({ id: "r-today", status: "todo", dueDate: TODAY }),
      makeRow({ id: "r-blocked", status: "blocked", dueDate: "2026-04-30" }),
      makeRow({ id: "r-blocked-overdue", status: "blocked", dueDate: "2026-03-01" }),
      makeRow({ id: "r-soon", status: "todo", dueDate: "2026-04-02" }),
      makeRow({ id: "r-future", status: "todo", dueDate: "2026-05-01" }),
      makeRow({ id: "r-no-date", status: "todo", dueDate: null }),
      makeRow({ id: "r-waiting", status: "waiting_on_client", waitingReason: "photos", dueDate: "2026-01-01" }),
      makeRow({ id: "r-done", status: "done", dueDate: "2020-01-01" }),
    ];

    const buckets = groupMaintenanceByTiming(rows, TODAY);

    expect(buckets.overdue.map((r) => r.request.id)).toEqual(["r-blocked-overdue", "r-overdue"]);
    expect(buckets.dueToday.map((r) => r.request.id)).toEqual(["r-today"]);
    expect(buckets.blocked.map((r) => r.request.id)).toEqual(["r-blocked"]);
    expect(buckets.dueSoon.map((r) => r.request.id)).toEqual(["r-soon"]);
    expect(buckets.future.map((r) => r.request.id)).toEqual(["r-future"]);
    expect(buckets.noDate.map((r) => r.request.id)).toEqual(["r-no-date"]);
    expect(buckets.waitingOnClient.map((r) => r.request.id)).toEqual(["r-waiting"]);
    expect(buckets.done.map((r) => r.request.id)).toEqual(["r-done"]);

    const total = Object.values(buckets).reduce((sum, bucket) => sum + bucket.length, 0);
    expect(total).toBe(rows.length);
  });
});

describe("countBlockedMaintenanceRequests", () => {
  it("conta todos os blocked, independentemente do balde visual (secção 8 do Round 9)", () => {
    const rows = [
      makeRow({ id: "r-blocked-future", status: "blocked", dueDate: "2026-05-01" }),
      makeRow({ id: "r-blocked-overdue", status: "blocked", dueDate: "2026-01-01" }),
      makeRow({ id: "r-open", status: "todo", dueDate: TODAY }),
    ];
    expect(countBlockedMaintenanceRequests(rows)).toBe(2);
  });
});

describe("buildNewMaintenanceRequest", () => {
  it("cria um pedido válido, com businessId derivado do Project (nunca livre)", () => {
    const request = buildNewMaintenanceRequest(
      {
        projectId: "proj-1",
        businessId: "biz-1",
        title: "Novo pedido",
        description: "Detalhe",
        status: "todo",
        waitingReason: null,
        priority: "high",
        responsibleUserId: "bino",
        requestedAt: "2026-03-01",
        dueDate: "2026-03-10",
      },
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(request.projectId).toBe("proj-1");
    expect(request.businessId).toBe("biz-1");
    expect(request.responsibleUserId).toBe("bino");
    expect(request.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("limpa waitingReason se o status não for waiting_on_client, mesmo que o input o traga", () => {
    const request = buildNewMaintenanceRequest({
      projectId: "proj-1",
      businessId: "biz-1",
      title: "Pedido",
      description: "Detalhe",
      status: "todo",
      waitingReason: "photos",
      priority: "normal",
      responsibleUserId: null,
      requestedAt: "2026-03-01",
      dueDate: null,
    });
    expect(request.waitingReason).toBeNull();
  });

  it("rejeita waiting_on_client sem motivo — invariante partilhada", () => {
    expect(() =>
      buildNewMaintenanceRequest({
        projectId: "proj-1",
        businessId: "biz-1",
        title: "Pedido",
        description: "Detalhe",
        status: "waiting_on_client",
        waitingReason: null,
        priority: "normal",
        responsibleUserId: null,
        requestedAt: "2026-03-01",
        dueDate: null,
      }),
    ).toThrow();
  });
});

describe("applyMaintenanceRequestPatch / applyMaintenanceRequestStatus", () => {
  it("aplica um patch parcial e atualiza updatedAt", () => {
    const request = makeRequest({ title: "Original" });
    const patched = applyMaintenanceRequestPatch(request, { title: "Novo título" }, new Date("2026-04-01T00:00:00.000Z"));

    expect(patched.title).toBe("Novo título");
    expect(patched.description).toBe(request.description);
    expect(patched.updatedAt).toBe("2026-04-01T00:00:00.000Z");
  });

  it("entrar em waiting_on_client exige um motivo (ou herda o já existente)", () => {
    const request = makeRequest({ status: "todo", waitingReason: null });
    const patched = applyMaintenanceRequestStatus(request, "waiting_on_client", "approval");

    expect(patched.status).toBe("waiting_on_client");
    expect(patched.waitingReason).toBe("approval");
  });

  it("sair de waiting_on_client limpa sempre waitingReason", () => {
    const request = makeRequest({ status: "waiting_on_client", waitingReason: "payment" });
    const patched = applyMaintenanceRequestStatus(request, "in_progress", null);

    expect(patched.status).toBe("in_progress");
    expect(patched.waitingReason).toBeNull();
  });

  it("bloquear não altera waitingReason a não ser limpá-lo", () => {
    const request = makeRequest({ status: "waiting_on_client", waitingReason: "content" });
    const patched = applyMaintenanceRequestStatus(request, "blocked", null);

    expect(patched.status).toBe("blocked");
    expect(patched.waitingReason).toBeNull();
  });
});
