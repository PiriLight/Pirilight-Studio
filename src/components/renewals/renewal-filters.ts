import { diffCalendarDays } from "@/lib/utils/date";
import type { RenewalListRow, RenewalStatus } from "@/types";

/**
 * Filtros combináveis de `/renewals` — mesmo padrão de `task-filters.ts`/
 * `project-filters.ts` (enums + matchers puros, junto do componente que os
 * usa, não em `lib/data`: são preferências de visualização, não regras de
 * negócio).
 */

export type RenewalTimeFilter = "all" | "overdue" | "today" | "week" | "month" | "sixty_days";

/**
 * Round 7.1 — os labels "30 dias"/"60 dias" liam-se como janelas cumulativas
 * (0–30, 0–60), mas cada opção é um balde exclusivo (ver
 * `matchesRenewalTimeFilter`): "month" é só 8–30 dias, "sixty_days" é só
 * 31–60. Os labels passam a dizer exatamente isso — sem mudar nenhum
 * intervalo, só a forma como se lê.
 */
export const RENEWAL_TIME_FILTERS: { value: RenewalTimeFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "overdue", label: "Em atraso" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "7 dias" },
  { value: "month", label: "8–30 dias" },
  { value: "sixty_days", label: "31–60 dias" },
];

export type RenewalStatusFilter = "all" | RenewalStatus;

export const RENEWAL_STATUS_FILTERS: { value: RenewalStatusFilter; label: string }[] = [
  { value: "all", label: "Todos os estados" },
  { value: "pending", label: "Pendente" },
  { value: "renewed", label: "Renovada" },
  { value: "cancelled", label: "Cancelada" },
];

export type RenewalResponsibleFilter = "all" | string;

export interface RenewalFilterState {
  time: RenewalTimeFilter;
  status: RenewalStatusFilter;
  responsible: RenewalResponsibleFilter;
}

export const DEFAULT_RENEWAL_FILTERS: RenewalFilterState = { time: "all", status: "all", responsible: "all" };

/**
 * `renewed`/`cancelled` nunca contam para os filtros de tempo — vivem nas
 * suas próprias secções da hierarquia, a mesma regra central já aplicada em
 * `groupRenewalsByTiming`: só `pending` pode estar atrasada ou "para hoje".
 *
 * Cada opção corresponde exatamente a um balde de `groupRenewalsByTiming`
 * (não é uma janela cumulativa) — mesmo padrão do filtro "Esta semana" de
 * Tarefas, que também é só o balde `dueSoon`, não "tudo até 7 dias".
 */
export function matchesRenewalTimeFilter(
  row: RenewalListRow,
  filter: RenewalTimeFilter,
  todayIsoDate: string,
): boolean {
  if (filter === "all") return true;
  if (row.renewal.status !== "pending") return false;

  const diff = diffCalendarDays(row.renewal.dueDate, todayIsoDate);
  switch (filter) {
    case "overdue":
      return diff < 0;
    case "today":
      return diff === 0;
    case "week":
      return diff > 0 && diff <= 7;
    case "month":
      return diff > 7 && diff <= 30;
    case "sixty_days":
      return diff > 30 && diff <= 60;
  }
}

export function matchesRenewalStatusFilter(row: RenewalListRow, filter: RenewalStatusFilter): boolean {
  return filter === "all" || row.renewal.status === filter;
}

export function matchesRenewalResponsibleFilter(
  row: RenewalListRow,
  filter: RenewalResponsibleFilter,
): boolean {
  return filter === "all" || row.responsibleUserId === filter;
}

export function filterRenewalRows(
  rows: readonly RenewalListRow[],
  filters: RenewalFilterState,
  todayIsoDate: string,
): RenewalListRow[] {
  return rows.filter(
    (row) =>
      matchesRenewalTimeFilter(row, filters.time, todayIsoDate) &&
      matchesRenewalStatusFilter(row, filters.status) &&
      matchesRenewalResponsibleFilter(row, filters.responsible),
  );
}
