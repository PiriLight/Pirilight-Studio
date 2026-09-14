import { describe, expect, it } from "vitest";

import type { Task } from "@/types";

import { filterTasks, matchesAssigneeFilter, matchesStatusFilter, matchesTimeFilter } from "./task-filters";

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

describe("matchesTimeFilter", () => {
  it("'all' aceita tudo, incluindo waiting_on_client e sem data", () => {
    expect(matchesTimeFilter(makeTask({ status: "waiting_on_client", waitingReason: "photos" }), "all", TODAY)).toBe(
      true,
    );
    expect(matchesTimeFilter(makeTask({ dueDate: null }), "all", TODAY)).toBe(true);
  });

  it("'overdue' só aceita datas passadas de trabalho aberto", () => {
    expect(matchesTimeFilter(makeTask({ dueDate: "2026-03-20" }), "overdue", TODAY)).toBe(true);
    expect(matchesTimeFilter(makeTask({ dueDate: TODAY }), "overdue", TODAY)).toBe(false);
  });

  it("'today' só aceita a data de hoje", () => {
    expect(matchesTimeFilter(makeTask({ dueDate: TODAY }), "today", TODAY)).toBe(true);
    expect(matchesTimeFilter(makeTask({ dueDate: "2026-03-30" }), "today", TODAY)).toBe(false);
  });

  it("'week' aceita 1 a 7 dias, exclui hoje e o que passou de 7 dias", () => {
    expect(matchesTimeFilter(makeTask({ dueDate: "2026-04-05" }), "week", TODAY)).toBe(true);
    expect(matchesTimeFilter(makeTask({ dueDate: TODAY }), "week", TODAY)).toBe(false);
    expect(matchesTimeFilter(makeTask({ dueDate: "2026-04-06" }), "week", TODAY)).toBe(false);
  });

  it("waiting_on_client nunca conta para nenhum filtro de tempo, mesmo com data vencida", () => {
    const task = makeTask({ status: "waiting_on_client", waitingReason: "photos", dueDate: "2026-01-01" });
    expect(matchesTimeFilter(task, "overdue", TODAY)).toBe(false);
    expect(matchesTimeFilter(task, "week", TODAY)).toBe(false);
  });

  it("done nunca conta para nenhum filtro de tempo", () => {
    const task = makeTask({ status: "done", dueDate: "2026-01-01" });
    expect(matchesTimeFilter(task, "overdue", TODAY)).toBe(false);
  });

  it("sem dueDate nunca corresponde a um filtro de tempo específico", () => {
    expect(matchesTimeFilter(makeTask({ dueDate: null }), "overdue", TODAY)).toBe(false);
    expect(matchesTimeFilter(makeTask({ dueDate: null }), "week", TODAY)).toBe(false);
  });
});

describe("matchesAssigneeFilter", () => {
  it("'all' aceita qualquer responsável", () => {
    expect(matchesAssigneeFilter(makeTask({ assigneeId: "bino" }), "all")).toBe(true);
  });

  it("um id específico só aceita esse responsável", () => {
    expect(matchesAssigneeFilter(makeTask({ assigneeId: "sny" }), "sny")).toBe(true);
    expect(matchesAssigneeFilter(makeTask({ assigneeId: "bino" }), "sny")).toBe(false);
  });
});

describe("matchesStatusFilter", () => {
  it("'all' aceita qualquer estado", () => {
    expect(matchesStatusFilter(makeTask({ status: "blocked" }), "all")).toBe(true);
  });

  it("um estado específico só aceita esse estado", () => {
    expect(matchesStatusFilter(makeTask({ status: "blocked" }), "blocked")).toBe(true);
    expect(matchesStatusFilter(makeTask({ status: "todo" }), "blocked")).toBe(false);
  });
});

describe("filterTasks", () => {
  const emptyDetail = { businessId: null, businessName: null, projectId: null, projectName: null };

  it("combina os três eixos com E lógico", () => {
    const items = [
      { task: makeTask({ id: "a", assigneeId: "sny", dueDate: TODAY }), ...emptyDetail },
      { task: makeTask({ id: "b", assigneeId: "bino", dueDate: TODAY }), ...emptyDetail },
      { task: makeTask({ id: "c", assigneeId: "sny", dueDate: "2026-04-20" }), ...emptyDetail },
    ];

    const result = filterTasks(items, { time: "today", assignee: "sny", status: "all" }, TODAY);
    expect(result.map((i) => i.task.id)).toEqual(["a"]);
  });
});
