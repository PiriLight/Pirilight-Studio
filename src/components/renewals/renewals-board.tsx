"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { RefreshCw } from "lucide-react";

import { NewRenewalButton } from "@/components/renewals/new-renewal-button";
import { RenewalFormDialog } from "@/components/renewals/renewal-form-dialog";
import { RenewalListSection } from "@/components/renewals/renewal-list-section";
import {
  DEFAULT_RENEWAL_FILTERS,
  RENEWAL_STATUS_FILTERS,
  RENEWAL_TIME_FILTERS,
  filterRenewalRows,
  type RenewalFilterState,
} from "@/components/renewals/renewal-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { buildRenewalListRow, groupRenewalsByTiming, type RenewalBuckets } from "@/lib/data/renewal-board";
import { deriveResponsibleUserId } from "@/lib/data/business-overview";
import { cn } from "@/lib/utils";
import { useRenewalStore } from "@/store/use-renewal-store";
import type { Business, Deal, Project, Renewal, RenewalListRow, User } from "@/types";

interface RenewalsBoardProps {
  /** Já junto (Renewal+Project+Business+responsável) pelo servidor — primeira pintura + seed da store. */
  initialRows: RenewalListRow[];
  /** Snapshots globais — para voltar a juntar as Renewals ao vivo (incl. se o Project de uma Renewal mudar na edição). */
  projects: Project[];
  businesses: Business[];
  deals: Deal[];
  users: User[];
  today: string;
}

