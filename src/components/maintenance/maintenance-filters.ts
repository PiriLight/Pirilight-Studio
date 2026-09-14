import { diffCalendarDays } from "@/lib/utils/date";
import type { MaintenanceListRow, Priority, WorkStatus } from "@/types";

/**
 * Filtros combináveis de `/maintenance` — mesmo padrão de `task-filters.ts`/
 * `renewal-filters.ts` (enums + matchers puros, junto do componente que os
 * usa: são preferências de visualização, não regras de negócio).
 */

export type MaintenanceTimeFilter = "all" | "overdue" | "today" | "week" | "no_date";

export const MAINTENANCE_TIME_FILTERS: { value: MaintenanceTimeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "overdue", label: "Em atraso" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "7 dias" },
  { value: "no_date", label: "Sem prazo" },
];

export type MaintenanceStatusFilter = "all" | WorkStatus;

export const MAINTENANCE_STATUS_FILTERS: { value: MaintenanceStatusFilter; label: string }[] = [
  { value: "all", label: "Todos os estados" },
  { value: "todo", label: "Por fazer" },
  { value: "in_progress", label: "Em progresso" },
  { value: "waiting_on_client", label: "À espera do cliente" },
  { value: "blocked", label: "Bloqueado" },
  { value: "done", label: "Concluído" },
];

/** `"unassigned"` = `responsibleUserId === null`; qualquer outro valor é um `User.id` real. */
export type MaintenanceResponsibleFilter = "all" | "unassigned" | string;

export type MaintenancePriorityFilter = "all" | Priority;

export const MAINTENANCE_PRIORITY_FILTERS: { value: MaintenancePriorityFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
];

export interface MaintenanceFilterState {
  time: MaintenanceTimeFilter;
  status: MaintenanceStatusFilter;
  responsible: MaintenanceResponsibleFilter;
  priority: MaintenancePriorityFilter;
}

export const DEFAULT_MAINTENANCE_FILTERS: MaintenanceFilterState = {
  time: "all",
  status: "all",
  responsible: "all",
  priority: "all",
};

/**
 * `waiting_on_client` e `done` nunca contam para os filtros de tempo — vivem
 * nas suas próprias secções da hierarquia (`groupMaintenanceByTiming`), a
 * mesma regra central já aplicada em `attention-rules.ts`/`groupTasksByUrgency`.
 */
export function matchesMaintenanceTimeFilter(
  row: MaintenanceListRow,
  filter: MaintenanceTimeFilter,
  todayIsoDate: string,
): boolean {
  if (filter === "all") return true;
  const { status, dueDate } = row.request;
  if (status === "done" || status === "waiting_on_client") return false;
  if (filter === "no_date") return dueDate === null;
  if (dueDate === null) return false;

  const diff = diffCalendarDays(dueDate, todayIsoDate);
  switch (filter) {
    case "overdue":
      return diff < 0;
    case "today":
      return diff === 0;
    case "week":
      return diff > 0 && diff <= 7;
  }
}

export function matchesMaintenanceStatusFilter(row: MaintenanceListRow, filter: MaintenanceStatusFilter): boolean {
  return filter === "all" || row.request.status === filter;
}

export function matchesMaintenanceResponsibleFilter(
  row: MaintenanceListRow,
  filter: MaintenanceResponsibleFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "unassigned") return row.request.responsibleUserId === null;
  return row.request.responsibleUserId === filter;
}

export function matchesMaintenancePriorityFilter(row: MaintenanceListRow, filter: MaintenancePriorityFilter): boolean {
  return filter === "all" || row.request.priority === filter;
}

export function matchesMaintenanceQuery(row: MaintenanceListRow, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  const haystack = `${row.request.title} ${row.business.name} ${row.project.name}`.toLowerCase();
  return haystack.includes(trimmed);
}

export function filterMaintenanceRows(
  rows: readonly MaintenanceListRow[],
  filters: MaintenanceFilterState,
  query: string,
  todayIsoDate: string,
): MaintenanceListRow[] {
  return rows.filter(
    (row) =>
      matchesMaintenanceTimeFilter(row, filters.time, todayIsoDate) &&
      matchesMaintenanceStatusFilter(row, filters.status) &&
      matchesMaintenanceResponsibleFilter(row, filters.responsible) &&
      matchesMaintenancePriorityFilter(row, filters.priority) &&
      matchesMaintenanceQuery(row, query),
  );
}
