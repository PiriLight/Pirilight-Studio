"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { NextActionTiming } from "@/components/domain/next-action-timing";
import { PaymentProgress } from "@/components/domain/payment-progress";
import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
import {
  DEFAULT_PROJECT_FILTERS,
  PROJECT_STATUS_FILTERS,
  filterProjectRows,
  type ProjectFilterState,
} from "@/components/projects/project-filters";
import { EntityListTable, type EntityListColumn } from "@/components/domain/entity-list-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { deriveNextAction } from "@/lib/data/business-overview";
import { projectDetailHref } from "@/lib/data/project-overview";
import { getNextPendingRenewalForProjects } from "@/lib/data/renewal-board";
import { designStatusLabel, renewalTypeLabel, shippingStatusLabel } from "@/lib/constants/labels";
import { formatDateDisplay } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/use-project-store";
import { useRenewalStore } from "@/store/use-renewal-store";
import { useTaskStore } from "@/store/use-task-store";
import type { NextAction, Project, ProjectListRow, ProjectType, Renewal, Task, User } from "@/types";

interface ProjectsBoardProps {
  type: ProjectType;
  initialRows: ProjectListRow[];
  /** Snapshots globais do servidor — só para semear as stores se ainda não estiverem inicializadas. */
  initialProjects: Project[];
  initialTasks: Task[];
  initialRenewals: Renewal[];
  users: User[];
  today: string;
}

/**
 * `/websites` e `/piricards` por inteiro — a mesma estrutura de `/tasks`
 * (Round 4): contadores/atalhos, filtros combináveis, lista. Fica no cliente
 * (D6 do Round 5) para o estado e as tarefas abertas de cada Project
 * reagirem de imediato a uma mudança feita aqui, no detalhe, ou em `/tasks`.
 *
 * A "próxima ação"/"tarefas abertas" de cada linha são recalculadas ao vivo
 * com a MESMA `deriveNextAction` (nunca duplicada) sobre as Tasks lidas da
 * `useTaskStore`; a "próxima renovação" (Round 6, secção 24) é recalculada
 * ao vivo da mesma forma, via `getNextPendingRenewalForProjects` sobre a
 * `useRenewalStore` — o resto da linha (pagamento, responsável) fica como
 * veio do servidor, não é editável nesta fase.
 */
