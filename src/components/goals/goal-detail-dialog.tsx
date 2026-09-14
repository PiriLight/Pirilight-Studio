"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock, PauseCircle, Pencil } from "lucide-react";

import { FollowUpStatus } from "@/components/domain/follow-up-status";
import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { WorkStatusBadge } from "@/components/domain/work-status-badge";
import { GoalProgressBar } from "@/components/goals/goal-progress-bar";
import { GoalStatusBadge } from "@/components/goals/goal-status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { goalTimeframeLabel } from "@/lib/constants/labels";
import { toFollowUpUrgency } from "@/lib/data/business-overview";
import { deriveGoalNextAction, getGoalLinkedTasks, goalOwnerLabel } from "@/lib/data/goal-board";
import { useGoalStore } from "@/store/use-goal-store";
import type { Goal, Task, User } from "@/types";

interface GoalDetailDialogProps {
  goal: Goal | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  users: User[];
  /** Tasks vivas (`useTaskStore`) — nunca um snapshot congelado. */
  tasks: Task[];
  today: string;
}

/**
 * Detalhe de um Goal — `Dialog` reutilizado em vez de uma rota `[goalId]`
 * (não há razão arquitetural para uma: nada aqui precisa de URL própria,
 * partilhável ou indexável, e o padrão `Dialog` já cobre criar/editar em
 * todo o resto da app). Resolve as Tasks ligadas contra `useTaskStore` ao
 * vivo — concluir uma Task em `/tasks` reflete-se aqui sem reload.
 */
export function GoalDetailDialog({ goal, onOpenChange, onEdit, users, tasks, today }: GoalDetailDialogProps) {
  return (
    <Dialog open={goal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {goal && <GoalDetailBody goal={goal} onEdit={onEdit} users={users} tasks={tasks} today={today} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalDetailBody({
  goal,
  onEdit,
  users,
  tasks,
  today,
}: {
  goal: Goal;
  onEdit: () => void;
  users: User[];
  tasks: Task[];
  today: string;
}) {
  const userById = new Map(users.map((user) => [user.id, user]));
  const linkedTasks = getGoalLinkedTasks(goal, tasks);
  const nextAction = deriveGoalNextAction(linkedTasks, today);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6">{goal.title}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <GoalStatusBadge progress={goal.progress} />
          <span className="text-sm text-muted-foreground">
            {goalTimeframeLabel(goal.timeframe)} · {goalOwnerLabel(goal.ownerId, userById)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Progresso</Label>
          <GoalProgressBar progress={goal.progress} />
        </div>

        <UpdateProgressForm goal={goal} />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Tarefas ligadas</Label>
            <span className="text-xs text-muted-foreground">{linkedTasks.length}</span>
          </div>

          {linkedTasks.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border p-3">
              <p className="text-xs text-muted-foreground">Este objetivo ainda não tem tarefas ligadas.</p>
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" /> Editar objetivo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-md border border-border">
              {linkedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{task.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {userById.get(task.assigneeId) && (
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px]">
                            {userById.get(task.assigneeId)?.initials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="truncate text-xs text-muted-foreground">
                        {userById.get(task.assigneeId)?.name ?? "—"}
                      </span>
                    </div>
                  </div>
                  <WorkStatusBadge status={task.status} className="shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Próximo passo</Label>
          <GoalNextActionView nextAction={nextAction} />
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar objetivo
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * Ação rápida "Atualizar progresso" — um input numérico + botão, sem abrir o
 * formulário completo. Nunca muda automaticamente com Tasks concluídas: o
 * progresso continua sempre manual (pedido explícito).
 */
function UpdateProgressForm({ goal }: { goal: Goal }) {
  const setGoalProgress = useGoalStore((state) => state.setGoalProgress);
  const [draft, setDraft] = useState(String(goal.progress));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = Math.round(Number.parseFloat(draft));
    const clamped = Number.isNaN(parsed) ? goal.progress : Math.min(100, Math.max(0, parsed));
    setGoalProgress(goal.id, clamped);
    setDraft(String(clamped));
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor={`goal-progress-${goal.id}`}>Atualizar progresso (%)</Label>
        <Input
          id={`goal-progress-${goal.id}`}
          type="number"
          min="0"
          max="100"
          step="1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Atualizar
      </Button>
    </form>
  );
}

function GoalNextActionView({ nextAction }: { nextAction: ReturnType<typeof deriveGoalNextAction> }) {
  if (nextAction.kind === "none") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" /> Sem ação interna pendente
      </span>
    );
  }

  if (nextAction.kind === "waiting_on_client") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" /> À espera do cliente
        </span>
        {nextAction.waitingReason !== null && <WaitingReasonTag reason={nextAction.waitingReason} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-foreground">{nextAction.title}</p>
      {nextAction.urgency === "no_date" ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> Sem data
        </span>
      ) : (
        <FollowUpStatus urgency={toFollowUpUrgency(nextAction.urgency)} daysDelta={nextAction.daysDelta} />
      )}
    </div>
  );
}
