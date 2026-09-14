import { describe, expect, it } from "vitest";

import { buildMockData, TEST_TODAY } from "@/lib/mock";

import {
  getAttentionItems,
  getBlockedProjects,
  getFollowUpsDueToday,
  getOverdueFollowUps,
  getWaitingOnClientItems,
} from "./attention";
import { getBusinessesByLifecycleStatus, getCommercialBusinesses } from "./businesses";
import { getUpcomingRenewals } from "./renewals";

/**
 * Teste de ponta a ponta da camada de dados sobre a mock real — mas sempre com
 * a âncora fixa `TEST_TODAY`, por isso completamente determinístico.
 */
const data = buildMockData(TEST_TODAY);

describe("getAttentionItems sobre a mock real", () => {
  it("devolve os itens pela ordem esperada", async () => {
    const items = await getAttentionItems(TEST_TODAY);

    // Ordem: urgência → data ascendente → tipo (task, deal, payment, renewal,
    // maintenance) → id. O mais atrasado aparece primeiro.
    expect(items.map((i) => `${i.urgency}:${i.kind}:${i.sourceId}`)).toEqual([
      "overdue:payment:pay-talho-web", // -9
      "overdue:task:task-talho-unblock", // -6 (bloqueada: é nossa para desbloquear)
      "overdue:renewal:ren-boi-na-brasa-hosting", // -4
      "overdue:deal:deal-studio-vetorial-1", // -3 (follow-up atrasado)
      "overdue:task:task-boi-na-brasa-photos", // -2 (ação nossa sobre projeto à espera)
      "due_today:task:task-boi-na-brasa-menu",
      "due_today:deal:deal-phone-stop-1", // follow-up para hoje
      "due_soon:task:task-beauty-print-check", // +1
      "due_soon:renewal:ren-boi-na-brasa-domain", // +1 (renovação amanhã)
      "due_soon:task:task-phone-stop-call", // +2
      "due_soon:deal:deal-padaria-1", // +2
      "due_soon:task:task-autoformigal-content", // +3
      "due_soon:deal:deal-oft-racing-1", // +3
      "due_soon:payment:pay-beauty-card", // +3
      "due_soon:task:task-clinica-maintenance", // +4
      "due_soon:maintenance:mnt-clinica-horarios", // +4
      "due_soon:payment:pay-auto-eletrica-card", // +5
      "due_soon:maintenance:mnt-talho-precos", // +5 (blocked, mas devido em breve — não escondido pelo estado)
      "due_soon:renewal:ren-beauty-subscription", // +12
      "due_soon:renewal:ren-ginasio-plan", // +28
      "stalled:deal:deal-optica-1", // sem contacto há 21 dias
      "stalled:maintenance:mnt-ginasio-precos", // aberto há 20 dias
    ]);
  });

  it("ordena sempre atrasados antes de hoje, hoje antes de em breve, e parados no fim", () => {
    const rank = { overdue: 0, due_today: 1, due_soon: 2, stalled: 3 } as const;

    return getAttentionItems(TEST_TODAY).then((items) => {
      const ranks = items.map((i) => rank[i.urgency]);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });
  });

  it("não inclui nada que esteja à espera do cliente", async () => {
    const items = await getAttentionItems(TEST_TODAY);
    const waitingIds = new Set([
      ...data.projects.filter((p) => p.status === "waiting_on_client").map((p) => p.id),
      ...data.tasks.filter((t) => t.status === "waiting_on_client").map((t) => t.id),
    ]);

    for (const item of items) {
      expect(waitingIds.has(item.sourceId)).toBe(false);
    }
  });

  it("todos os itens apontam para uma rota que existe", async () => {
    const routes = new Set(["/tasks", "/commercial", "/finance", "/renewals", "/maintenance"]);
    const items = await getAttentionItems(TEST_TODAY);

    for (const item of items) {
      expect(routes.has(item.href)).toBe(true);
    }
  });
});

describe("feeds derivados", () => {
  it("os follow-ups de hoje são só deals com urgência due_today", async () => {
    const items = await getFollowUpsDueToday(TEST_TODAY);
    expect(items.map((i) => i.sourceId)).toEqual(["deal-phone-stop-1"]);
  });

  it("os follow-ups atrasados incluem os parados", async () => {
    const items = await getOverdueFollowUps(TEST_TODAY);
    expect(items.map((i) => i.sourceId)).toEqual(["deal-studio-vetorial-1", "deal-optica-1"]);
  });

  it("o feed de espera traz o motivo e o negócio", async () => {
    const items = await getWaitingOnClientItems(TEST_TODAY);

    expect(items.map((i) => `${i.kind}:${i.waitingReason}`).sort()).toEqual([
      "maintenance:photos",
      "project:approval",
      "project:photos",
      "task:content",
    ]);
    expect(items.every((i) => i.businessName.length > 0)).toBe(true);
  });

  it("os projetos bloqueados são um feed à parte", async () => {
    const blocked = await getBlockedProjects(TEST_TODAY);
    expect(blocked.map((p) => p.projectId)).toEqual(["proj-talho-web"]);
  });

  it("o painel de renovações usa uma janela maior do que o feed de atenção", async () => {
    const upcoming = await getUpcomingRenewals(TEST_TODAY);
    const attention = await getAttentionItems(TEST_TODAY);
    const attentionRenewals = attention.filter((i) => i.kind === "renewal");

    // A renovação a 45 dias entra no painel mas não no feed de atenção (30 dias).
    expect(upcoming.map((r) => r.id)).toContain("ren-autoformigal-hosting");
    expect(attentionRenewals.map((i) => i.sourceId)).not.toContain("ren-autoformigal-hosting");
  });
});

describe("Comercial e Clientes leem o mesmo Business", () => {
  it("filtram a mesma coleção por lifecycleStatus, sem duplicar entidades", async () => {
    const commercial = await getCommercialBusinesses(TEST_TODAY);
    const clients = await getBusinessesByLifecycleStatus("client", TEST_TODAY);

    expect(commercial.every((b) => b.lifecycleStatus !== "client")).toBe(true);
    expect(clients.every((b) => b.lifecycleStatus === "client")).toBe(true);

    const overlap = commercial.filter((b) => clients.some((c) => c.id === b.id));
    expect(overlap).toHaveLength(0);

    const inactive = await getBusinessesByLifecycleStatus("inactive", TEST_TODAY);
    expect(commercial.length + clients.length + inactive.length).toBe(data.businesses.length);
  });
});

describe("as leituras devolvem cópias", () => {
  it("mutar o resultado não afeta leituras seguintes", async () => {
    const first = await getAttentionItems(TEST_TODAY);
    const firstItem = first[0];
    expect(firstItem).toBeDefined();
    if (firstItem) firstItem.title = "ALTERADO";

    const second = await getAttentionItems(TEST_TODAY);
    expect(second[0]?.title).not.toBe("ALTERADO");
  });
});
