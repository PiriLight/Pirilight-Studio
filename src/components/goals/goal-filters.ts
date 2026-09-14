import { deriveGoalStatus } from "@/lib/data/goal-board";
import type { Goal, GoalStatus, GoalTimeframe } from "@/types";

/**
 * Filtros combináveis de `/goals` — mesmo padrão de `task-filters.ts`/
 * `renewal-filters.ts` (enums + matchers puros, junto do componente que os
 * usa: são preferências de visualização, não regras de negócio).
 */

export type GoalTimeframeFilter = "all" | GoalTimeframe;

export const GOAL_TIMEFRAME_FILTERS: { value: GoalTimeframeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Ano" },
];

/** `"company"` = `ownerId === null` ("Empresa"); qualquer outro valor é um `User.id` real. */
export type GoalOwnerFilter = "all" | "company" | string;

export type GoalStatusFilter = "all" | GoalStatus;

export const GOAL_STATUS_FILTERS: { value: GoalStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "in_progress", label: "Em curso" },
  { value: "done", label: "Concluído" },
];

export interface GoalFilterState {
  timeframe: GoalTimeframeFilter;
  owner: GoalOwnerFilter;
  status: GoalStatusFilter;
}

export const DEFAULT_GOAL_FILTERS: GoalFilterState = { timeframe: "all", owner: "all", status: "all" };

export function matchesGoalTimeframeFilter(goal: Goal, filter: GoalTimeframeFilter): boolean {
  return filter === "all" || goal.timeframe === filter;
}

export function matchesGoalOwnerFilter(goal: Goal, filter: GoalOwnerFilter): boolean {
  if (filter === "all") return true;
  if (filter === "company") return goal.ownerId === null;
  return goal.ownerId === filter;
}

export function matchesGoalStatusFilter(goal: Goal, filter: GoalStatusFilter): boolean {
  return filter === "all" || deriveGoalStatus(goal.progress) === filter;
}

export function matchesGoalQuery(goal: Goal, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  return goal.title.toLowerCase().includes(trimmed);
}

export function filterGoals(goals: readonly Goal[], filters: GoalFilterState, query: string): Goal[] {
  return goals.filter(
    (goal) =>
      matchesGoalTimeframeFilter(goal, filters.timeframe) &&
      matchesGoalOwnerFilter(goal, filters.owner) &&
      matchesGoalStatusFilter(goal, filters.status) &&
      matchesGoalQuery(goal, query),
  );
}