function matchesRenewalQuery(row: RenewalListRow, query: string): boolean {
  if (query.trim().length === 0) return true;
  const haystack = `${row.business.name} ${row.project.name}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

/**
 * `/renewals` por inteiro — semeia a `useRenewalStore` a partir do snapshot
 * do servidor, filtra, agrupa pela hierarquia operacional e trata das
 * interações (criar/editar/marcar como renovada/cancelar/reabrir). Mesma
 * estrutura de `TasksBoard` (Round 4).
 */
export function RenewalsBoard({ initialRows, projects, businesses, deals, users, today }: RenewalsBoardProps) {
  const initializeRenewals = useRenewalStore((state) => state.initialize);
  const liveRenewals = useRenewalStore((state) => state.renewals);

  useEffect(() => {
    initializeRenewals(initialRows.map((row) => row.renewal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<RenewalFilterState>(DEFAULT_RENEWAL_FILTERS);
  const [editingRenewal, setEditingRenewal] = useState<Renewal | null>(null);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const businessById = useMemo(() => new Map(businesses.map((business) => [business.id, business])), [businesses]);
  const dealsByBusinessId = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const deal of deals) {
      const list = map.get(deal.businessId) ?? [];
      list.push(deal);
      map.set(deal.businessId, list);
    }
    return map;
  }, [deals]);

  // Volta a juntar cada Renewal ao vivo com o seu Project/Business/responsável
  // — nunca reaproveita o `row` estático do servidor: se uma edição mudar o
  // Project de uma Renewal, o negócio/responsável têm de acompanhar.
  const rows = useMemo(() => {
    const result: RenewalListRow[] = [];
    for (const renewal of liveRenewals) {
      const project = projectById.get(renewal.projectId);
      if (project === undefined) continue;
      const business = businessById.get(project.businessId);
      if (business === undefined) continue;
      const responsibleUserId = deriveResponsibleUserId(dealsByBusinessId.get(business.id) ?? []);
      result.push(buildRenewalListRow(renewal, project, business, responsibleUserId, today));
    }
    return result;
  }, [liveRenewals, projectById, businessById, dealsByBusinessId, today]);

  // Os contadores do resumo refletem sempre o conjunto completo — nunca os filtros ativos (mesma regra de Tarefas).
  const summaryBuckets = useMemo(() => groupRenewalsByTiming(rows, today), [rows, today]);

  const filteredRows = useMemo(
    () => filterRenewalRows(rows, filters, today).filter((row) => matchesRenewalQuery(row, query)),
    [rows, filters, today, query],
  );
  const buckets = useMemo(() => groupRenewalsByTiming(filteredRows, today), [filteredRows, today]);

  const hasAnyRenewal = rows.length > 0;
  const hasVisibleRenewal = Object.values(buckets).some((bucket) => bucket.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <SummaryCounters buckets={summaryBuckets} filters={filters} onChangeFilters={setFilters} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar por negócio, projeto ou renovação…"
            aria-label="Pesquisar renovações"
          />
        </div>
        <NewRenewalButton businesses={businesses} projects={projects} />
      </div>

      <FiltersRow filters={filters} onChangeFilters={setFilters} users={users} />

      {!hasAnyRenewal && (
        <EmptyState icon={RefreshCw} title="Sem renovações" description="Ainda não há renovações registadas." />
      )}

      {hasAnyRenewal && !hasVisibleRenewal && (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma renovação com estes filtros"
          description="Experimenta ajustar os filtros de tempo, estado ou responsável."
        />
      )}

      <RenewalListSection title="Em atraso" items={buckets.overdue} today={today} userById={userById} onEdit={setEditingRenewal} />
      <RenewalListSection title="Hoje" items={buckets.dueToday} today={today} userById={userById} onEdit={setEditingRenewal} />
      <RenewalListSection title="Próximos 7 dias" items={buckets.dueSoon} today={today} userById={userById} onEdit={setEditingRenewal} />
      <RenewalListSection title="8–30 dias" items={buckets.upcoming} today={today} userById={userById} onEdit={setEditingRenewal} />
      <RenewalListSection title="31–60 dias" items={buckets.sixtyDays} today={today} userById={userById} onEdit={setEditingRenewal} />
      <RenewalListSection title="Mais tarde" items={buckets.later} today={today} userById={userById} onEdit={setEditingRenewal} />
      <RenewalListSection
        key={`renewed-${filters.status}`}
        title="Renovadas"
        items={buckets.renewed}
        today={today}
        userById={userById}
        onEdit={setEditingRenewal}
        collapsible={filters.status !== "renewed"}
      />
      <RenewalListSection
        key={`cancelled-${filters.status}`}
        title="Canceladas"
        items={buckets.cancelled}
        today={today}
        userById={userById}
        onEdit={setEditingRenewal}
        collapsible={filters.status !== "cancelled"}
      />

      <RenewalFormDialog
        key={editingRenewal ? editingRenewal.id : "closed"}
        open={editingRenewal !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRenewal(null);
        }}
        renewal={editingRenewal ?? undefined}
        businesses={businesses}
        projects={projects}
      />
    </div>
  );
}

/**
 * 4 contadores/atalhos (secção 9) — nunca um dataset paralelo: clicar um
 * aplica o mesmo filtro que o respetivo chip, e clicar de novo limpa-o.
 * Consideram só `pending` (via `groupRenewalsByTiming`, que já isola
 * `renewed`/`cancelled` nos seus próprios baldes).
 */
function SummaryCounters({
  buckets,
  filters,
  onChangeFilters,
}: {
  buckets: RenewalBuckets;
  filters: RenewalFilterState;
  onChangeFilters: Dispatch<SetStateAction<RenewalFilterState>>;
}) {
  const items = [
    {
      label: "Em atraso",
      count: buckets.overdue.length,
      active: filters.time === "overdue",
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: prev.time === "overdue" ? "all" : "overdue" })),
    },
    {
      label: "Hoje",
      count: buckets.dueToday.length,
      active: filters.time === "today",
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: prev.time === "today" ? "all" : "today" })),
    },
    {
      label: "Próximos 7 dias",
      count: buckets.dueSoon.length,
      active: filters.time === "week",
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: prev.time === "week" ? "all" : "week" })),
    },
    {
      label: "8–30 dias",
      count: buckets.upcoming.length,
      active: filters.time === "month",
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: prev.time === "month" ? "all" : "month" })),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <span className="text-xl font-semibold text-foreground">{item.count}</span>
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
  filters: RenewalFilterState;
  onChangeFilters: Dispatch<SetStateAction<RenewalFilterState>>;
  users: User[];
}) {
  const responsibleOptions = [
    { value: "all", label: "Todos" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <ChipRow
        options={RENEWAL_TIME_FILTERS}
        value={filters.time}
        onSelect={(time) => onChangeFilters((prev) => ({ ...prev, time }))}
      />
      <ChipRow
        options={responsibleOptions}
        value={filters.responsible}
        onSelect={(responsible) => onChangeFilters((prev) => ({ ...prev, responsible }))}
      />
      <ChipRow
        options={RENEWAL_STATUS_FILTERS}
        value={filters.status}
        onSelect={(status) => onChangeFilters((prev) => ({ ...prev, status }))}
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
