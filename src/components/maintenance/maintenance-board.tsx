"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Wrench } from "lucide-react";

import {
  DEFAULT_MAINTENANCE_FILTERS,
  MAINTENANCE_PRIORITY_FILTERS,
  MAINTENANCE_STATUS_FILTERS,
  MAINTENANCE_TIME_FILTERS,
  filterMaintenanceRows,
  type MaintenanceFilterState,
} from "@/components/maintenance/maintenance-filters";
import { MaintenanceDetailDialog } from "@/components/maintenance/maintenance-detail-dialog";
import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog";
import { MaintenanceListSection } from "@/components/maintenance/maintenance-list-section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  buildMaintenanceListRow,
  countBlockedMaintenanceRequests,
  groupMaintenanceByTiming,
  type MaintenanceBuckets,
} from "@/lib/data/maintenance-board";
import { cn } from "@/lib/utils";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import type { Business, MaintenanceListRow, MaintenanceRequest, Project, User } from "@/types";

interface MaintenanceBoardProps {
  /** Já junto (MaintenanceRequest+Project+Business) pelo servidor — primeira pintura + seed da store. */
  initialRows: MaintenanceListRow[];
  /** Snapshots globais — para voltar a juntar os pedidos ao vivo. */
  projects: Project[];
  businesses: Business[];
  users: User[];
  today: string;
}

/**
 * `/maintenance` por inteiro — semeia a `useMaintenanceStore` a partir do
 * snapshot do servidor, filtra, agrupa pela hierarquia (`groupMaintenanceByTiming`)
 * e trata das interações (criar/editar/mudar estado/abrir detalhe). Mesma
 * estrutura de `RenewalsBoard`/`GoalsBoard`.
 */
