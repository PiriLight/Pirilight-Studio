"use client";

import { useEffect, useMemo, useState } from "react";

import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListSection } from "@/components/tasks/task-list-section";
import { EmptyState } from "@/components/ui/empty-state";
import { buildTasksWithDetail, groupTasksByUrgency } from "@/lib/data/task-board";
import { useTaskStore } from "@/store/use-task-store";
import type { Business, Deal, MaintenanceRequest, Project, Task, User } from "@/types";

interface BusinessTasksTabProps {
  business: Business;
  projects: Project[];
  deals: Deal[];
  maintenanceRequests: MaintenanceRequest[];
  users: User[];
  userById: Map<string, User>;
  /** Snapshot global do servidor — só para semear a `useTaskStore` se ainda não estiver inicializada. */
  initialTasks: Task[];
  today: string;
}

/**
 * A tab "Tarefas" do Business Detail Hub, agora ligada à mesma
 * `useTaskStore` que `/tasks` — a mesma lógica de agrupamento
 * (`TaskListSection`/`groupTasksByUrgency`), filtrada a este negócio, para
 * nunca haver duas cópias divergentes da mesma Task (Round 4, secção 12).
 *
 * A resolução de Business/Project usa só os dados já scoped deste negócio
 * (`overview.projects/deals/maintenanceRequests`) — uma Task só resolve
 * `businessId === business.id` se estiver mesmo ligada a algo deste negócio,
 * por isso não é preciso ir buscar as listas globais só para filtrar aqui.
 */
export function BusinessTasksTab({
  business,
  projects,
  deals,
  maintenanceRequests,
  users,
  userById,
  initialTasks,
  today,
}: BusinessTasksTabProps) {
  const initialize = useTaskStore((state) => state.initialize);
  const allTasks = useTaskStore((state) => state.tasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    initialize(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemsForBusiness = useMemo(() => {
    const withDetail = buildTasksWithDetail(allTasks, {
      businesses: [business],
      projects,
      deals,
      maintenanceRequests,
    });
    return withDetail.filter((item) => item.businessId === business.id);
  }, [allTasks, business, projects, deals, maintenanceRequests]);

  const buckets = useMemo(() => groupTasksByUrgency(itemsForBusiness, today), [itemsForBusiness, today]);

  if (itemsForBusiness.length === 0) {
    return (
      <EmptyState title="Sem tarefas" description="Nenhuma tarefa ligada a este negócio ou aos seus projetos." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskListSection
        title="Atrasadas"
        items={buckets.overdue}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        showBusiness={false}
      />
      <TaskListSection
        title="Hoje"
        items={buckets.dueToday}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        showBusiness={false}
      />
      <TaskListSection
        title="Próximos 7 dias"
        items={buckets.dueSoon}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        showBusiness={false}
      />
      <TaskListSection
        title="Futuras"
        items={buckets.future}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        showBusiness={false}
      />
      <TaskListSection
        title="À espera do cliente"
        items={buckets.waitingOnClient}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        showBusiness={false}
      />
      <TaskListSection
        title="Concluídas"
        items={buckets.done}
        today={today}
        userById={userById}
        onEdit={setEditingTask}
        showBusiness={false}
        collapsible
      />

      <TaskFormDialog
        key={editingTask ? editingTask.id : "closed"}
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask ?? undefined}
        businesses={[business]}
        projects={projects}
        users={users}
      />
    </div>
  );
}
