"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ListChecks } from "lucide-react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListSection } from "@/components/tasks/task-list-section";
import {
  DEFAULT_TASK_FILTERS,
  TASK_STATUS_FILTERS,
  TASK_TIME_FILTERS,
  filterTasks,
  type TaskFilterState,
} from "@/components/tasks/task-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { buildTasksWithDetail, groupTasksByUrgency, type TaskBuckets } from "@/lib/data/task-board";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/use-task-store";
import type { Business, Deal, MaintenanceRequest, Project, Task, User } from "@/types";

interface TasksBoardProps {
  initialTasks: Task[];
  users: User[];
  businesses: Business[];
  projects: Project[];
  deals: Deal[];
  maintenanceRequests: MaintenanceRequest[];
  today: string;
}

/**
 * `/tasks` por inteiro: semeia a `useTaskStore` a partir do snapshot do
 * servidor, filtra, agrupa pela hierarquia de urgência e trata das
 * interações rápidas (concluir/reabrir/mudar estado/editar).
 */
export function TasksBoard({
  initialTasks,
  users,
  businesses,
  projects,
  deals,
  maintenanceRequests,
  today,
}: TasksBoardProps) {
  const initialize = useTaskStore((state) => state.initialize);
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    initialize(initialTasks);
    // `initialize` só semeia a store da primeira vez — não corre de novo por
    // ela mesma mudar de identidade a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_TASK_FILTERS);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const itemsWithDetail = useMemo(
    () => buildTasksWithDetail(tasks, { businesses, projects, deals, maintenanceRequests }),
    [tasks, businesses, projects, deals, maintenanceRequests],
  );

  // Os contadores do resumo refletem sempre o conjunto completo — nunca os filtros ativos (D10 do plano).
  const summaryBuckets = useMemo(() => groupTasksByUrgency(itemsWithDetail, today), [itemsWithDetail, today]);

  const filteredItems = useMemo(
    () => filterTasks(itemsWithDetail, filters, today),
    [itemsWithDetail, filters, today],
  );
  const buckets = useMemo(() => groupTasksByUrgency(filteredItems, today), [filteredItems, today]);

  const hasAnyTask = itemsWithDetail.length > 0;
  const hasVisibleTask = Object.values(buckets).some((bucket) => bucket.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <SummaryCounters buckets={summaryBuckets} filters={filters} onChangeFilters={setFilters} />
      <FiltersRow filters={filters} onChangeFilters={setFilters} users={users} />

      {!hasAnyTask && (
        <EmptyState icon={ListChecks} title="Sem tarefas" description="Ainda não há tarefas registadas." />
      )}

      {hasAnyTask && !hasVisibleTask && (
        <EmptyState
          icon={ListChecks}
          title="Nenhuma tarefa com estes filtros"
          description="Experimenta ajustar os filtros de tempo, responsável ou estado."
        />
      )}

      <TaskListSection
        title="Atrasadas"
        items={buckets.overdue}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
      />
      <TaskListSection
        title="Hoje"
        items={buckets.dueToday}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
      />
      <TaskListSection
        title="Próximos 7 dias"
        items={buckets.dueSoon}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
      />
      <TaskListSection
        title="Futuras"
        items={buckets.future}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
      />
      <TaskListSection
        title="À espera do cliente"
        items={buckets.waitingOnClient}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
      />
      <TaskListSection
        title="Concluídas"
        items={buckets.done}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        collapsible
      />

      <TaskFormDialog
        key={editingTask ? editingTask.id : "closed"}
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask ?? undefined}
        businesses={businesses}
        projects={projects}
        users={users}
      />
    </div>
  );
}

/**
 * 4 contadores/atalhos (secção 1 do plano) — nunca um dataset paralelo:
 * clicar um aplica o mesmo filtro que o respetivo chip, e clicar de novo
 * limpa-o.
 */
function SummaryCounters({
  buckets,
  filters,
  onChangeFilters,
}: {
  buckets: TaskBuckets;
  filters: TaskFilterState;
  onChangeFilters: Dispatch<SetStateAction<TaskFilterState>>;
}) {
  const isOverdueActive = filters.time === "overdue";
  const isTodayActive = filters.time === "today";
  const isWeekActive = filters.time === "week";
  const isWaitingActive = filters.status === "waiting_on_client";

  const items = [
    {
      label: "Atrasadas",
      count: buckets.overdue.length,
      active: isOverdueActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: isOverdueActive ? "all" : "overdue" })),
    },
    {
      label: "Hoje",
      count: buckets.dueToday.length,
      active: isTodayActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: isTodayActive ? "all" : "today" })),
    },
    {
      label: "Esta semana",
      count: buckets.dueSoon.length,
      active: isWeekActive,
      onClick: () => onChangeFilters((prev) => ({ ...prev, time: isWeekActive ? "all" : "week" })),
    },
    {
      label: "À espera do cliente",
      count: buckets.waitingOnClient.length,
      active: isWaitingActive,
      onClick: () =>
        onChangeFilters((prev) => ({ ...prev, status: isWaitingActive ? "all" : "waiting_on_client" })),
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
  filters: TaskFilterState;
  onChangeFilters: Dispatch<SetStateAction<TaskFilterState>>;
  users: User[];
}) {
  const assigneeOptions = [{ value: "all", label: "Todos" }, ...users.map((user) => ({ value: user.id, label: user.name }))];

  return (
    <div className="flex flex-col gap-2.5">
      <ChipRow
        options={TASK_TIME_FILTERS}
        value={filters.time}
        onSelect={(time) => onChangeFilters((prev) => ({ ...prev, time }))}
      />
      <ChipRow
        options={assigneeOptions}
        value={filters.assignee}
        onSelect={(assignee) => onChangeFilters((prev) => ({ ...prev, assignee }))}
      />
      <ChipRow
        options={TASK_STATUS_FILTERS}
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