export function MaintenanceBoard({ initialRows, projects, businesses, users, today }: MaintenanceBoardProps) {
  const initializeRequests = useMaintenanceStore((state) => state.initialize);
  const liveRequests = useMaintenanceStore((state) => state.requests);

  useEffect(() => {
    initializeRequests(initialRows.map((row) => row.request));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MaintenanceFilterState>(DEFAULT_MAINTENANCE_FILTERS);
  const [openRow, setOpenRow] = useState<MaintenanceListRow | null>(null);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const businessById = useMemo(() => new Map(businesses.map((business) => [business.id, business])), [businesses]);

  // Volta a juntar cada pedido ao vivo com o seu Project/Business — nunca
  // reaproveita a `row` estática do servidor: se uma edição mudar o Project
  // de um pedido, o negócio tem de acompanhar (secção 16 do pedido).
  const rows = useMemo(() => {
    const result: MaintenanceListRow[] = [];
    for (const request of liveRequests) {
      const row = buildMaintenanceListRow(request, projectById, businessById);
      if (row !== null) result.push(row);
    }
    return result;
  }, [liveRequests, projectById, businessById]);

  // O resumo do topo reflete sempre o conjunto completo — nunca os filtros ativos (mesma regra de Tarefas/Renovações).
  const summaryBuckets = useMemo(() => groupMaintenanceByTiming(rows, today), [rows, today]);
  const blockedCount = useMemo(() => countBlockedMaintenanceRequests(rows), [rows]);

  const filteredRows = useMemo(
    () => filterMaintenanceRows(rows, filters, query, today),
    [rows, filters, query, today],
  );
  const buckets = useMemo(() => groupMaintenanceByTiming(filteredRows, today), [filteredRows, today]);

  const hasAnyRequest = rows.length > 0;
  const hasVisibleRequest = Object.values(buckets).some((bucket) => bucket.length > 0);

  // `openRow` aponta sempre para a versão viva do pedido selecionado — assim
  // "Atualizar estado"/edição refletem-se de imediato no próprio detalhe já
  // aberto, sem o ter de fechar e reabrir (mesmo princípio do Goal Detail).
  const liveOpenRow = useMemo(
    () => (openRow ? (rows.find((row) => row.request.id === openRow.request.id) ?? null) : null),
    [openRow, rows],
  );

  function openEdit(row: MaintenanceListRow) {
    setOpenRow(null);
    setEditingRequest(row.request);
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryCounters buckets={summaryBuckets} blockedCount={blockedCount} filters={filters} onChangeFilters={setFilters} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por título, negócio ou projeto…"
            aria-label="Pesquisar pedidos de manutenção"
          />
        </div>
      </div>

      <FiltersRow filters={filters} onChangeFilters={setFilters} users={users} />

      {!hasAnyRequest && (
        <EmptyState icon={Wrench} title="Sem pedidos" description="Ainda não há pedidos de manutenção registados." />
      )}

      {hasAnyRequest && !hasVisibleRequest && (
        <EmptyState
          icon={Wrench}
          title="Nenhum pedido com estes filtros"
          description="Experimenta ajustar os filtros de prazo, estado, responsável ou prioridade."
        />
      )}

      <MaintenanceListSection title="Em atraso" items={buckets.overdue} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection title="Hoje" items={buckets.dueToday} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection title="Bloqueados" items={buckets.blocked} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection title="Próximos 7 dias" items={buckets.dueSoon} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection title="Futuras" items={buckets.future} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection title="Sem prazo" items={buckets.noDate} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection title="À espera do cliente" items={buckets.waitingOnClient} today={today} userById={userById} onOpen={setOpenRow} onEdit={openEdit} />
      <MaintenanceListSection
        title="Concluídos"
        items={buckets.done}
        today={today}
        userById={userById}
        onOpen={setOpenRow}
        onEdit={openEdit}
        collapsible
      />

      <MaintenanceDetailDialog
        row={liveOpenRow}
        onOpenChange={(open) => {
          if (!open) setOpenRow(null);
        }}
        onEdit={() => {
          if (liveOpenRow) openEdit(liveOpenRow);
        }}
        userById={userById}
        today={today}
      />

      <MaintenanceFormDialog
        key={editingRequest ? editingRequest.id : "closed"}
        open={editingRequest !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRequest(null);
        }}
        request={editingRequest ?? undefined}
        projects={projects}
        businesses={businesses}
        users={users}
        today={today}
      />
    </div>
  );
}

/**
 * 5 indicadores (secção 7 do pedido) — clicáveis como atalho de filtro,
 * exceto "Bloqueados" (conta TODOS os `blocked`, mesmo os que aparecem
 * visualmente em "Em atraso"/"Hoje" — secção 8; não há um filtro de tempo
 * "blocked" correspondente a isolar, o estado já tem o seu próprio filtro
 * em `FiltersRow`).
 */
function SummaryCounters({
  buckets,
  blockedCount,
  filters,
  onChangeFilters,
}: {
  buckets: MaintenanceBuckets;
  blockedCount: number;
  filters: MaintenanceFilterState;
  onChangeFilters: Dispatch<SetStateAction<MaintenanceFilterState>>;
}) {
  const isOverdueActive = filters.time === "overdue";
  const isTodayActive = filters.time === "today";
  const isWeekActive = filters.time === "week";
  const isBlockedActive = filters.status === "blocked";
  const isWaitingActive = filters.status === "waiting_on_client";

  const items = [
    {
      label: "Em atraso",
      value: buckets.overdue.length,
      active: isOverdueActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: isOverdueActive ? "all" : "overdue" })),
    },
    {
      label: "Hoje",
      value: buckets.dueToday.length,
      active: isTodayActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: isTodayActive ? "all" : "today" })),
    },
    {
      label: "Próximos 7 dias",
      value: buckets.dueSoon.length,
      active: isWeekActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: isWeekActive ? "all" : "week" })),
    },
    {
      label: "Bloqueados",
      value: blockedCount,
      active: isBlockedActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, status: isBlockedActive ? "all" : "blocked" })),
    },
    {
      label: "À espera do cliente",
      value: buckets.waitingOnClient.length,
      active: isWaitingActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, status: isWaitingActive ? "all" : "waiting_on_client" })),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
            item.active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/40",
          )}
        >
          <span className="text-xl font-semibold text-foreground">{item.value}</span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function FiltersRow({
  filters,
  onChangeFilters,
  users,
}: {
  filters: MaintenanceFilterState;
  onChangeFilters: Dispatch<SetStateAction<MaintenanceFilterState>>;
  users: User[];
}) {
  const responsibleOptions = [
    { value: "all", label: "Todos" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
    { value: "unassigned", label: "Não atribuído" },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <ChipRow
        options={MAINTENANCE_TIME_FILTERS}
        value={filters.time}
        onSelect={(time) => onChangeFilters((prev) => ({ ...prev, time }))}
      />
      <ChipRow
        options={MAINTENANCE_STATUS_FILTERS}
        value={filters.status}
        onSelect={(status) => onChangeFilters((prev) => ({ ...prev, status }))}
      />
      <ChipRow
        options={responsibleOptions}
        value={filters.responsible}
        onSelect={(responsible) => onChangeFilters((prev) => ({ ...prev, responsible }))}
      />
      <ChipRow
        options={MAINTENANCE_PRIORITY_FILTERS}
        value={filters.priority}
        onSelect={(priority) => onChangeFilters((prev) => ({ ...prev, priority }))}
      />
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
