import { describe, expect, it } from "vitest";

import { buildMockData, TEST_TODAY } from "@/lib/mock";
import { BUSINESS_IDS } from "@/lib/mock/businesses";
import { PROJECT_IDS } from "@/lib/mock/projects";
import { RENEWAL_IDS } from "@/lib/mock/renewals";
import { todayIso } from "@/lib/utils/date";
import type { Business, Deal, Project, Renewal, RenewalListRow } from "@/types";

import { deriveResponsibleUserId } from "./business-overview";
import {
  applyRenewalPatch,
  applyRenewalStatus,
  buildNewRenewal,
  buildRenewalListRow,
  classifyRenewalTiming,
  getNextPendingRenewalForProjects,
  getRenewalsBoard,
  groupRenewalsByTiming,
} from "./renewal-board";

const TODAY = "2026-03-29";
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

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    businessId: "biz-1",
    title: "Oportunidade",
    stage: "won",
    value: 500,
    responsibleUserId: "bino",
    nextAction: null,
    nextActionDate: null,
    lastInteractionDate: "2026-03-25",
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
    amount: 20,
    status: "pending",
    ...audit,
    ...overrides,
  };
}

function makeRow(overrides: {
  renewal?: Partial<Renewal>;
  project?: Partial<Project>;
  business?: Partial<Business>;
  responsibleUserId?: string | null;
} = {}): RenewalListRow {
  const renewal = makeRenewal(overrides.renewal);
  const project = makeProject(overrides.project);
  const business = makeBusiness(overrides.business);
  return buildRenewalListRow(renewal, project, business, overrides.responsibleUserId ?? null, TODAY);
}

describe("classifyRenewalTiming", () => {
  it("1. pending com dueDate ontem → overdue", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: "2026-03-28" }), TODAY)).toBe("overdue");
  });

  it("2. pending hoje → due_today", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: TODAY }), TODAY)).toBe("due_today");
  });

  it("3. pending amanhã → due_soon", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: "2026-03-30" }), TODAY)).toBe("due_soon");
  });

  it("4. pending daqui a 7 dias → due_soon", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: "2026-04-05" }), TODAY)).toBe("due_soon");
  });

  it("5. pending daqui a 8 dias → upcoming", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: "2026-04-06" }), TODAY)).toBe("upcoming");
  });

  it("6. pending daqui a 30 dias → upcoming", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: "2026-04-28" }), TODAY)).toBe("upcoming");
  });

  it("7. pending para além de 30 dias → future", () => {
    expect(classifyRenewalTiming(makeRenewal({ dueDate: "2026-04-29" }), TODAY)).toBe("future");
  });

  it("8. renewed com data passada → NÃO overdue (null)", () => {
    expect(classifyRenewalTiming(makeRenewal({ status: "renewed", dueDate: "2026-01-01" }), TODAY)).toBeNull();
  });

  it("9. cancelled com data passada → NÃO overdue (null)", () => {
    expect(classifyRenewalTiming(makeRenewal({ status: "cancelled", dueDate: "2026-01-01" }), TODAY)).toBeNull();
  });
});

describe("groupRenewalsByTiming", () => {
  it("10. pending atrasada aparece apenas em overdue", () => {
    const row = makeRow({ renewal: { id: "r1", dueDate: "2026-03-01" } });
    const buckets = groupRenewalsByTiming([row], TODAY);

    expect(buckets.overdue.map((r) => r.renewal.id)).toEqual(["r1"]);
    expect(buckets.dueToday).toHaveLength(0);
    expect(buckets.dueSoon).toHaveLength(0);
    expect(buckets.upcoming).toHaveLength(0);
    expect(buckets.sixtyDays).toHaveLength(0);
    expect(buckets.later).toHaveLength(0);
    expect(buckets.renewed).toHaveLength(0);
    expect(buckets.cancelled).toHaveLength(0);
  });

  it("11. renewed aparece apenas em renewed, mesmo com dueDate vencida", () => {
    const row = makeRow({ renewal: { id: "r1", status: "renewed", dueDate: "2026-01-01" } });
    const buckets = groupRenewalsByTiming([row], TODAY);

    expect(buckets.renewed.map((r) => r.renewal.id)).toEqual(["r1"]);
    expect(buckets.overdue).toHaveLength(0);
  });

  it("12. cancelled aparece apenas em cancelled, mesmo com dueDate vencida", () => {
    const row = makeRow({ renewal: { id: "r1", status: "cancelled", dueDate: "2026-01-01" } });
    const buckets = groupRenewalsByTiming([row], TODAY);

    expect(buckets.cancelled.map((r) => r.renewal.id)).toEqual(["r1"]);
    expect(buckets.overdue).toHaveLength(0);
  });

  it("13. grupos pending ordenam por dueDate ascendente", () => {
    const rows = [
      makeRow({ renewal: { id: "late", dueDate: "2026-04-25" } }),
      makeRow({ renewal: { id: "early", dueDate: "2026-04-10" } }),
    ];
    const buckets = groupRenewalsByTiming(rows, TODAY);
    expect(buckets.upcoming.map((r) => r.renewal.id)).toEqual(["early", "late"]);
  });

  it("desempate estável por Business, depois Project, depois id, dentro do mesmo dueDate", () => {
    const rows = [
      makeRow({
        renewal: { id: "z", dueDate: "2026-04-10" },
        business: { name: "Zoo" },
        project: { name: "Website" },
      }),
      makeRow({
        renewal: { id: "a", dueDate: "2026-04-10" },
        business: { name: "Alfa" },
        project: { name: "Website" },
      }),
    ];
    const buckets = groupRenewalsByTiming(rows, TODAY);
    expect(buckets.upcoming.map((r) => r.renewal.id)).toEqual(["a", "z"]);
  });

  it("secção 11 — a hierarquia da lista tem 2 baldes extra além do RenewalTiming: 'Próximos 60 dias' e 'Mais tarde'", () => {
    // 45 dias: além de 30 (não é 'upcoming'), mas dentro de 60 — "Próximos 60 dias".
    const within60 = makeRow({ renewal: { id: "within-60", dueDate: "2026-05-13" } });
    // 90 dias: além de 60 — "Mais tarde".
    const beyond60 = makeRow({ renewal: { id: "beyond-60", dueDate: "2026-06-27" } });

    const buckets = groupRenewalsByTiming([within60, beyond60], TODAY);

    expect(buckets.sixtyDays.map((r) => r.renewal.id)).toEqual(["within-60"]);
    expect(buckets.later.map((r) => r.renewal.id)).toEqual(["beyond-60"]);
  });
});

