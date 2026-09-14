import type { BusinessSummary, MaintenanceRequest } from "@/types";

/**
 * Uma linha da lista de Clientes — o `BusinessSummary` já com os campos
 * derivados que a pesquisa/filtros e o cartão mobile precisam, calculados uma
 * vez no servidor (onde "hoje" é autoritário) em vez de em cada componente.
 */
export interface ClientListRow {
  summary: BusinessSummary;
  responsibleName: string | null;
  hasPendingPayment: boolean;
  hasUpcomingRenewal: boolean;
  /**
   * D7 (Round 5) + Round 5.1 — ids **estruturais** do negócio (nunca mudam
   * depois de criados: um Project/Deal não muda de Business), por isso são
   * seguros para pré-calcular uma única vez no servidor. Substituem a lista
   * de `taskIds` do Round 5, que "congelava" no momento do carregamento da
   * página e nunca via uma Task criada depois — `LiveOverallStatusBadge`
   * resolve agora contra estes ids, ao vivo, sobre a `useTaskStore` atual.
   */
  businessId: string;
  projectIds: string[];
  dealIds: string[];
  /** Já scoped a este negócio — nunca mutado nesta fase. */
  maintenanceRequests: MaintenanceRequest[];
}

export type ClientFilter = "all" | "website" | "piricard" | "pendingPayment" | "upcomingRenewal";

export const CLIENT_FILTERS: { value: ClientFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "website", label: "Com website" },
  { value: "piricard", label: "Com PiriCard" },
  { value: "pendingPayment", label: "Com pagamentos pendentes" },
  { value: "upcomingRenewal", label: "Com renovação próxima" },
];

export function matchesFilter(row: ClientListRow, filter: ClientFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "website":
      return row.summary.hasWebsite;
    case "piricard":
      return row.summary.hasPiriCard;
    case "pendingPayment":
      return row.hasPendingPayment;
    case "upcomingRenewal":
      return row.hasUpcomingRenewal;
  }
}
