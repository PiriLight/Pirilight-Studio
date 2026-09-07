import { describe, expect, it } from "vitest";

import type { GoalRow, TaskRow } from "@/lib/data/supabase/operational";
import { deriveGoalProgress, filterOperationalTasks } from "./work-management";

const baseGoal = { metric: "Leads", current_value: 6, target_value: 10 } as GoalRow;
const task = (patch: Partial<TaskRow>): TaskRow => ({
  id: crypto.randomUUID(), title: "Tarefa", description: null, status: "todo", waiting_reason: null,
  priority: "normal", due_date: null, responsible_user_id: "11111111-1111-1111-1111-111111111111",
  business_id: null, project_id: null, deal_id: null, created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z", ...patch,
});

describe("deriveGoalProgress", () => {
  it("deriva e limita a barra sem limitar a percentagem informativa", () => {
    expect(deriveGoalProgress({ ...baseGoal, current_value: 12 })).toMatchObject({ percentage: 120, barPercentage: 100 });
  });
  it("trata target zero e ausência de métrica sem divisão inválida", () => {
    expect(deriveGoalProgress({ ...baseGoal, current_value: 1, target_value: 0 })).toMatchObject({ percentage: null, barPercentage: 100 });
    expect(deriveGoalProgress({ ...baseGoal, metric: null })).toEqual({ percentage: null, barPercentage: 0, label: "Sem métrica numérica" });
  });
});

describe("filterOperationalTasks", () => {
  const tasks = [
    task({ title: "Atrasada", due_date: "2026-09-06" }),
    task({ title: "Hoje", due_date: "2026-09-07" }),
    task({ title: "Próxima", due_date: "2026-09-10", responsible_user_id: "22222222-2222-2222-2222-222222222222" }),
    task({ title: "Feita", due_date: "2026-09-01", status: "done" }),
  ];
  const base = { today: "2026-09-07", currentUserId: "11111111-1111-1111-1111-111111111111" };
  it("aplica os filtros temporais e Minhas ao utilizador real", () => {
    expect(filterOperationalTasks(tasks, { ...base, time: "overdue" }).map((item) => item.title)).toEqual(["Atrasada"]);
    expect(filterOperationalTasks(tasks, { ...base, time: "today" }).map((item) => item.title)).toEqual(["Hoje"]);
    expect(filterOperationalTasks(tasks, { ...base, time: "upcoming" }).map((item) => item.title)).toEqual(["Próxima"]);
    expect(filterOperationalTasks(tasks, { ...base, time: "completed" }).map((item) => item.title)).toEqual(["Feita"]);
    expect(filterOperationalTasks(tasks, { ...base, time: "mine" })).toHaveLength(3);
  });
});
