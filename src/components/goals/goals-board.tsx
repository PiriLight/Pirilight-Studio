"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Target } from "lucide-react";

import { EntityListTable, type EntityListColumn } from "@/components/domain/entity-list-table";
import { GoalDetailDialog } from "@/components/goals/goal-detail-dialog";
import {
  DEFAULT_GOAL_FILTERS,
  GOAL_STATUS_FILTERS,
  GOAL_TIMEFRAME_FILTERS,
  filterGoals,
  type GoalFilterState,
} from "@/components/goals/goal-filters";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { goalTimeframeLabel } from "@/lib/constants/labels";
import { deriveGoalStatus, goalOwnerLabel } from "@/lib/data/goal-board";
import { cn } from "@/lib/utils";
import { useGoalStore } from "@/store/use-goal-store";
import { useTaskStore } from "@/store/use-task-store";
import type { Goal, Task, User } from "@/types";

interface GoalsBoardProps {
  /** Já vem do servidor — primeira pintura + seed da `useGoalStore`. */
  initialGoals: Goal[];
  /** Idem para `useTaskStore` — as Tasks ligadas resolvem-se sempre ao vivo. */
  initialTasks: Task[];
  users: User[];
  today: string;
}

/**
 * `in_progress` primeiro (menos progresso primeiro — é o que precisa de mais
 * atenção), `done` no fim (mais recentemente atualizado primeiro). Puramente
 * de apresentação — ao contrário de `groupTasksByUrgency`/
 * `groupRenewalsByTiming`, só há um consumidor desta ordenação, por isso fica
 * local ao componente em vez de em `lib/data`.
 */
function sortGoalsForDisplay(goals: readonly Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const aDone = a.progress >= 100;
    const bDone = b.progress >= 100;
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (!aDone) return a.progress - b.progress;
    return a.updatedAt > b.updatedAt ? -1 : 1;
  });
}

function tasksCountLabel(count: number): string {
  if (count === 0) return "Sem tarefas ligadas";
  return `${count} ${count === 1 ? "tarefa ligada" : "tarefas ligadas"}`;
}

/**
 * `/goals` por inteiro — semeia `useGoalStore`/`useTaskStore` a partir do
 * snapshot do servidor, filtra, e trata das interações (criar/editar/
 * atualizar progresso/abrir detalhe). Mesma estrutura de `RenewalsBoard`/
 * `TasksBoard` (Round 4/6).
 */
