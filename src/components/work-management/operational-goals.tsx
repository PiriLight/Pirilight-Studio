"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Edit3, Plus, Target, Trash2 } from "lucide-react";

import {
  createGoalAction, createMilestoneAction, deleteGoalAction, deleteMilestoneAction,
  moveMilestoneAction, toggleMilestoneAction, updateGoalAction, updateMilestoneAction,
  type WorkActionResult,
} from "@/app/actions/work-management";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { WorkManagementSnapshot } from "@/lib/data/supabase/work-management";
import type { GoalMilestoneRow, GoalRow } from "@/lib/data/supabase/operational";
import { deriveGoalProgress } from "@/lib/data/work-management";
import { GOAL_CATEGORIES, GOAL_STATUSES, MILESTONE_STATUSES, PRIORITIES } from "@/lib/validation/work-management";

const CATEGORY_LABELS: Record<string, string> = { financial: "Financeiro", commercial: "Comercial", product: "Produto", operations: "Operações", personal: "Pessoal" };
const GOAL_STATUS_LABELS: Record<string, string> = { planned: "Planeado", active: "Em curso", on_hold: "Pausado", completed: "Concluído", cancelled: "Cancelado" };
const MILESTONE_STATUS_LABELS: Record<string, string> = { pending: "Pendente", in_progress: "Em curso", completed: "Concluída", cancelled: "Cancelada" };
const PRIORITY_LABELS: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta" };

interface Props { snapshot: WorkManagementSnapshot; }

