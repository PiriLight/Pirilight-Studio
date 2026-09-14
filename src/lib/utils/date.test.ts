import { describe, expect, it } from "vitest";

import { describeDueDate, describeWaitingDueDate } from "./date";

const TODAY = "2026-03-29";

describe("describeDueDate", () => {
  it("sem data → 'Sem data'", () => {
    expect(describeDueDate(null, TODAY)).toEqual({ label: "Sem data", tone: "none" });
  });

  it("no passado → 'Atrasado há N dias'", () => {
    expect(describeDueDate("2026-03-27", TODAY)).toEqual({
      label: "Atrasado há 2 dias",
      tone: "overdue",
    });
  });

  it("hoje → 'Hoje'", () => {
    expect(describeDueDate(TODAY, TODAY)).toEqual({ label: "Hoje", tone: "today" });
  });

  it("amanhã → 'Amanhã' (caso especial, não 'Em 1 dias')", () => {
    expect(describeDueDate("2026-03-30", TODAY)).toEqual({ label: "Amanhã", tone: "soon" });
  });

  it("dentro de 7 dias → 'Em N dias'", () => {
    expect(describeDueDate("2026-04-03", TODAY)).toEqual({ label: "Em 5 dias", tone: "soon" });
  });

  it("exatamente ao fim de 7 dias ainda é 'Em N dias'", () => {
    expect(describeDueDate("2026-04-05", TODAY)).toEqual({ label: "Em 7 dias", tone: "soon" });
  });

  it("mais de 7 dias → a data por extenso", () => {
    expect(describeDueDate("2026-04-06", TODAY)).toEqual({ label: "6 de abril", tone: "future" });
  });
});

describe("describeWaitingDueDate", () => {
  it("sem data → 'Sem data'", () => {
    expect(describeWaitingDueDate(null)).toEqual({ label: "Sem data", tone: "none" });
  });

  it("com data no passado → 'Prazo original: ...', nunca 'Atrasado'", () => {
    expect(describeWaitingDueDate("2026-03-01")).toEqual({
      label: "Prazo original: 1 de março",
      tone: "waiting",
    });
  });

  it("com data no futuro → o mesmo tratamento calmo (nunca urgência)", () => {
    expect(describeWaitingDueDate("2026-04-06")).toEqual({
      label: "Prazo original: 6 de abril",
      tone: "waiting",
    });
  });
});
