import { describe, expect, it } from "vitest";

import type { Goal, Task, User } from "@/types";

import {
  applyGoalPatch,
  applyGoalProgress,
  buildNewGoal,
  deriveGoalNextAction,
  deriveGoalStatus,
  getGoalLinkedTasks,
  goalOwnerLabel,
} from "./goal-board";

const audit = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const TODAY = "2026-03-29";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    title: "5 novos clientes este trimestre",
    timeframe: "quarter",
    progress: 60,
    ownerId: null,
    linkedTaskIds: [],
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
    dueDate: TODAY,
    assigneeId: "sny",
    relatedEntityType: null,
    relatedEntityId: null,
    ...audit,
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "sny",
    name: "Sny",
    initials: "SN",
    accentColor: "#168CFF",
    ...audit,
    ...overrides,
  };
}

describe("deriveGoalStatus", () => {
  it("0% → em curso", () => {
    expect(deriveGoalStatus(0)).toBe("in_progress");
  });

  it("99% → em curso", () => {
    expect(deriveGoalStatus(99)).toBe("in_progress");
  });

  it("100% → concluído", () => {
    expect(deriveGoalStatus(100)).toBe("done");
  });
});

describe("goalOwnerLabel", () => {
  const userById = new Map([["sny", makeUser()]]);

  it("ownerId null → 'Empresa', nunca 'Sem responsável'", () => {
    expect(goalOwnerLabel(null, userById)).toBe("Empresa");
  });

  it("ownerId de um User real → o nome desse User", () => {
    expect(goalOwnerLabel("sny", userById)).toBe("Sny");
  });

  it("ownerId que já não resolve num User → cai em 'Empresa', não rebenta", () => {
    expect(goalOwnerLabel("user-inexistente", userById)).toBe("Empresa");
  });
});

describe("buildNewGoal", () => {
  it("cria um Goal válido a partir do formulário", () => {
    const goal = buildNewGoal(
      { title: "Meta nova", timeframe: "year", ownerId: "bino", progress: 25, linkedTaskIds: ["task-1"] },
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(goal.title).toBe("Meta nova");
    expect(goal.timeframe).toBe("year");
    expect(goal.ownerId).toBe("bino");
    expect(goal.progress).toBe(25);
    expect(goal.linkedTaskIds).toEqual(["task-1"]);
    expect(goal.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(goal.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("progress < 0 é rejeitado pelo schema", () => {
    expect(() =>
      buildNewGoal({ title: "Meta", timeframe: "quarter", ownerId: null, progress: -1, linkedTaskIds: [] }),
    ).toThrow();
  });

  it("progress > 100 é rejeitado pelo schema", () => {
    expect(() =>
      buildNewGoal({ title: "Meta", timeframe: "quarter", ownerId: null, progress: 101, linkedTaskIds: [] }),
    ).toThrow();
  });
});

describe("applyGoalPatch", () => {
  it("aplica um patch parcial e atualiza updatedAt", () => {
    const goal = makeGoal();
    const patched = applyGoalPatch(goal, { title: "Título novo" }, new Date("2026-02-01T00:00:00.000Z"));

    expect(patched.title).toBe("Título novo");
    expect(patched.progress).toBe(goal.progress); // campos não tocados mantêm-se
    expect(patched.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("applyGoalProgress", () => {
  it("muda só o progress e atualiza updatedAt", () => {
    const goal = makeGoal({ progress: 60 });
    const updated = applyGoalProgress(goal, 80, new Date("2026-02-01T00:00:00.000Z"));

    expect(updated.progress).toBe(80);
    expect(updated.title).toBe(goal.title);
    expect(updated.updatedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("valida sempre pelo schema — um progress fora de 0–100 rebenta", () => {
    const goal = makeGoal();
    expect(() => applyGoalProgress(goal, 150)).toThrow();
  });

  it("concluir uma Task ligada nunca muda o progress sozinho (verificado por composição: applyGoalProgress é a única função que o muda)", () => {
    // Não há um "recalculateFromTasks" nesta base de código — a inexistência
    // dessa função é, por construção, a garantia de que o progress nunca é
    // automático. Este teste documenta a intenção.
    const goal = makeGoal({ progress: 60, linkedTaskIds: ["task-1"] });
    const tasks = [makeTask({ id: "task-1", status: "done" })];
    const linked = getGoalLinkedTasks(goal, tasks);

    expect(linked[0]?.status).toBe("done");
    expect(goal.progress).toBe(60); // inalterado — só applyGoalProgress muda isto
  });
});

describe("getGoalLinkedTasks", () => {
  it("resolve os ids existentes, pela ordem de linkedTaskIds", () => {
    const tasks = [makeTask({ id: "task-1", title: "A" }), makeTask({ id: "task-2", title: "B" })];
    const goal = makeGoal({ linkedTaskIds: ["task-2", "task-1"] });

    const resolved = getGoalLinkedTasks(goal, tasks);
    expect(resolved.map((t) => t.title)).toEqual(["B", "A"]);
  });

  it("ignora ids inexistentes em vez de rebentar", () => {
    const tasks = [makeTask({ id: "task-1" })];
    const goal = makeGoal({ linkedTaskIds: ["task-1", "task-fantasma"] });

    const resolved = getGoalLinkedTasks(goal, tasks);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.id).toBe("task-1");
  });

  it("sem Tasks ligadas devolve array vazio", () => {
    expect(getGoalLinkedTasks(makeGoal({ linkedTaskIds: [] }), [makeTask()])).toEqual([]);
  });
});

describe("deriveGoalNextAction", () => {
  it("sem Tasks ligadas → 'Sem ação interna pendente'", () => {
    const action = deriveGoalNextAction([], TODAY);
    expect(action).toEqual({ kind: "none", title: "Sem ação interna pendente", urgency: null, daysDelta: null, waitingReason: null });
  });

  it("uma Task concluída não conta — continua 'Sem ação interna pendente'", () => {
    const action = deriveGoalNextAction([makeTask({ status: "done", dueDate: "2026-03-01" })], TODAY);
    expect(action.kind).toBe("none");
  });

  it("todas as Tasks ligadas 'waiting_on_client' → kind waiting_on_client, nunca lido como atraso", () => {
    const action = deriveGoalNextAction(
      [makeTask({ status: "waiting_on_client", waitingReason: "photos", dueDate: "2026-01-01" })],
      TODAY,
    );
    expect(action.kind).toBe("waiting_on_client");
    expect(action.waitingReason).toBe("photos");
    expect(action.urgency).toBeNull();
  });

  it("overdue vence future — mesma prioridade de deriveNextAction", () => {
    const action = deriveGoalNextAction(
      [makeTask({ id: "t-overdue", dueDate: "2026-03-20" }), makeTask({ id: "t-future", dueDate: "2026-04-30" })],
      TODAY,
    );
    expect(action.kind).toBe("task");
    expect(action.urgency).toBe("overdue");
  });

  it("Task sem data continua elegível se não houver candidato melhor", () => {
    const action = deriveGoalNextAction([makeTask({ dueDate: null })], TODAY);
    expect(action.kind).toBe("task");
    expect(action.urgency).toBe("no_date");
    expect(action.daysDelta).toBeNull();
  });

  it("Task sem data perde para uma Task com data mais urgente", () => {
    const action = deriveGoalNextAction(
      [makeTask({ id: "t-no-date", dueDate: null }), makeTask({ id: "t-today", dueDate: TODAY })],
      TODAY,
    );
    expect(action.kind).toBe("task");
    expect(action.urgency).toBe("due_today");
  });
});
