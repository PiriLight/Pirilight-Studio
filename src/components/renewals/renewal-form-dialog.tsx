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
import { renewalCadenceLabel, renewalStatusLabel, renewalTypeLabel } from "@/lib/constants/labels";
import { RENEWAL_CADENCES, RENEWAL_STATUSES, RENEWAL_TYPES } from "@/lib/validation/renewal";
import { useRenewalStore } from "@/store/use-renewal-store";
import type { Business, Project, Renewal, RenewalCadence, RenewalStatus, RenewalType } from "@/types";

interface RenewalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = criar; presente = editar essa Renewal. */
  renewal?: Renewal;
  businesses: Business[];
  projects: Project[];
  /** Só em modo criação — pré-seleciona o Project ao abrir a partir do Website/PiriCard Detail. */
  defaultProjectId?: string;
}

interface FormState {
  projectId: string;
  type: RenewalType;
  cadence: RenewalCadence;
  dueDate: string;
  amount: string;
  status: RenewalStatus;
}

function buildInitialState(
  renewal: Renewal | undefined,
  projects: Project[],
  defaultProjectId: string,
): FormState {
  if (renewal === undefined) {
    return {
      projectId: defaultProjectId !== "" ? defaultProjectId : (projects[0]?.id ?? ""),
      type: "domain",
      cadence: "annual",
      dueDate: "",
      amount: "0",
      status: "pending",
    };
  }

  return {
    projectId: renewal.projectId,
    type: renewal.type,
    cadence: renewal.cadence,
    dueDate: renewal.dueDate,
    amount: String(renewal.amount),
    status: renewal.status,
  };
}

/**
 * Criar/editar uma Renewal — os dois modos no mesmo componente (`renewal`
 * ausente = criar), exatamente o padrão do `TaskFormDialog` (Round 4): um
 * único `Dialog` centrado, estado calculado uma vez com um inicializador
 * preguiçoso, e quem usa este componente dá-lhe uma `key` que muda sempre
 * que se deve abrir com estado limpo (ver `NewRenewalButton`).
 *
 * Sem Business separado no formulário: deriva-se de `Project.businessId` —
 * o combo de Project já mostra "Negócio — Projeto" para não obrigar a subir
 * ao Business Detail para saber a que negócio pertence.
 */
export function RenewalFormDialog({
  open,
  onOpenChange,
  renewal,
  businesses,
  projects,
  defaultProjectId = "",
}: RenewalFormDialogProps) {
  const createRenewal = useRenewalStore((state) => state.createRenewal);
  const updateRenewal = useRenewalStore((state) => state.updateRenewal);

  const [form, setForm] = useState<FormState>(() => buildInitialState(renewal, projects, defaultProjectId));
  const formId = useId();

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.projectId === "" || form.dueDate === "") return;

    const payload = {
      projectId: form.projectId,
      type: form.type,
      cadence: form.cadence,
      dueDate: form.dueDate,
      amount: Number.parseFloat(form.amount) || 0,
      status: form.status,
    };

    if (renewal === undefined) {
      createRenewal(payload);
    } else {
      updateRenewal(renewal.id, payload);
    }
    onOpenChange(false);
  }

  const businessById = new Map(businesses.map((business) => [business.id, business]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{renewal === undefined ? "Nova renovação" : "Editar renovação"}</DialogTitle>
          <DialogDescription>
            {renewal === undefined
              ? "Regista uma renovação — domínio, hosting, subscrição ou plano."
              : "Atualiza os detalhes desta renovação."}
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
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {businessById.get(project.businessId)?.name ?? "?"} — {project.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-type`}>Tipo</Label>
              <Select
                id={`${formId}-type`}
                value={form.type}
                onChange={(event) => updateForm({ type: event.target.value as RenewalType })}
              >
                {RENEWAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {renewalTypeLabel(type)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-cadence`}>Cadência</Label>
              <Select
                id={`${formId}-cadence`}
                value={form.cadence}
                onChange={(event) => updateForm({ cadence: event.target.value as RenewalCadence })}
              >
                {RENEWAL_CADENCES.map((cadence) => (
                  <option key={cadence} value={cadence}>
                    {renewalCadenceLabel(cadence)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-due-date`}>Prazo</Label>
              <Input
                id={`${formId}-due-date`}
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm({ dueDate: event.target.value })}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-amount`}>Valor (€)</Label>
              <Input
                id={`${formId}-amount`}
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => updateForm({ amount: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-status`}>Estado</Label>
            <Select
              id={`${formId}-status`}
              value={form.status}
              onChange={(event) => updateForm({ status: event.target.value as RenewalStatus })}
            >
              {RENEWAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {renewalStatusLabel(status)}
                </option>
              ))}
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{renewal === undefined ? "Criar renovação" : "Guardar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
