"use client";

import { useEffect, useMemo, useState } from "react";

import { NewTaskButton } from "@/components/tasks/new-task-button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskListSection } from "@/components/tasks/task-list-section";
import { EmptyState } from "@/components/ui/empty-state";
import { buildTasksWithDetail, groupTasksByUrgency } from "@/lib/data/task-board";
import { useTaskStore } from "@/store/use-task-store";
import type { Business, MaintenanceRequest, Project, Task, User } from "@/types";

interface ProjectTasksSectionProps {
  business: Business;
  project: Project;
  /** Já scoped a este projeto — nunca mutado nesta fase. */
  maintenanceRequests: MaintenanceRequest[];
  users: User[];
  userById: Map<string, User>;
  /** Snapshot global do servidor — só para semear a `useTaskStore` se ainda não estiver inicializada. */
  initialTasks: Task[];
  today: string;
}

/**
 * As Tasks do Website/PiriCard Detail — o `BusinessTasksTab` (Round 4)
 * filtrado por `projectId` em vez de `businessId`, com a MESMA `useTaskStore`
 * (secção 9 do Round 5: zero duplicação de estado — concluir uma Task aqui
 * reflete-se em `/tasks`, e vice-versa). "+ Nova tarefa" reaproveita o
 * `TaskFormDialog` existente, pré-preenchido com este Business+Project
 * (`defaultBusinessId`/`defaultProjectId`, D8) — sem um segundo formulário.
 */
export function ProjectTasksSection({
  business,
  project,
  maintenanceRequests,
  users,
  userById,
  initialTasks,
  today,
}: ProjectTasksSectionProps) {
  const initialize = useTaskStore((state) => state.initialize);
  const allTasks = useTaskStore((state) => state.tasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    initialize(initialTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemsForProject = useMemo(() => {
    const withDetail = buildTasksWithDetail(allTasks, {
      businesses: [business],
      projects: [project],
      deals: [],
      maintenanceRequests,
    });
    return withDetail.filter((item) => item.projectId === project.id);
  }, [allTasks, business, project, maintenanceRequests]);

  const buckets = useMemo(() => groupTasksByUrgency(itemsForProject, today), [itemsForProject, today]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Tarefas</h2>
        <NewTaskButton
          businesses={[business]}
          projects={[project]}
          users={users}
          defaultBusinessId={business.id}
          defaultProjectId={project.id}
        />
      </div>

      {itemsForProject.length === 0 ? (
        <EmptyState title="Sem tarefas" description="Nenhuma tarefa ligada a este projeto." />
      ) : (
        <div className="flex flex-col gap-6">
          <TaskListSection
            title="Atrasadas"
            items={buckets.overdue}
            today={today}
            userById={userById}
            onEdit={setEditingTask}
            showBusiness={false}
            showProject={false}
          />
          <TaskListSection
            title="Hoje"
            items={buckets.dueToday}
            today={today}
            userById={userById}
            onEdit={setEditingTask}
            showBusiness={false}
            showProject={false}
          />
          <TaskListSection
            title="Próximos 7 dias"
            items={buckets.dueSoon}
            today={today}
            userById={userById}
            onEdit={setEditingTask}
            showBusiness={false}
            showProject={false}
          />
          <TaskListSection
            title="Futuras"
            items={buckets.future}
            today={today}
            userById={userById}
            onEdit={setEditingTask}
            showBusiness={false}
            showProject={false}
          />
          <TaskListSection
            title="À espera do cliente"
            items={buckets.waitingOnClient}
            today={today}
            userById={userById}
            onEdit={setEditingTask}
            showBusiness={false}
            showProject={false}
          />
          <TaskListSection
            title="Concluídas"
            items={buckets.done}
            today={today}
            userById={userById}
            onEdit={setEditingTask}
            showBusiness={false}
            showProject={false}
            collapsible
          />
        </div>
      )}

      <TaskFormDialog
        key={editingTask ? editingTask.id : "closed"}
        open={editingTask !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        task={editingTask ?? undefined}
        businesses={[business]}
        projects={[project]}
        users={users}
      />
    </section>
  );
}
