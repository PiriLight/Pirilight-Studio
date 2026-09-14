"use client";

import { useId, useState, type FormEvent } from "react";
import { Check } from "lucide-react";

import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
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
import { goalTimeframeLabel } from "@/lib/constants/labels";
import { GOAL_TIMEFRAMES } from "@/lib/validation/goal";
import { cn } from "@/lib/utils";
import { useGoalStore } from "@/store/use-goal-store";
import type { Goal, GoalTimeframe, Task, User } from "@/types";

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = criar; presente = editar esse Goal. */
  goal?: Goal;
  users: User[];
  /** Todas as Tasks vivas (`useTaskStore`) — universo do multi-select "Tasks ligadas". */
  tasks: Task[];
}

interface FormState {
  title: string;
  timeframe: GoalTimeframe;
  /** `""` = Empresa (`ownerId: null`); qualquer outro valor é um `User.id`. */
  ownerId: string;
  progress: string;
  linkedTaskIds: string[];
}

function buildInitialState(goal: Goal | undefined): FormState {
  if (goal === undefined) {
    return { title: "", timeframe: "quarter", ownerId: "", progress: "0", linkedTaskIds: [] };
  }
  return {
    title: goal.title,
    timeframe: goal.timeframe,
    ownerId: goal.ownerId ?? "",
    progress: String(goal.progress),
    linkedTaskIds: [...goal.linkedTaskIds],
  };
}

/** Arredonda e fixa entre 0–100 — o schema (`goalSchema`) continua a ser o gate final. */
function clampProgress(raw: string): number {
  const parsed = Math.round(Number.parseFloat(raw));
  if (Number.isNaN(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

/**
 * Criar/editar um Goal — os dois modos no mesmo componente (`goal` ausente =
 * criar), exatamente o padrão do `TaskFormDialog`/`RenewalFormDialog`: um
 * único `Dialog` centrado, estado calculado uma vez com um inicializador
 * preguiçoso; quem usa este componente dá-lhe uma `key` que muda sempre que
 * se deve abrir com estado limpo.
 */
export function GoalFormDialog({ open, onOpenChange, goal, users, tasks }: GoalFormDialogProps) {
  const createGoal = useGoalStore((state) => state.createGoal);
  const updateGoal = useGoalStore((state) => state.updateGoal);

  const [form, setForm] = useState<FormState>(() => buildInitialState(goal));
  const formId = useId();

  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleTask(taskId: string) {
    setForm((prev) => ({
      ...prev,
      linkedTaskIds: prev.linkedTaskIds.includes(taskId)
        ? prev.linkedTaskIds.filter((id) => id !== taskId)
        : [...prev.linkedTaskIds, taskId],
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (title.length === 0) return;

    const payload = {
      title,
      timeframe: form.timeframe,
      ownerId: form.ownerId === "" ? null : form.ownerId,
      progress: clampProgress(form.progress),
      linkedTaskIds: form.linkedTaskIds,
    };

    if (goal === undefined) {
      createGoal(payload);
    } else {
      updateGoal(goal.id, payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal === undefined ? "Novo objetivo" : "Editar objetivo"}</DialogTitle>
          <DialogDescription>
            {goal === undefined
              ? "Regista uma meta da PiriLight Studio ou da PiriCard."
              : "Atualiza os detalhes deste objetivo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-title`}>Título</Label>
            <Input
              id={`${formId}-title`}
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              placeholder="Ex.: 5 novos clientes este trimestre"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-timeframe`}>Período</Label>
              <Select
                id={`${formId}-timeframe`}
                value={form.timeframe}
                onChange={(event) => updateForm({ timeframe: event.target.value as GoalTimeframe })}
              >
                {GOAL_TIMEFRAMES.map((timeframe) => (
                  <option key={timeframe} value={timeframe}>
                    {goalTimeframeLabel(timeframe)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${formId}-owner`}>Responsável</Label>
              <Select
                id={`${formId}-owner`}
                value={form.ownerId}
                onChange={(event) => updateForm({ ownerId: event.target.value })}
              >
                <option value="">Empresa</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${formId}-progress`}>Progresso (%)</Label>
            <Input
              id={`${formId}-progress`}
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.progress}
              onChange={(event) => updateForm({ progress: event.target.value })}
            />
            <GoalProgressBar progress={clampProgress(form.progress)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tarefas ligadas</Label>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-input p-1.5">
              {tasks.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">Ainda não há tarefas registadas.</p>
              ) : (
                tasks.map((task) => {
                  const checked = form.linkedTaskIds.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        checked ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0 truncate">{task.title}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{goal === undefined ? "Criar objetivo" : "Guardar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
