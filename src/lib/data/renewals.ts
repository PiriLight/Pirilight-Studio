import { diffCalendarDays, todayIso } from "@/lib/utils/date";
import type { Renewal } from "@/types";

import { RENEWALS_PANEL_WINDOW_DAYS } from "./attention-rules";
import { getMockData, read } from "./internal";

export async function getRenewals(now: Date = new Date()): Promise<Renewal[]> {
  return read(getMockData(now).renewals);
}

export async function getRenewalsByProjectId(
  projectId: string,
  now: Date = new Date(),
): Promise<Renewal[]> {
  return read(getMockData(now).renewals.filter((r) => r.projectId === projectId));
}

/** Todas as renovações dos projetos de um negócio — para o Business Detail Hub. */
export async function getRenewalsByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<Renewal[]> {
  const data = getMockData(now);
  const projectIds = new Set(
    data.projects.filter((p) => p.businessId === businessId).map((p) => p.id),
  );
  return read(data.renewals.filter((r) => projectIds.has(r.projectId)));
}

/**
 * Painel dedicado de Renovações — janela mais larga (60 dias) do que a do feed
 * de atenção (30), de propósito: são trabalhos diferentes.
 */
export async function getUpcomingRenewals(
  now: Date = new Date(),
  windowDays: number = RENEWALS_PANEL_WINDOW_DAYS,
): Promise<Renewal[]> {
  const today = todayIso(now);

  return read(
    getMockData(now)
      .renewals.filter((r) => r.status === "pending")
      .filter((r) => diffCalendarDays(r.dueDate, today) <= windowDays)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0)),
  );
}
