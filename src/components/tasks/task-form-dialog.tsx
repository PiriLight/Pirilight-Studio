"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { priorityLabel, waitingReasonLabel, workStatusLabel } from "@/lib/constants/labels";
import { resolveTaskContext, type TaskFormRelatedEntityType } from "@/lib/data/task-board";
import { PRIORITIES } from "@/lib/validation/task";
import { WAITING_REASONS, WORK_STATUSES } from "@/lib/validation/work-status";
import { useTaskStore } from "@/store/use-task-store";
import type { Business, Priority, Project, Task, User, WaitingReason, WorkStatus } from "@/types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = criar; presente = editar essa Task. */
  task?: Task;
  businesses: Business[];
  projects: Project[];
  users: User[];
  /** Só em modo criação (Round 5) — pré-seleciona Negócio/Projeto ao abrir a partir do Website/PiriCard Detail. */
  defaultBusinessId?: string;
  defaultProjectId?: string;
}

interface FormState {
  title: string;
  assigneeId: string;
  status: WorkStatus;
  waitingReason: WaitingReason | null;
  priority: Priority;
  dueDate: string;
  businessId: string;
  projectId: string;
}

/** Business/Project resolvidos a partir da Task original, no momento em que o dialog abriu. */
interface InitialRelation {
  businessId: string;
  projectId: string;
}

function buildInitialState(
  task: Task | undefined,
  users: User[],
  businesses: Business[],
  projects: Project[],
  defaultBusinessId: string,
  defaultProjectId: string,
): { form: FormState; relation: InitialRelation } {
  if (task === undefined) {
    return {
      relation: { businessId: "", projectId: "" },
      form: {
        title: "",
        assigneeId: users[0]?.id ?? "",
        status: "todo",
        waitingReason: null,
        priority: "normal",
        dueDate: "",
        businessId: defaultBusinessId,
        projectId: defaultProjectId,
      },
    };
  }

  // Também resolve tasks ligadas a Deal/MaintenanceRequest (o formulário só
  // edita Business/Project — ver `computeRelation` e a nota de D12 no plano):
  // mostram-se pré-preenchidas, mas a relação original só muda se o
  // utilizador mexer mesmo nestes dois campos.
  const context = resolveTaskContext(task, { businesses, projects, deals: [], maintenanceRequests: [] });
  const relation: InitialRelation = { businessId: context.businessId ?? "", projectId: context.projectId ?? "" };

  return {
    relation,
    form: {
      title: task.title,
      assigneeId: task.assigneeId,
      status: task.status,
      waitingReason: task.waitingReason,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      businessId: relation.businessId,
      projectId: relation.projectId,
    },
  };
}

function computeRelation(
  businessId: string,
  projectId: string,
): { relatedEntityType: TaskFormRelatedEntityType | null; relatedEntityId: string | null } {
  if (projectId !== "") return { relatedEntityType: "project", relatedEntityId: projectId };
  if (businessId !== "") return { relatedEntityType: "business", relatedEntityId: businessId };
  return { relatedEntityType: null, relatedEntityId: null };
}

/**
 * Criar/editar uma Task — os dois modos no mesmo componente (`task` ausente
 * = criar). Um só `Dialog` centrado em vez de `Sheet` no mobile: funciona
 * bem também a ~390px e evita duplicar o formulário em dois sítios.
 *
 * O estado do formulário só é calculado uma vez, na montagem (`useState`
 * com inicializador preguiçoso) — quem usa este componente dá-lhe uma `key`
 * que muda sempre que se abre para criar ou para editar uma Task diferente
 * (ver `NewTaskButton`/`TasksBoard`), o que força um remount com estado
 * limpo. É mais simples e mais previsível do que sincronizar props para
 * estado num `useEffect`.
 */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  businesses,
  projects,
  users,
  defaultBusinessId = "",
  defaultProjectId = "",
}: TaskFormDialogProps) {
  const createTask = useTaskStore((state) => state.createTask);
  const updateTask = useTaskStore((state) => state.updateTask);

  const [{ form, relation: initialRelation }, setState] = useState(() =>
    buildInitialState(task, users, businesses, projects, defaultBusinessId, defaultProjectId),
  );
  const formId = useId();

  function updateForm(patch: Partial<FormState>) {
    setState((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));
  }

  function handleStatusChange(status: WorkStatus) {
    updateForm({
      status,
      waitingReason: status === "waiting_on_client" ? (form.waitingReason ?? WAITING_REASONS[0]) : null,
    });
  }

  function handleBusinessChange(businessId: string) {
    updateForm({ businessId, projectId: "" });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.title.trim().length === 0) return;

    const basePayload = {
      title: form.title.trim(),
      assigneeId: form.assigneeId,
      status: form.status,
      waitingReason: form.status === "waiting_on_client" ? form.waitingReason : null,
      priority: form.priority,
      dueDate: form.dueDate === "" ? null : form.dueDate,
    };

    if (task === undefined) {
      createTask({ ...basePayload, ...computeRelation(form.businessId, form.projectId) });
      onOpenChange(false);
      return;
    }

    const relationChanged =
      form.businessId !== initialRelation.businessId || form.projectId !== initialRelation.projectId;

    updateTask(task.id, {
      ...basePayload,
      ...(relationChanged ? computeRelation(form.businessId, form.projectId) : {}),
    });
    onOpenChange(false);
  }

  const projectsForBusiness = projects.filter((project) => project.businessId === form.businessId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task === undefined ? "Nova tarefa" : "Editar tarefa"}</DialogTitle>
          <DialogDescription>
            {task === undefined
              ? "Cria uma tarefa nova para o Sny ou o Bino."
              : "Atualiza os detalhes desta tarefa."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-title`}>Título</Label>
            <Input
              id={`${formId}-title`}
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              placeholder="O que precisa de ser feito?"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-assignee`}>Responsável</Label>
              <Select
                id={`${formId}-assignee`}
                value={form.assigneeId}
                onChange={(event) => updateForm({ assigneeId: event.target.value })}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-priority`}>Prioridade</Label>
              <Select
                id={`${formId}-priority`}
                value={form.priority}
                onChange={(event) => updateForm({ priority: event.target.value as Priority })}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-status`}>Estado</Label>
              <Select
                id={`${formId}-status`}
                value={form.status}
                onChange={(event) => handleStatusChange(event.target.value as WorkStatus)}
              >
                {WORK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {workStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-due-date`}>Prazo</Label>
              <Input
                id={`${formId}-due-date`}
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm({ dueDate: event.target.value })}
              />
            </div>
          </div>

          {form.status === "waiting_on_client" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-waiting-reason`}>À espera de quê?</Label>
              <Select
                id={`${formId}-waiting-reason`}
                value={form.waitingReason ?? WAITING_REASONS[0]}
                onChange={(event) => updateForm({ waitingReason: event.target.value as WaitingReason })}
                required
              >
                {WAITING_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {waitingReasonLabel(reason)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-business`}>Negócio (opcional)</Label>
              <Select
                id={`${formId}-business`}
                value={form.businessId}
                onChange={(event) => handleBusinessChange(event.target.value)}
              >
                <option value="">Nenhum</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-project`}>Projeto (opcional)</Label>
              <Select
                id={`${formId}-project`}
                value={form.projectId}
                onChange={(event) => updateForm({ projectId: event.target.value })}
                disabled={form.businessId === ""}
              >
                <option value="">Nenhum</option>
                {projectsForBusiness.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{task === undefined ? "Criar tarefa" : "Guardar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
