import { diffCalendarDays } from "@/lib/utils/date";
import type { Task, TaskWithDetail, WorkStatus } from "@/types";

/**
 * Filtros combináveis de `/tasks` — mesmo padrão de `client-list-row.ts`
 * (enums + matchers puros, colocados junto do componente que os usa, não em
 * `lib/data`: são preferências de visualização, não regras de negócio).
 */

export type TaskTimeFilter = "all" | "overdue" | "today" | "week";

export const TASK_TIME_FILTERS: { value: TaskTimeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta semana" },
];

export type TaskAssigneeFilter = "all" | string;

export type TaskStatusFilter = "all" | WorkStatus;

export const TASK_STATUS_FILTERS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "Todos os estados" },
  { value: "todo", label: "Por fazer" },
  { value: "in_progress", label: "Em progresso" },
  { value: "waiting_on_client", label: "À espera do cliente" },
  { value: "blocked", label: "Bloqueado" },
  { value: "done", label: "Concluído" },
];

export interface TaskFilterState {
  time: TaskTimeFilter;
  assignee: TaskAssigneeFilter;
  status: TaskStatusFilter;
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = { time: "all", assignee: "all", status: "all" };

/**
 * `waiting_on_client` e `done` nunca contam para os filtros de tempo — vivem
 * nas suas próprias secções da hierarquia (`groupTasksByUrgency`), a mesma
 * regra central já aplicada em `attention-rules.ts`/`deriveNextAction`.
 */
export function matchesTimeFilter(task: Task, filter: TaskTimeFilter, todayIsoDate: string): boolean {
  if (filter === "all") return true;
  if (task.status === "done" || task.status === "waiting_on_client") return false;
  if (task.dueDate === null) return false;

  const diff = diffCalendarDays(task.dueDate, todayIsoDate);
  switch (filter) {
    case "overdue":
      return diff < 0;
    case "today":
      return diff === 0;
    case "week":
      return diff > 0 && diff <= 7;
  }
}

export function matchesAssigneeFilter(task: Task, filter: TaskAssigneeFilter): boolean {
  return filter === "all" || task.assigneeId === filter;
}

export function matchesStatusFilter(task: Task, filter: TaskStatusFilter): boolean {
  return filter === "all" || task.status === filter;
}

export function filterTasks(
  items: readonly TaskWithDetail[],
  filters: TaskFilterState,
  todayIsoDate: string,
): TaskWithDetail[] {
  return items.filter(
    (item) =>
      matchesTimeFilter(item.task, filters.time, todayIsoDate) &&
      matchesAssigneeFilter(item.task, filters.assignee) &&
      matchesStatusFilter(item.task, filters.status),
  );
}
