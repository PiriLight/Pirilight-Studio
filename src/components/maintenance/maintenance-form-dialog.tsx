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
import { Textarea } from "@/components/ui/textarea";
import { priorityLabel, waitingReasonLabel, workStatusLabel } from "@/lib/constants/labels";
import { PRIORITIES } from "@/lib/validation/task";
import { WAITING_REASONS, WORK_STATUSES } from "@/lib/validation/work-status";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import type { Business, MaintenanceRequest, Priority, Project, User, WaitingReason, WorkStatus } from "@/types";

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = criar; presente = editar esse pedido. */
  request?: MaintenanceRequest;
  projects: Project[];
  businesses: Business[];
  users: User[];
  today: string;
  /** Só em modo criação — pré-seleciona o Project ao abrir a partir do Website/PiriCard Detail. */
  defaultProjectId?: string;
}

interface FormState {
  projectId: string;
  title: string;
  description: string;
  /** `""` = Não atribuído; qualquer outro valor é um `User.id`. */
  responsibleUserId: string;
  priority: Priority;
  requestedAt: string;
  dueDate: string;
  status: WorkStatus;
  waitingReason: WaitingReason | null;
}

function buildInitialState(
  request: MaintenanceRequest | undefined,
  projects: Project[],
  today: string,
  defaultProjectId: string,
): FormState {
  if (request === undefined) {
    return {
      projectId: defaultProjectId !== "" ? defaultProjectId : (projects[0]?.id ?? ""),
      title: "",
      description: "",
      responsibleUserId: "",
      priority: "normal",
      requestedAt: today,
      dueDate: "",
      status: "todo",
      waitingReason: null,
    };
  }

  return {
    projectId: request.projectId,
    title: request.title,
    description: request.description,
    responsibleUserId: request.responsibleUserId ?? "",
    priority: request.priority,
    requestedAt: request.requestedAt,
    dueDate: request.dueDate ?? "",
    status: request.status,
    waitingReason: request.waitingReason,
  };
}

/**
 * Criar/editar um pedido de manutenção — os dois modos no mesmo componente
 * (`request` ausente = criar), o mesmo padrão do `TaskFormDialog`/
 * `RenewalFormDialog`: um único `Dialog` centrado, estado calculado uma vez
 * com um inicializador preguiçoso.
 *
 * Sem Business editável no formulário (secção 14 do pedido): deriva-se
 * sempre de `Project.businessId` no momento do submit — impossível escolher
 * um Business e um Project inconsistentes entre si, mesmo ao editar um
 * pedido cujo Project muda.
 */
export function MaintenanceFormDialog({
  open,
  onOpenChange,
  request,
  projects,
  businesses,
  users,
  today,
  defaultProjectId = "",
}: MaintenanceFormDialogProps) {
  const createRequest = useMaintenanceStore((state) => state.createRequest);
  const updateRequest = useMaintenanceStore((state) => state.updateRequest);

  const [form, setForm] = useState<FormState>(() => buildInitialState(request, projects, today, defaultProjectId));
  const formId = useId();

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleStatusChange(status: WorkStatus) {
    updateForm({
      status,
      waitingReason: status === "waiting_on_client" ? (form.waitingReason ?? WAITING_REASONS[0]) : null,
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    const project = projects.find((p) => p.id === form.projectId);
    if (title.length === 0 || description.length === 0 || project === undefined || form.requestedAt === "") return;

    const payload = {
      projectId: project.id,
      businessId: project.businessId,
      title,
      description,
      status: form.status,
      waitingReason: form.status === "waiting_on_client" ? form.waitingReason : null,
      priority: form.priority,
      responsibleUserId: form.responsibleUserId === "" ? null : form.responsibleUserId,
      requestedAt: form.requestedAt,
      dueDate: form.dueDate === "" ? null : form.dueDate,
    };

    if (request === undefined) {
      createRequest(payload);
    } else {
      updateRequest(request.id, payload);
    }
    onOpenChange(false);
  }

  const businessById = new Map(businesses.map((business) => [business.id, business]));
  const selectedProject = projects.find((p) => p.id === form.projectId);
  const selectedBusiness = selectedProject ? businessById.get(selectedProject.businessId) : undefined;

  // Secção 15: prioriza projetos entregues (`done`) no topo do select, sem
  // impedir escolher um projeto ainda `in_progress` — um pedido de alteração
  // legítimo pode existir mesmo antes da entrega técnica estar fechada.
  const deliveredProjects = projects.filter((p) => p.status === "done");
  const otherProjects = projects.filter((p) => p.status !== "done");

  function projectOptionLabel(project: Project): string {
    return `${businessById.get(project.businessId)?.name ?? "?"} — ${project.name}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{request === undefined ? "Novo pedido" : "Editar pedido"}</DialogTitle>
          <DialogDescription>
            {request === undefined
              ? "Regista um pedido de manutenção ou alteração sobre um projeto entregue."
              : "Atualiza os detalhes deste pedido."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-project`}>Projeto</Label>
            <Select
              id={`${formId}-project`}
              value={form.projectId}
              onChange={(event) => updateForm({ projectId: event.target.value })}
              required
            >
              {form.projectId === "" && (
                <option value="" disabled>
                  Escolhe um projeto
                </option>
              )}
              {deliveredProjects.length > 0 && (
                <optgroup label="Projetos entregues">
                  {deliveredProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {projectOptionLabel(project)}
                    </option>
                  ))}
                </optgroup>
              )}
              {otherProjects.length > 0 && (
                <optgroup label="Outros projetos">
                  {otherProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {projectOptionLabel(project)}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
            {selectedBusiness && (
              <p className="text-xs text-muted-foreground">Negócio: {selectedBusiness.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-title`}>Título</Label>
            <Input
              id={`${formId}-title`}
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              placeholder="O que precisa de ser alterado?"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-description`}>Descrição</Label>
            <Textarea
              id={`${formId}-description`}
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              placeholder="Detalhe do pedido — o que o cliente pediu, contexto relevante…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-responsible`}>Responsável</Label>
              <Select
                id={`${formId}-responsible`}
                value={form.responsibleUserId}
                onChange={(event) => updateForm({ responsibleUserId: event.target.value })}
              >
                <option value="">Não atribuído</option>
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
              <Label htmlFor={`${formId}-requested-at`}>Data do pedido</Label>
              <Input
                id={`${formId}-requested-at`}
                type="date"
                value={form.requestedAt}
                onChange={(event) => updateForm({ requestedAt: event.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-due-date`}>Prazo (opcional)</Label>
              <Input
                id={`${formId}-due-date`}
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm({ dueDate: event.target.value })}
              />
            </div>
          </div>

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

          {form.status === "waiting_on_client" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-waiting-reason`}>Motivo de espera</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{request === undefined ? "Criar pedido" : "Guardar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