export function GoalsBoard({ initialGoals, initialTasks, users, today }: GoalsBoardProps) {
  const initializeGoals = useGoalStore((state) => state.initialize);
  const goals = useGoalStore((state) => state.goals);
  const initializeTasks = useTaskStore((state) => state.initialize);
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    initializeGoals(initialGoals);
    initializeTasks(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<GoalFilterState>(DEFAULT_GOAL_FILTERS);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [creatingFromEmpty, setCreatingFromEmpty] = useState(false);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const filteredGoals = useMemo(
    () => sortGoalsForDisplay(filterGoals(goals, filters, query)),
    [goals, filters, query],
  );

  // Resolvido sempre a partir da store ao vivo (nunca a linha estática de
  // quando o dialog abriu) — "Atualizar progresso" dentro do detalhe reflete-se
  // de imediato no próprio detalhe, sem o ter de fechar e reabrir.
  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const hasAnyGoal = goals.length > 0;
  const hasVisibleGoal = filteredGoals.length > 0;

  function openEdit(goal: Goal) {
    setSelectedGoalId(null);
    setEditingGoal(goal);
  }

  const columns: EntityListColumn<Goal>[] = [
    {
      header: "Objetivo",
      className: "w-[38%]",
      cell: (goal) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{goal.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {goalTimeframeLabel(goal.timeframe)} · {goalOwnerLabel(goal.ownerId, userById)}
          </p>
        </div>
      ),
    },
    {
      header: "Progresso",
      cell: (goal) => (
        <div className="w-40">
          <GoalProgressBar progress={goal.progress} />
        </div>
      ),
    },
    {
      header: "Tarefas",
      cell: (goal) => <span className="text-muted-foreground">{tasksCountLabel(goal.linkedTaskIds.length)}</span>,
    },
    { header: "Estado", cell: (goal) => <GoalStatusBadge progress={goal.progress} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SummaryCounters goals={goals} filters={filters} onChangeFilters={setFilters} />

      <div className="w-full sm:max-w-xs">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar por título…"
          aria-label="Pesquisar objetivos"
        />
      </div>

      <FiltersRow filters={filters} onChangeFilters={setFilters} users={users} />

      {!hasAnyGoal && (
        <EmptyState
          icon={Target}
          title="Nenhum objetivo definido."
          description="Cria a primeira meta da PiriLight Studio ou da PiriCard."
          action={
            <Button size="sm" onClick={() => setCreatingFromEmpty(true)}>
              Criar primeiro objetivo
            </Button>
          }
        />
      )}

      {hasAnyGoal && !hasVisibleGoal && (
        <EmptyState
          icon={Target}
          title="Nenhum objetivo com estes filtros"
          description="Experimenta ajustar o período, o responsável, o estado ou a pesquisa."
        />
      )}

      {hasVisibleGoal && (
        <EntityListTable
          rows={filteredGoals}
          rowKey={(goal) => goal.id}
          columns={columns}
          onRowClick={(goal) => setSelectedGoalId(goal.id)}
          renderMobileCard={(goal) => <GoalCard goal={goal} userById={userById} />}
        />
      )}

      <GoalDetailDialog
        goal={selectedGoal}
        onOpenChange={(open) => {
          if (!open) setSelectedGoalId(null);
        }}
        onEdit={() => {
          if (selectedGoal) openEdit(selectedGoal);
        }}
        users={users}
        tasks={tasks}
        today={today}
      />

      <GoalFormDialog
        key={editingGoal ? editingGoal.id : "closed"}
        open={editingGoal !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditingGoal(undefined);
        }}
        goal={editingGoal}
        users={users}
        tasks={tasks}
      />

      <GoalFormDialog
        key={creatingFromEmpty ? "empty-new" : "empty-closed"}
        open={creatingFromEmpty}
        onOpenChange={setCreatingFromEmpty}
        users={users}
        tasks={tasks}
      />
    </div>
  );
}

/**
 * 4 indicadores (secção "resumo compacto" do pedido). "Em curso"/"Concluídos"/
 * "Da empresa" são atalhos para os filtros correspondentes (clicar de novo
 * limpa); "Com tarefas" fica só informativo — não corresponde a nenhum dos 3
 * grupos de filtro pedidos (Período/Responsável/Estado), e inventar um 4º
 * eixo de filtro só para isto não foi pedido.
 */
function SummaryCounters({
  goals,
  filters,
  onChangeFilters,
}: {
  goals: Goal[];
  filters: GoalFilterState;
  onChangeFilters: Dispatch<SetStateAction<GoalFilterState>>;
}) {
  const isInProgressActive = filters.status === "in_progress";
  const isDoneActive = filters.status === "done";
  const isCompanyActive = filters.owner === "company";

  const items = [
    {
      label: "Em curso",
      value: goals.filter((goal) => deriveGoalStatus(goal.progress) === "in_progress").length,
      active: isInProgressActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, status: isInProgressActive ? "all" : "in_progress" })),
    },
    {
      label: "Concluídos",
      value: goals.filter((goal) => deriveGoalStatus(goal.progress) === "done").length,
      active: isDoneActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, status: isDoneActive ? "all" : "done" })),
    },
    {
      label: "Da empresa",
      value: goals.filter((goal) => goal.ownerId === null).length,
      active: isCompanyActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, owner: isCompanyActive ? "all" : "company" })),
    },
    {
      label: "Com tarefas",
      value: goals.filter((goal) => goal.linkedTaskIds.length > 0).length,
      active: false,
      onClick: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={item.onClick === undefined}
          onClick={item.onClick}
          className={cn(
            "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
            item.active ? "border-primary bg-primary/10" : "border-border",
            item.onClick !== undefined && !item.active && "hover:bg-accent/40",
            item.onClick === undefined && "cursor-default",
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
  filters: GoalFilterState;
  onChangeFilters: Dispatch<SetStateAction<GoalFilterState>>;
  users: User[];
}) {
  const ownerOptions = [
    { value: "all", label: "Todos" },
    { value: "company", label: "Empresa" },
    ...users.map((user) => ({ value: user.id, label: user.name })),
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <ChipRow
        options={GOAL_TIMEFRAME_FILTERS}
        value={filters.timeframe}
        onSelect={(timeframe) => onChangeFilters((prev) => ({ ...prev, timeframe }))}
      />
      <ChipRow
        options={ownerOptions}
        value={filters.owner}
        onSelect={(owner) => onChangeFilters((prev) => ({ ...prev, owner }))}
      />
      <ChipRow
        options={GOAL_STATUS_FILTERS}
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

function GoalCard({ goal, userById }: { goal: Goal; userById: Map<string, User> }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{goal.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {goalTimeframeLabel(goal.timeframe)} · {goalOwnerLabel(goal.ownerId, userById)}
          </p>
        </div>
        <GoalStatusBadge progress={goal.progress} className="shrink-0" />
      </div>

      <div className="mt-2.5">
        <GoalProgressBar progress={goal.progress} />
      </div>

      <div className="mt-2.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
        {tasksCountLabel(goal.linkedTaskIds.length)}
      </div>
    </Card>
  );
}
