"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { TaskDueLabel } from "@/components/tasks/task-due-label";
import { EntityListTable, type EntityListColumn } from "@/components/domain/entity-list-table";
import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { priorityLabel } from "@/lib/constants/labels";
import type { Task, TaskWithDetail, User } from "@/types";

interface TaskListSectionProps {
  title: string;
  items: TaskWithDetail[];
  today: string;
  userById: Map<string, User>;
  onEdit: (task: Task) => void;
  /** `/tasks` mostra o negócio de cada linha; a tab do Business Detail já está scoped a um só, não repete. */
  showBusiness?: boolean;
  /** Website/PiriCard Detail já estão scoped a um só projeto — o nome seria sempre igual, por isso omite-se. */
  showProject?: boolean;
  /** "Concluídas" vem colapsada por defeito — mesmo padrão do "Fechados" em Comercial (Round 3.1). */
  collapsible?: boolean;
}

function contextLine(item: TaskWithDetail, showBusiness: boolean, showProject: boolean): string | null {
  const parts = [showBusiness ? item.businessName : null, showProject ? item.projectName : null].filter(
    (part): part is string => part !== null,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Uma secção da hierarquia de urgência (heading + contagem + lista) —
 * reaproveitada tal e qual em `/tasks` e na tab Tarefas do Business Detail,
 * para as duas nunca divergirem visualmente.
 */
export function TaskListSection({
  title,
  items,
  today,
  userById,
  onEdit,
  showBusiness = true,
  showProject = true,
  collapsible = false,
}: TaskListSectionProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  if (items.length === 0) return null;

  const columns: EntityListColumn<TaskWithDetail>[] = [
    {
      header: "Tarefa",
      cell: (item) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.task.title}</p>
          {contextLine(item, showBusiness, showProject) && (
            <p className="truncate text-xs text-muted-foreground">
              {contextLine(item, showBusiness, showProject)}
            </p>
          )}
          {item.task.waitingReason !== null && (
            <WaitingReasonTag reason={item.task.waitingReason} className="mt-1" />
          )}
        </div>
      ),
    },
    { header: "Estado", cell: (item) => <WorkStatusBadge status={item.task.status} /> },
    {
      header: "Prioridade",
      cell: (item) => <span className="text-muted-foreground">{priorityLabel(item.task.priority)}</span>,
    },
    {
      header: "Prazo",
      cell: (item) => <TaskDueLabel dueDate={item.task.dueDate} today={today} status={item.task.status} />,
    },
    {
      header: "Responsável",
      cell: (item) => <AssigneeCell user={userById.get(item.task.assigneeId)} />,
    },
    {
      header: "",
      className: "w-10",
      cell: (item) => <TaskActionsMenu task={item.task} onEdit={() => onEdit(item.task)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => collapsible && setExpanded((value) => !value)}
        className="flex items-center justify-between px-0.5 text-left"
        disabled={!collapsible}
      >
        <h2 className="text-sm font-semibold text-foreground">
          {title} <span className="font-normal text-muted-foreground">({items.length})</span>
        </h2>
        {collapsible && (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {expanded ? "Esconder" : "Mostrar"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        )}
      </button>

      {expanded && (
        <EntityListTable
          rows={items}
          rowKey={(item) => item.task.id}
          columns={columns}
          renderMobileCard={(item) => (
            <TaskCard
              item={item}
              today={today}
              userById={userById}
              onEdit={onEdit}
              showBusiness={showBusiness}
              showProject={showProject}
            />
          )}
        />
      )}
    </div>
  );
}

function AssigneeCell({ user }: { user: User | undefined }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {user && (
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[9px]">{user.initials}</AvatarFallback>
        </Avatar>
      )}
      <span>{user?.name ?? "—"}</span>
    </div>
  );
}

function TaskCard({
  item,
  today,
  userById,
  onEdit,
  showBusiness,
  showProject,
}: {
  item: TaskWithDetail;
  today: string;
  userById: Map<string, User>;
  onEdit: (task: Task) => void;
  showBusiness: boolean;
  showProject: boolean;
}) {
  const context = contextLine(item, showBusiness, showProject);

  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.task.title}</p>
          {context && <p className="truncate text-xs text-muted-foreground">{context}</p>}
        </div>
        <TaskActionsMenu task={item.task} onEdit={() => onEdit(item.task)} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <WorkStatusBadge status={item.task.status} />
        {item.task.waitingReason !== null && <WaitingReasonTag reason={item.task.waitingReason} />}
        <span className="text-xs text-muted-foreground">{priorityLabel(item.task.priority)}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-xs">
        <TaskDueLabel dueDate={item.task.dueDate} today={today} status={item.task.status} />
        <AssigneeCell user={userById.get(item.task.assigneeId)} />
      </div>
    </Card>
  );
}