export function ProjectsBoard({
  type,
  initialRows,
  initialProjects,
  initialTasks,
  initialRenewals,
  users,
  today,
}: ProjectsBoardProps) {
  const initializeProjects = useProjectStore((state) => state.initialize);
  const liveProjects = useProjectStore((state) => state.projects);
  const initializeTasks = useTaskStore((state) => state.initialize);
  const allTasks = useTaskStore((state) => state.tasks);
  const initializeRenewals = useRenewalStore((state) => state.initialize);
  const allRenewals = useRenewalStore((state) => state.renewals);

  useEffect(() => {
    initializeProjects(initialProjects);
    initializeTasks(initialTasks);
    initializeRenewals(initialRenewals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<ProjectFilterState>(DEFAULT_PROJECT_FILTERS);

  const liveProjectById = useMemo(() => new Map(liveProjects.map((p) => [p.id, p])), [liveProjects]);
  const tasksByProjectId = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of allTasks) {
      if (task.relatedEntityType !== "project" || task.relatedEntityId === null) continue;
      const list = map.get(task.relatedEntityId) ?? [];
      list.push(task);
      map.set(task.relatedEntityId, list);
    }
    return map;
  }, [allTasks]);

  const rows: ProjectListRow[] = useMemo(
    () =>
      initialRows.map((row) => {
        const liveProject = liveProjectById.get(row.project.id) ?? row.project;
        const tasksForProject = tasksByProjectId.get(row.project.id) ?? [];
        const openTasksCount = tasksForProject.filter(
          (t) => t.status !== "done" && t.status !== "waiting_on_client",
        ).length;
        const nextAction = deriveNextAction(
          { tasks: tasksForProject, maintenanceRequests: row.maintenanceRequests },
          today,
        );
        const nextRenewal = getNextPendingRenewalForProjects(allRenewals, [row.project.id]);
        return { ...row, project: liveProject, openTasksCount, nextAction, nextRenewal };
      }),
    [initialRows, liveProjectById, tasksByProjectId, allRenewals, today],
  );

  const filteredRows = useMemo(() => filterProjectRows(rows, filters), [rows, filters]);

  const counters = useMemo(
    () => ({
      inProgress: rows.filter((r) => r.project.status === "in_progress").length,
      waiting: rows.filter((r) => r.project.status === "waiting_on_client").length,
      blocked: rows.filter((r) => r.project.status === "blocked").length,
      done: rows.filter((r) => r.project.status === "done").length,
    }),
    [rows],
  );

  const responsibleOptions = [
    { value: "all", label: "Todos" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <SummaryCounters counters={counters} filters={filters} onChangeFilters={setFilters} />

      <div className="flex flex-col gap-2.5">
        <ChipRow
          options={PROJECT_STATUS_FILTERS}
          value={filters.status}
          onSelect={(status) => setFilters((prev) => ({ ...prev, status }))}
        />
        <ChipRow
          options={responsibleOptions}
          value={filters.responsible}
          onSelect={(responsible) => setFilters((prev) => ({ ...prev, responsible }))}
        />
      </div>

      <EntityListTable
        rows={filteredRows}
        rowKey={(row) => row.project.id}
        renderMobileCard={(row) => <ProjectCard row={row} type={type} />}
        emptyState={
          <EmptyState
            title={type === "website" ? "Nenhum website encontrado" : "Nenhum PiriCard encontrado"}
            description="Experimenta ajustar os filtros."
          />
        }
        columns={buildColumns(type, users)}
      />
    </div>
  );
}

function buildColumns(type: ProjectType, users: User[]): EntityListColumn<ProjectListRow>[] {
  const nameByUserId = new Map(users.map((user) => [user.id, user.name]));

  const columns: EntityListColumn<ProjectListRow>[] = [
    {
      header: "Projeto",
      cell: (row: ProjectListRow) => (
        <Link href={projectDetailHref(row.project)} className="block hover:text-info hover:underline">
          <p className="font-medium text-foreground">{row.project.name}</p>
        </Link>
      ),
    },
    {
      header: "Negócio",
      cell: (row: ProjectListRow) => (
        <Link
          href={`/businesses/${row.business.id}`}
          className="text-muted-foreground hover:text-info hover:underline"
        >
          {row.business.name}
        </Link>
      ),
    },
  ];

  if (type === "website") {
    columns.push({
      header: "Domínio",
      cell: (row: ProjectListRow) => (
        <span className="text-muted-foreground">{row.website?.domain ?? "—"}</span>
      ),
    });
  } else {
    columns.push({
      header: "Produção",
      cell: (row: ProjectListRow) =>
        row.piriCard ? (
          <span className="text-muted-foreground">
            {designStatusLabel(row.piriCard.designStatus)} · {shippingStatusLabel(row.piriCard.shippingStatus)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    });
  }

  columns.push(
    {
      header: "Estado",
      cell: (row: ProjectListRow) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <WorkStatusBadge status={row.project.status} />
          {row.project.waitingReason !== null && <WaitingReasonTag reason={row.project.waitingReason} />}
        </div>
      ),
    },
    {
      header: "Responsável",
      cell: (row: ProjectListRow) => (
        <span className="text-muted-foreground">
          {row.responsibleUserId ? (nameByUserId.get(row.responsibleUserId) ?? "—") : "—"}
        </span>
      ),
    },
    {
      header: "Pagamento",
      className: "min-w-[160px]",
      cell: (row: ProjectListRow) => <PaymentProgress summary={row.paymentSummary} compact />,
    },
    {
      header: "Próxima renovação",
      cell: (row: ProjectListRow) =>
        row.nextRenewal ? (
          <span className="text-muted-foreground">
            {renewalTypeLabel(row.nextRenewal.type)} · {formatDateDisplay(row.nextRenewal.dueDate)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      header: "Tarefas",
      cell: (row: ProjectListRow) => <span className="text-muted-foreground">{row.openTasksCount}</span>,
    },
    {
      header: "Próxima ação",
      className: "min-w-[180px]",
      cell: (row: ProjectListRow) => <NextActionCell nextAction={row.nextAction} />,
    },
  );

  return columns;
}

function NextActionCell({ nextAction }: { nextAction: NextAction }) {
  if (nextAction.source === "none") {
    return <span className="text-xs text-muted-foreground">Sem ações pendentes</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-xs text-foreground">{nextAction.title}</span>
      <NextActionTiming nextAction={nextAction} />
    </div>
  );
}

function ProjectCard({ row, type }: { row: ProjectListRow; type: ProjectType }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <Link href={projectDetailHref(row.project)} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground hover:text-info hover:underline">
              {row.project.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.business.name}</p>
          </div>
          <WorkStatusBadge status={row.project.status} />
        </div>
      </Link>

      {row.project.waitingReason !== null && <WaitingReasonTag reason={row.project.waitingReason} />}

      <p className="text-xs text-muted-foreground">
        {type === "website"
          ? (row.website?.domain ?? "—")
          : row.piriCard
            ? `${designStatusLabel(row.piriCard.designStatus)} · ${shippingStatusLabel(row.piriCard.shippingStatus)}`
            : "—"}
      </p>

      <PaymentProgress summary={row.paymentSummary} compact />

      <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
        <span>
          {row.nextRenewal
            ? `${renewalTypeLabel(row.nextRenewal.type)} — ${formatDateDisplay(row.nextRenewal.dueDate)}`
            : "Sem renovações"}
        </span>
        <span>
          {row.openTasksCount} tarefa{row.openTasksCount === 1 ? "" : "s"}
        </span>
      </div>

      <NextActionCell nextAction={row.nextAction} />
    </Card>
  );
}

function SummaryCounters({
  counters,
  filters,
  onChangeFilters,
}: {
  counters: { inProgress: number; waiting: number; blocked: number; done: number };
  filters: ProjectFilterState;
  onChangeFilters: Dispatch<SetStateAction<ProjectFilterState>>;
}) {
  const items = [
    { label: "Em progresso", count: counters.inProgress, status: "in_progress" as const },
    { label: "À espera do cliente", count: counters.waiting, status: "waiting_on_client" as const },
    { label: "Bloqueados", count: counters.blocked, status: "blocked" as const },
    { label: "Sem trabalho ativo", count: counters.done, status: "done" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => {
        const active = filters.status === item.status;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() =>
              onChangeFilters((prev) => ({ ...prev, status: active ? "all" : item.status }))
            }
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40",
            )}
          >
            <span className="text-xl font-semibold text-foreground">{item.count}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? "secondary" : "outline"}
          onClick={() => onSelect(option.value)}
          className="shrink-0"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
