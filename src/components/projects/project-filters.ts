import type { ProjectListRow, WorkStatus } from "@/types";

/**
 * Filtros combináveis de `/websites` e `/piricards` — mesmo padrão de
 * `task-filters.ts`/`client-list-row.ts` (enums + matchers puros, junto do
 * componente que os usa, não em `lib/data`: são preferências de
 * visualização, não regras de negócio).
 */

export type ProjectStatusFilter = "all" | WorkStatus;

export const PROJECT_STATUS_FILTERS: { value: ProjectStatusFilter; label: string }[] = [
  { value: "all", label: "Todos os estados" },
  { value: "todo", label: "Por fazer" },
  { value: "in_progress", label: "Em progresso" },
  { value: "waiting_on_client", label: "À espera do cliente" },
  { value: "blocked", label: "Bloqueado" },
  { value: "done", label: "Concluído" },
];

export type ProjectResponsibleFilter = "all" | string;

export interface ProjectFilterState {
  status: ProjectStatusFilter;
  responsible: ProjectResponsibleFilter;
}

export const DEFAULT_PROJECT_FILTERS: ProjectFilterState = { status: "all", responsible: "all" };

export function matchesProjectStatusFilter(row: ProjectListRow, filter: ProjectStatusFilter): boolean {
  return filter === "all" || row.project.status === filter;
}

export function matchesProjectResponsibleFilter(
  row: ProjectListRow,
  filter: ProjectResponsibleFilter,
): boolean {
  return filter === "all" || row.responsibleUserId === filter;
}

export function filterProjectRows(
  rows: readonly ProjectListRow[],
  filters: ProjectFilterState,
): ProjectListRow[] {
  return rows.filter(
    (row) =>
      matchesProjectStatusFilter(row, filters.status) &&
      matchesProjectResponsibleFilter(row, filters.responsible),
  );
}