export function OperationalGoals({ snapshot }: Props) {
  const [goalDialog, setGoalDialog] = useState<GoalRow | "new" | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalRow | null>(null);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState("");

  const filtered = useMemo(() => snapshot.goals.filter((goal) => {
    const text = `${goal.name} ${goal.description ?? ""}`.toLocaleLowerCase("pt-PT");
    return (!query || text.includes(query.toLocaleLowerCase("pt-PT"))) && (!status || goal.status === status) &&
      (!category || goal.category === category) && (!owner || goal.responsible_user_id === owner);
  }), [snapshot.goals, query, status, category, owner]);

  function success(message: string) { setNotice(message); setTimeout(() => setNotice(""), 3500); }

  return <div className="flex flex-col gap-6">
    <PageHeader title="Objetivos" description="Objetivos operacionais, metas intermédias e tarefas relacionadas."
      action={<Button onClick={() => setGoalDialog("new")}><Plus />Novo objetivo</Button>} />
    {notice && <p role="status" className="rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">{notice}</p>}
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Input aria-label="Pesquisar objetivos" placeholder="Pesquisar objetivos…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Select aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os estados</option>{GOAL_STATUSES.map((item) => <option key={item} value={item}>{GOAL_STATUS_LABELS[item]}</option>)}</Select>
      <Select aria-label="Filtrar por categoria" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Todas as categorias</option>{GOAL_CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</Select>
      <Select aria-label="Filtrar por responsável" value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Todos os responsáveis</option>{snapshot.users.map((user) => <option key={user.user_id} value={user.user_id}>{user.display_name}</option>)}</Select>
    </div>
    {filtered.length === 0 ? <EmptyState icon={Target} title="Sem objetivos para mostrar" description="Cria o primeiro objetivo ou ajusta os filtros." action={<Button onClick={() => setGoalDialog("new")}><Plus />Novo objetivo</Button>} /> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((goal) => {
        const progress = deriveGoalProgress(goal);
        const milestones = snapshot.milestones.filter((item) => item.goal_id === goal.id);
        const taskCount = snapshot.goalTasks.filter((item) => item.goal_id === goal.id).length;
        const ownerName = snapshot.users.find((user) => user.user_id === goal.responsible_user_id)?.display_name ?? "Empresa";
        return <Card key={goal.id} role="button" tabIndex={0} aria-label={`Abrir objetivo ${goal.name}`} className="cursor-pointer transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedGoal(goal)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedGoal(goal); } }}>
          <CardHeader className="gap-3"><div className="flex items-start justify-between gap-2"><CardTitle className="leading-snug">{goal.name}</CardTitle><Badge variant={goal.status === "completed" ? "success" : goal.status === "active" ? "info" : "muted"}>{GOAL_STATUS_LABELS[goal.status]}</Badge></div>
            <div className="flex flex-wrap gap-2"><Badge variant="outline">{CATEGORY_LABELS[goal.category]}</Badge><Badge variant="outline">{PRIORITY_LABELS[goal.priority]}</Badge></div></CardHeader>
          <CardContent className="space-y-4"><div><div className="mb-1 flex justify-between gap-2 text-sm"><span>{progress.label}</span>{progress.percentage !== null && <strong>{progress.percentage}%</strong>}</div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${progress.barPercentage}%` }} /></div></div>
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{ownerName}</span><span>{milestones.length} metas · {taskCount} tarefas</span></div>
            <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); setGoalDialog(goal); }}><Edit3 />Editar</Button></CardContent>
        </Card>;
      })}</div>}
    {goalDialog && <GoalFormDialog key={goalDialog === "new" ? "new" : goalDialog.id} open goal={goalDialog === "new" ? undefined : goalDialog} snapshot={snapshot} onOpenChange={(open) => !open && setGoalDialog(null)} onSuccess={success} />}
    {selectedGoal && <GoalDetailDialog key={selectedGoal.id} goal={selectedGoal} snapshot={snapshot} open onOpenChange={(open) => !open && setSelectedGoal(null)} onSuccess={success} />}
  </div>;
}

function GoalFormDialog({ open, onOpenChange, goal, snapshot, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; goal?: GoalRow; snapshot: WorkManagementSnapshot; onSuccess: (message: string) => void; }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [result, setResult] = useState<WorkActionResult | null>(null);
  const [name, setName] = useState(goal?.name ?? ""); const [description, setDescription] = useState(goal?.description ?? "");
  const [category, setCategory] = useState(goal?.category ?? "operations"); const [status, setStatus] = useState(goal?.status ?? "planned"); const [priority, setPriority] = useState(goal?.priority ?? "normal");
  const [owner, setOwner] = useState(goal?.responsible_user_id ?? ""); const [startDate, setStartDate] = useState(goal?.start_date ?? ""); const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [metric, setMetric] = useState(goal?.metric ?? ""); const [currentValue, setCurrentValue] = useState(String(goal?.current_value ?? 0)); const [targetValue, setTargetValue] = useState(String(goal?.target_value ?? 100));
  const [taskIds, setTaskIds] = useState<string[]>(goal ? snapshot.goalTasks.filter((link) => link.goal_id === goal.id).map((link) => link.task_id) : []);
  function submit(e: FormEvent) { e.preventDefault(); setResult(null); startTransition(async () => { const input = { name, description, category: category as never, status: status as never, priority: priority as never, responsibleUserId: owner || null, startDate: startDate || null, deadline: deadline || null, metric, currentValue: Number(currentValue), targetValue: Number(targetValue), taskIds }; const next = goal ? await updateGoalAction(goal.id, input) : await createGoalAction(input); setResult(next); if (next.ok) { onSuccess(next.message); router.refresh(); onOpenChange(false); } }); }
  function remove() { if (!goal || !window.confirm(`Eliminar o objetivo “${goal.name}” e as respetivas metas?`)) return; startTransition(async () => { const next = await deleteGoalAction(goal.id); setResult(next); if (next.ok) { onSuccess(next.message); router.refresh(); onOpenChange(false); } }); }
  return <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{goal ? "Editar objetivo" : "Novo objetivo"}</DialogTitle><DialogDescription>Define o resultado, o responsável e as tarefas que contribuem para este objetivo.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Nome" required><Input autoFocus required value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Responsável"><Select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Empresa</option>{snapshot.users.map((u) => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}</Select></Field>
      <Field label="Categoria"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{GOAL_CATEGORIES.map((v) => <option key={v} value={v}>{CATEGORY_LABELS[v]}</option>)}</Select></Field><Field label="Estado"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{GOAL_STATUSES.map((v) => <option key={v} value={v}>{GOAL_STATUS_LABELS[v]}</option>)}</Select></Field>
      <Field label="Prioridade"><Select value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITIES.map((v) => <option key={v} value={v}>{PRIORITY_LABELS[v]}</option>)}</Select></Field><Field label="Métrica"><Input placeholder="€, Leads, PiriCards…" value={metric} onChange={(e) => setMetric(e.target.value)} /></Field>
      <Field label="Valor atual"><Input type="number" min="0" step="any" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} /></Field><Field label="Valor alvo"><Input type="number" min="0" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} /></Field>
      <Field label="Data de início"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field><Field label="Prazo"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field></div>
      <Field label="Descrição"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <fieldset className="rounded-lg border border-border p-3"><legend className="px-1 text-sm font-medium">Tarefas relacionadas</legend><div className="mt-2 grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2">{snapshot.tasks.length ? snapshot.tasks.map((task) => <label key={task.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={taskIds.includes(task.id)} onChange={() => setTaskIds((ids) => ids.includes(task.id) ? ids.filter((id) => id !== task.id) : [...ids, task.id])} />{task.title}</label>) : <p className="text-sm text-muted-foreground">Ainda não existem tarefas.</p>}</div></fieldset>
      {result && !result.ok && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{result.message}</p>}
      <DialogFooter className="sm:justify-between"><div>{goal && <Button type="button" variant="destructive" disabled={pending} onClick={remove}><Trash2 />Eliminar</Button>}</div><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending || !name.trim()}>{pending ? "A guardar…" : goal ? "Guardar alterações" : "Criar objetivo"}</Button></div></DialogFooter>
    </form></DialogContent></Dialog>;
}

function GoalDetailDialog({ goal, snapshot, open, onOpenChange, onSuccess }: { goal: GoalRow; snapshot: WorkManagementSnapshot; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: (message: string) => void; }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [milestoneDialog, setMilestoneDialog] = useState<GoalMilestoneRow | "new" | null>(null);
  const milestones = snapshot.milestones.filter((item) => item.goal_id === goal.id); const taskIds = snapshot.goalTasks.filter((item) => item.goal_id === goal.id).map((item) => item.task_id); const tasks = snapshot.tasks.filter((item) => taskIds.includes(item.id)); const progress = deriveGoalProgress(goal);
  function mutate(operation: () => Promise<WorkActionResult>) { startTransition(async () => { const next = await operation(); if (next.ok) { onSuccess(next.message); router.refresh(); } }); }
  return <><Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{goal.name}</DialogTitle><DialogDescription>{goal.description || "Sem descrição."}</DialogDescription></DialogHeader>
    <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-3"><div><span className="text-muted-foreground">Progresso</span><p className="font-medium">{progress.label}{progress.percentage !== null ? ` · ${progress.percentage}%` : ""}</p></div><div><span className="text-muted-foreground">Prazo</span><p className="font-medium">{goal.deadline ?? "Sem prazo"}</p></div><div><span className="text-muted-foreground">Responsável</span><p className="font-medium">{snapshot.users.find((u) => u.user_id === goal.responsible_user_id)?.display_name ?? "Empresa"}</p></div></div>
    <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Metas</h3><Button size="sm" onClick={() => setMilestoneDialog("new")}><Plus />Adicionar meta</Button></div>{milestones.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Ainda não existem metas.</p> : <div className="space-y-2">{milestones.map((item, index) => <div key={item.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center"><button type="button" aria-label={item.status === "completed" ? "Reabrir meta" : "Concluir meta"} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border" onClick={() => mutate(() => toggleMilestoneAction(item.id, item.status !== "completed"))}>{item.status === "completed" && <Check />}</button><div className="min-w-0 flex-1"><p className={item.status === "completed" ? "line-through" : "font-medium"}>{item.name}</p><p className="text-xs text-muted-foreground">{MILESTONE_STATUS_LABELS[item.status]}{item.due_date ? ` · ${item.due_date}` : ""}{item.target_value !== null ? ` · alvo ${item.target_value}` : ""}</p></div><div className="flex gap-1"><Button type="button" size="icon" variant="ghost" aria-label="Subir meta" disabled={pending || index === 0} onClick={() => mutate(() => moveMilestoneAction(item.id, "up", goal.id))}><ArrowUp /></Button><Button type="button" size="icon" variant="ghost" aria-label="Descer meta" disabled={pending || index === milestones.length - 1} onClick={() => mutate(() => moveMilestoneAction(item.id, "down", goal.id))}><ArrowDown /></Button><Button type="button" size="icon" variant="ghost" aria-label="Editar meta" onClick={() => setMilestoneDialog(item)}><Edit3 /></Button><Button type="button" size="icon" variant="ghost" aria-label="Eliminar meta" onClick={() => { if (window.confirm(`Eliminar a meta “${item.name}”?`)) mutate(() => deleteMilestoneAction(item.id)); }}><Trash2 /></Button></div></div>)}</div>}</section>
    <section className="space-y-2"><h3 className="font-semibold">Tarefas relacionadas</h3>{tasks.length ? tasks.map((task) => <div key={task.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{task.title}</span><Badge variant={task.status === "done" ? "success" : "outline"}>{task.status}</Badge></div>) : <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Sem tarefas relacionadas.</p>}</section>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter></DialogContent></Dialog>
    {milestoneDialog && <MilestoneFormDialog key={milestoneDialog === "new" ? "new" : milestoneDialog.id} goalId={goal.id} milestone={milestoneDialog === "new" ? undefined : milestoneDialog} nextOrder={milestones.length ? Math.max(...milestones.map((m) => m.sort_order)) + 1 : 0} open onOpenChange={(value) => !value && setMilestoneDialog(null)} onSuccess={onSuccess} />}</>;
}

function MilestoneFormDialog({ goalId, milestone, nextOrder, open, onOpenChange, onSuccess }: { goalId: string; milestone?: GoalMilestoneRow; nextOrder: number; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: (message: string) => void; }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [result, setResult] = useState<WorkActionResult | null>(null); const [name, setName] = useState(milestone?.name ?? ""); const [description, setDescription] = useState(milestone?.description ?? ""); const [status, setStatus] = useState(milestone?.status ?? "pending"); const [dueDate, setDueDate] = useState(milestone?.due_date ?? ""); const [target, setTarget] = useState(milestone?.target_value === null || milestone?.target_value === undefined ? "" : String(milestone.target_value)); const [order, setOrder] = useState(String(milestone?.sort_order ?? nextOrder));
  function submit(e: FormEvent) { e.preventDefault(); startTransition(async () => { const input = { goalId, name, description, status: status as never, dueDate: dueDate || null, targetValue: target === "" ? null : Number(target), sortOrder: Number(order) }; const next = milestone ? await updateMilestoneAction(milestone.id, input) : await createMilestoneAction(input); setResult(next); if (next.ok) { onSuccess(next.message); router.refresh(); onOpenChange(false); } }); }
  return <Dialog open={open} onOpenChange={pending ? undefined : onOpenChange}><DialogContent><DialogHeader><DialogTitle>{milestone ? "Editar meta" : "Adicionar meta"}</DialogTitle><DialogDescription>Uma etapa concreta dentro do objetivo.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Título" required><Input autoFocus required value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Descrição"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Estado"><Select value={status} onChange={(e) => setStatus(e.target.value)}>{MILESTONE_STATUSES.map((v) => <option key={v} value={v}>{MILESTONE_STATUS_LABELS[v]}</option>)}</Select></Field><Field label="Prazo"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field><Field label="Valor alvo opcional"><Input type="number" min="0" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></Field><Field label="Ordem"><Input type="number" min="0" step="1" value={order} onChange={(e) => setOrder(e.target.value)} /></Field></div>{result && !result.ok && <p role="alert" className="text-sm text-destructive">{result.message}</p>}<DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending || !name.trim()}>{pending ? "A guardar…" : "Guardar meta"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <Label className="flex flex-col items-stretch gap-1.5"><span>{label}{required ? " *" : ""}</span>{children}</Label>; }