describe("buildRenewalListRow", () => {
  it("junta Renewal + Project + Business + responsável (já derivado, não um campo da Renewal)", () => {
    const business = makeBusiness({ id: "biz-x" });
    const project = makeProject({ id: "proj-x", businessId: "biz-x" });
    const renewal = makeRenewal({ id: "ren-x", projectId: "proj-x" });
    const deals = [
      makeDeal({ id: "d1", businessId: "biz-x", responsibleUserId: "sny", updatedAt: "2026-01-01T00:00:00.000Z" }),
      makeDeal({ id: "d2", businessId: "biz-x", responsibleUserId: "bino", updatedAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const responsibleUserId = deriveResponsibleUserId(deals);

    const row = buildRenewalListRow(renewal, project, business, responsibleUserId, TODAY);

    expect(row.project.id).toBe("proj-x");
    expect(row.business.id).toBe("biz-x");
    expect(row.responsibleUserId).toBe("bino"); // o deal atualizado mais recentemente
  });
});

describe("getNextPendingRenewalForProjects", () => {
  it("14. Project com várias pending → ganha a dueDate mais próxima", () => {
    const renewals = [
      makeRenewal({ id: "far", dueDate: "2026-06-01" }),
      makeRenewal({ id: "near", dueDate: "2026-04-01" }),
    ];
    expect(getNextPendingRenewalForProjects(renewals, ["proj-1"])?.id).toBe("near");
  });

  it("15. uma renewed mais antiga + pending posterior → ganha a pending", () => {
    const renewals = [
      makeRenewal({ id: "old-renewed", status: "renewed", dueDate: "2026-01-01" }),
      makeRenewal({ id: "pending", dueDate: "2026-06-01" }),
    ];
    expect(getNextPendingRenewalForProjects(renewals, ["proj-1"])?.id).toBe("pending");
  });

  it("16. uma cancelled mais antiga + pending posterior → ganha a pending", () => {
    const renewals = [
      makeRenewal({ id: "old-cancelled", status: "cancelled", dueDate: "2026-01-01" }),
      makeRenewal({ id: "pending", dueDate: "2026-06-01" }),
    ];
    expect(getNextPendingRenewalForProjects(renewals, ["proj-1"])?.id).toBe("pending");
  });

  it("17. Business com vários Projects → ganha a pending mais próxima entre todos", () => {
    const renewals = [
      makeRenewal({ id: "p1-far", projectId: "proj-1", dueDate: "2026-08-01" }),
      makeRenewal({ id: "p2-near", projectId: "proj-2", dueDate: "2026-04-15" }),
    ];
    expect(getNextPendingRenewalForProjects(renewals, ["proj-1", "proj-2"])?.id).toBe("p2-near");
  });

  it("nenhuma pending devolve null", () => {
    const renewals = [makeRenewal({ status: "renewed" })];
    expect(getNextPendingRenewalForProjects(renewals, ["proj-1"])).toBeNull();
  });

  it("uma Renewal de outro Project nunca conta", () => {
    const renewals = [makeRenewal({ projectId: "proj-outro" })];
    expect(getNextPendingRenewalForProjects(renewals, ["proj-1"])).toBeNull();
  });
});

describe("mutações puras", () => {
  const now = new Date("2026-03-29T10:00:00.000Z");

  it("18. buildNewRenewal passa renewalSchema (id gerado, datas de auditoria)", () => {
    const renewal = buildNewRenewal(
      { projectId: "proj-1", type: "hosting", cadence: "annual", dueDate: "2026-06-01", amount: 96, status: "pending" },
      now,
    );
    expect(renewal.id).toMatch(/^ren-local-/);
    expect(renewal.createdAt).toBe(now.toISOString());
    expect(renewal.updatedAt).toBe(now.toISOString());
  });

  it("19. editar dueDate passa renewalSchema", () => {
    const renewal = makeRenewal({ dueDate: "2026-04-01" });
    const patched = applyRenewalPatch(renewal, { dueDate: "2026-05-01" }, now);
    expect(patched.dueDate).toBe("2026-05-01");
    expect(patched.updatedAt).toBe(now.toISOString());
  });

  it("20. marcar como renovada produz uma Renewal válida", () => {
    const renewal = makeRenewal({ status: "pending" });
    const renewed = applyRenewalStatus(renewal, "renewed", now);
    expect(renewed.status).toBe("renewed");
  });

  it("21. cancelar produz uma Renewal válida", () => {
    const renewal = makeRenewal({ status: "pending" });
    const cancelled = applyRenewalStatus(renewal, "cancelled", now);
    expect(cancelled.status).toBe("cancelled");
  });

  it("22. reabrir produz uma Renewal pending válida", () => {
    const renewal = makeRenewal({ status: "renewed" });
    const reopened = applyRenewalStatus(renewal, "pending", now);
    expect(reopened.status).toBe("pending");
  });

  it("23. amount = 0 continua válido (o schema permite money >= 0)", () => {
    expect(() => buildNewRenewal(
      { projectId: "proj-1", type: "domain", cadence: "annual", dueDate: "2026-06-01", amount: 0, status: "pending" },
      now,
    )).not.toThrow();
  });

  it("rejeita um type inválido (não inventado no schema)", () => {
    const renewal = makeRenewal();
    // @ts-expect-error — valor propositadamente inválido para provar a validação
    expect(() => applyRenewalPatch(renewal, { type: "subscription" }, now)).toThrow();
  });
});

describe("integração / joins (sobre a mock real)", () => {
  const data = buildMockData(TEST_TODAY);
  const today = todayIso(TEST_TODAY);

  it("24. Renewal resolve o Project correto", async () => {
    const board = await getRenewalsBoard(TEST_TODAY);
    const row = board.find((r) => r.renewal.id === RENEWAL_IDS.boiNaBrasaDomain);
    expect(row?.project.id).toBe(PROJECT_IDS.boiNaBrasaWeb);
  });

  it("25. Project resolve o Business correto", async () => {
    const board = await getRenewalsBoard(TEST_TODAY);
    const row = board.find((r) => r.renewal.id === RENEWAL_IDS.boiNaBrasaDomain);
    expect(row?.business.id).toBe(BUSINESS_IDS.boiNaBrasa);
  });

  it("26. o responsável é derivado do Business (deriveResponsibleUserId), não um campo próprio", async () => {
    const board = await getRenewalsBoard(TEST_TODAY);
    const row = board.find((r) => r.renewal.id === RENEWAL_IDS.boiNaBrasaDomain);
    // Boi na Brasa: o único deal (won) é do Sny — o mesmo responsável que o Business Detail já mostra.
    expect(row?.responsibleUserId).toBe("sny");
  });

  it("getRenewalsBoard inclui todas as renovações mock, cada uma exatamente uma vez", async () => {
    const board = await getRenewalsBoard(TEST_TODAY);
    expect(board).toHaveLength(data.renewals.length);
  });

  it("a renovação cancelada do Café Central nunca tem timing, mesmo vencida há dias", async () => {
    const board = await getRenewalsBoard(TEST_TODAY);
    const row = board.find((r) => r.renewal.id === RENEWAL_IDS.cafeCentralCancelled);
    expect(row?.timing).toBeNull();
  });

  it("groupRenewalsByTiming sobre a mock real separa corretamente atrasadas/pendentes/renovadas/canceladas", async () => {
    const board = await getRenewalsBoard(TEST_TODAY);
    const buckets = groupRenewalsByTiming(board, today);

    expect(buckets.overdue.some((r) => r.renewal.id === RENEWAL_IDS.boiNaBrasaHosting)).toBe(true);
    expect(buckets.renewed.some((r) => r.renewal.id === RENEWAL_IDS.barbeariaRenewed)).toBe(true);
    expect(buckets.cancelled.some((r) => r.renewal.id === RENEWAL_IDS.cafeCentralCancelled)).toBe(true);
  });
});
