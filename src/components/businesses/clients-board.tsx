"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Globe, Search } from "lucide-react";

import { BusinessCard } from "@/components/businesses/business-card";
import {
  CLIENT_FILTERS,
  matchesFilter,
  type ClientFilter,
  type ClientListRow,
} from "@/components/businesses/client-list-row";
import { LiveOverallStatusBadge } from "@/components/businesses/live-overall-status-badge";
import { useLiveBusinessCounts } from "@/components/businesses/use-live-business-scope";
import { EntityListTable } from "@/components/domain/entity-list-table";
import { PaymentProgress } from "@/components/domain/payment-progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { RENEWALS_PANEL_WINDOW_DAYS } from "@/lib/data";
import { renewalTypeLabel } from "@/lib/constants/labels";
import { getNextPendingRenewalForProjects } from "@/lib/data/renewal-board";
import { diffCalendarDays } from "@/lib/utils/date";
import { formatDateDisplay } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/use-project-store";
import { useRenewalStore } from "@/store/use-renewal-store";
import { useTaskStore } from "@/store/use-task-store";
import type { MaintenanceRequest, Project, Renewal, Task } from "@/types";

function matchesQuery(row: ClientListRow, query: string): boolean {
  if (query.trim().length === 0) return true;
  const haystack = `${row.summary.business.name} ${row.summary.business.industry}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

interface ClientsBoardProps {
  rows: ClientListRow[];
  /** Snapshots globais do servidor — só para semear as stores se ainda não estiverem inicializadas (D7). */
  initialProjects: Project[];
  initialTasks: Task[];
  initialRenewals: Renewal[];
  /** Snapshot GLOBAL do servidor — só para semear a `useMaintenanceStore` (Round 9). */
  initialMaintenanceRequests: MaintenanceRequest[];
  today: string;
}

export function ClientsBoard({
  rows,
  initialProjects,
  initialTasks,
  initialRenewals,
  initialMaintenanceRequests,
  today,
}: ClientsBoardProps) {
  const initializeProjects = useProjectStore((state) => state.initialize);
  const initializeTasks = useTaskStore((state) => state.initialize);
  const initializeRenewals = useRenewalStore((state) => state.initialize);
  const allRenewals = useRenewalStore((state) => state.renewals);

  useEffect(() => {
    initializeProjects(initialProjects);
    initializeTasks(initialTasks);
    initializeRenewals(initialRenewals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");

  // Round 6, secção 22-23: "Próxima renovação" e o filtro "Com renovação
  // próxima" deixam de ler o `BusinessSummary` congelado do servidor — cada
  // linha é recalculada ao vivo a partir dos `projectIds` estruturais
  // (estáveis) desse negócio contra a `useRenewalStore` atual. Mesma janela
  // já existente (`RENEWALS_PANEL_WINDOW_DAYS`) — não se inventa uma regra nova.
  const liveRows = useMemo(
    () =>
      rows.map((row) => {
        const nextRenewal = getNextPendingRenewalForProjects(allRenewals, row.projectIds);
        const hasUpcomingRenewal =
          nextRenewal !== null && diffCalendarDays(nextRenewal.dueDate, today) <= RENEWALS_PANEL_WINDOW_DAYS;
        return {
          ...row,
          hasUpcomingRenewal,
          summary: { ...row.summary, nextRenewal },
        };
      }),
    [rows, allRenewals, today],
  );

  const filteredRows = useMemo(
    () => liveRows.filter((row) => matchesQuery(row, query) && matchesFilter(row, filter)),
    [liveRows, query, filter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por nome ou indústria…"
            className="pl-8"
            aria-label="Pesquisar clientes"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0">
          {CLIENT_FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? "secondary" : "outline"}
              onClick={() => setFilter(option.value)}
              className="shrink-0"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <EntityListTable
        rows={filteredRows}
        rowKey={(row) => row.summary.business.id}
        renderMobileCard={(row) => (
          <BusinessCard
            row={row}
            initialProjects={initialProjects}
            initialTasks={initialTasks}
            initialMaintenanceRequests={initialMaintenanceRequests}
          />
        )}
        emptyState={
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Experimenta ajustar a pesquisa ou os filtros."
          />
        }
        columns={[
          {
            header: "Negócio",
            cell: (row) => (
              <Link
                href={`/businesses/${row.summary.business.id}`}
                className="block hover:text-info hover:underline"
              >
                <p className="font-medium text-foreground">{row.summary.business.name}</p>
                <p className="text-xs text-muted-foreground">{row.summary.business.industry}</p>
              </Link>
            ),
          },
          {
            header: "Estado",
            cell: (row) => (
              <LiveOverallStatusBadge
                businessId={row.businessId}
                projectIds={row.projectIds}
                dealIds={row.dealIds}
                initialMaintenanceRequests={initialMaintenanceRequests}
                initialProjects={initialProjects}
                initialTasks={initialTasks}
              />
            ),
          },
          {
            header: "Projetos",
            cell: (row) => (
              <ActiveProjectsCell row={row} initialProjects={initialProjects} initialTasks={initialTasks} />
            ),
          },
          {
            header: "Pagamentos",
            className: "min-w-[180px]",
            cell: (row) => <PaymentProgress summary={row.summary.paymentSummary} compact />,
          },
          {
            header: "Próxima renovação",
            cell: (row) =>
              row.summary.nextRenewal ? (
                <span className="text-muted-foreground">
                  {renewalTypeLabel(row.summary.nextRenewal.type)} ·{" "}
                  {formatDateDisplay(row.summary.nextRenewal.dueDate)}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            header: "Tarefas",
            cell: (row) => (
              <OpenTasksCell row={row} initialProjects={initialProjects} initialTasks={initialTasks} />
            ),
          },
          {
            header: "Responsável",
            cell: (row) => (
              <span className="text-muted-foreground">{row.responsibleName ?? "—"}</span>
            ),
          },
        ]}
      />
    </div>
  );
}

interface LiveCellProps {
  row: ClientListRow;
  initialProjects: Project[];
  initialTasks: Task[];
}

/**
 * "Projetos" — `hasWebsite`/`hasPiriCard` continuam estáticos (não são
 * editáveis nesta fase); só a contagem de ativos é ao vivo (Round 5.1).
 */
function ActiveProjectsCell({ row, initialProjects, initialTasks }: LiveCellProps) {
  const { activeProjectsCount } = useLiveBusinessCounts({
    businessId: row.businessId,
    projectIds: row.projectIds,
    dealIds: row.dealIds,
    maintenanceRequestIds: row.maintenanceRequests.map((m) => m.id),
    initialProjects,
    initialTasks,
  });

  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
      <span className={cn("flex items-center gap-1", row.summary.hasWebsite && "text-info")}>
        <Globe className="h-3.5 w-3.5" />
      </span>
      <span className={cn("flex items-center gap-1", row.summary.hasPiriCard && "text-info")}>
        <CreditCard className="h-3.5 w-3.5" />
      </span>
      <span>{activeProjectsCount} ativos</span>
    </div>
  );
}

/** "Tarefas" — contagem ao vivo (Round 5.1), já não presa ao summary do servidor. */
function OpenTasksCell({ row, initialProjects, initialTasks }: LiveCellProps) {
  const { openTasksCount } = useLiveBusinessCounts({
    businessId: row.businessId,
    projectIds: row.projectIds,
    dealIds: row.dealIds,
    maintenanceRequestIds: row.maintenanceRequests.map((m) => m.id),
    initialProjects,
    initialTasks,
  });

  return <span className="text-muted-foreground">{openTasksCount}</span>;
}
