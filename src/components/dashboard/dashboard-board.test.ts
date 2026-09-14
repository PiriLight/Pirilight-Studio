import { describe, expect, it } from "vitest";

import { resolveItemHref } from "./dashboard-board";
import type { AttentionItem } from "@/types";

/**
 * Round 7.1 — a única peça de lógica pura nova deste round: onde o Dashboard
 * deve levar ao clicar numa linha de "Hoje"/"Próximas ações", quando já
 * existe um contexto funcional mais específico do que o `AttentionItem.href`
 * genérico (que aponta sempre para a lista do género). Não mexe em
 * `attention-rules.ts` nem em `AttentionItem` — só decide o destino.
 */
function makeItem(overrides: Partial<AttentionItem>): AttentionItem {
  return {
    id: "task:t1",
    kind: "task",
    sourceId: "t1",
    title: "Tarefa de teste",
    dueOrStalledDate: "2026-09-03",
    urgency: "overdue",
    daysDelta: -1,
    href: "/tasks",
    businessId: null,
    businessName: null,
    ownerId: null,
    ...overrides,
  };
}

describe("resolveItemHref (Round 7.1)", () => {
  it("deal com businessId vai para a aba Comercial do Business Detail", () => {
    const item = makeItem({ kind: "deal", href: "/commercial", businessId: "biz-1" });
    expect(resolveItemHref(item)).toBe("/businesses/biz-1?tab=commercial");
  });

  it("payment com businessId vai para a aba Pagamentos do Business Detail, nunca /finance", () => {
    const item = makeItem({ kind: "payment", href: "/finance", businessId: "biz-1" });
    expect(resolveItemHref(item)).toBe("/businesses/biz-1?tab=payments");
  });

  it("maintenance com businessId vai para a aba Manutenção do Business Detail (Round 9: a aba passou a existir)", () => {
    const item = makeItem({ kind: "maintenance", href: "/maintenance", businessId: "biz-1" });
    expect(resolveItemHref(item)).toBe("/businesses/biz-1?tab=maintenance");
  });

  it("payment sem businessId mantém o fallback original (/finance)", () => {
    const item = makeItem({ kind: "payment", href: "/finance", businessId: null });
    expect(resolveItemHref(item)).toBe("/finance");
  });

  it("maintenance sem businessId mantém o fallback original (/maintenance)", () => {
    const item = makeItem({ kind: "maintenance", href: "/maintenance", businessId: null });
    expect(resolveItemHref(item)).toBe("/maintenance");
  });

  it("task e renewal nunca são reescritos, mesmo com businessId presente", () => {
    expect(resolveItemHref(makeItem({ kind: "task", href: "/tasks", businessId: "biz-1" }))).toBe("/tasks");
    expect(resolveItemHref(makeItem({ kind: "renewal", href: "/renewals", businessId: "biz-1" }))).toBe("/renewals");
  });
});
