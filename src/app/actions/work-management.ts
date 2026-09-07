"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireAuthorizedUser } from "@/lib/auth/authorization";
import { isSupabaseOperationalDataEnabled } from "@/lib/data/crm-mode";
import {
  createGoal,
  createGoalMilestone,
  createTask,
  deleteGoal,
  deleteGoalMilestone,
  deleteTask,
  listActiveAppUsers,
  listGoalMilestones,
  replaceGoalTasks,
  replaceTaskGoals,
  updateGoal,
  updateGoalMilestone,
  updateTask,
} from "@/lib/data/supabase/operational";
import { createClient } from "@/lib/supabase/server";
import {
  goalInputSchema,
  idSchema,
  milestoneInputSchema,
  taskInputSchema,
  type GoalInput,
  type MilestoneInput,
  type TaskInput,
} from "@/lib/validation/work-management";

export interface WorkActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

function invalid(error: z.ZodError): WorkActionResult {
  return { ok: false, message: "Revê os campos assinalados.", fieldErrors: error.flatten().fieldErrors as Record<string, string[]> };
}

function failure(error: unknown): WorkActionResult {
  console.error("[work-management] Mutation failed", { message: error instanceof Error ? error.message : "Unknown error" });
  return { ok: false, message: error instanceof Error ? error.message : "Não foi possível guardar a alteração." };
}

async function authorizedClient() {
  if (!isSupabaseOperationalDataEnabled()) throw new Error("A persistência operacional Supabase não está ativa neste ambiente.");
  await requireAuthorizedUser();
  return createClient();
}

function refreshWork(): void {
  revalidatePath("/goals");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

async function assertActiveOwner(client: Awaited<ReturnType<typeof createClient>>, userId: string | null): Promise<void> {
  if (!userId) return;
  const users = await listActiveAppUsers(client);
  if (!users.some((user) => user.user_id === userId)) throw new Error("O responsável selecionado não é um utilizador ativo.");
}

export async function createGoalAction(input: GoalInput): Promise<WorkActionResult> {
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await assertActiveOwner(client, parsed.data.responsibleUserId);
    const goal = await createGoal(client, {
      name: parsed.data.name, description: parsed.data.description, category: parsed.data.category,
      status: parsed.data.status, priority: parsed.data.priority, responsible_user_id: parsed.data.responsibleUserId,
      start_date: parsed.data.startDate, deadline: parsed.data.deadline, metric: parsed.data.metric,
      current_value: parsed.data.currentValue, target_value: parsed.data.targetValue,
    });
    try { await replaceGoalTasks(client, goal.id, parsed.data.taskIds); }
    catch (error) { await deleteGoal(client, goal.id); throw error; }
    refreshWork();
    return { ok: true, message: "Objetivo criado com sucesso." };
  } catch (error) { return failure(error); }
}

export async function updateGoalAction(id: string, input: GoalInput): Promise<WorkActionResult> {
  const [idParsed, parsed] = [idSchema.safeParse(id), goalInputSchema.safeParse(input)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await assertActiveOwner(client, parsed.data.responsibleUserId);
    await updateGoal(client, idParsed.data, {
      name: parsed.data.name, description: parsed.data.description, category: parsed.data.category,
      status: parsed.data.status, priority: parsed.data.priority, responsible_user_id: parsed.data.responsibleUserId,
      start_date: parsed.data.startDate, deadline: parsed.data.deadline, metric: parsed.data.metric,
      current_value: parsed.data.currentValue, target_value: parsed.data.targetValue,
    });
    await replaceGoalTasks(client, idParsed.data, parsed.data.taskIds);
    refreshWork();
    return { ok: true, message: "Objetivo atualizado." };
  } catch (error) { return failure(error); }
}

export async function deleteGoalAction(id: string): Promise<WorkActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try { const client = await authorizedClient(); await deleteGoal(client, parsed.data); refreshWork(); return { ok: true, message: "Objetivo eliminado." }; }
  catch (error) { return failure(error); }
}

export async function createMilestoneAction(input: MilestoneInput): Promise<WorkActionResult> {
  const parsed = milestoneInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await createGoalMilestone(client, {
      goal_id: parsed.data.goalId, name: parsed.data.name, description: parsed.data.description,
      status: parsed.data.status, due_date: parsed.data.dueDate, target_value: parsed.data.targetValue,
      sort_order: parsed.data.sortOrder, completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    });
    refreshWork(); return { ok: true, message: "Meta adicionada." };
  } catch (error) { return failure(error); }
}

export async function updateMilestoneAction(id: string, input: MilestoneInput): Promise<WorkActionResult> {
  const [idParsed, parsed] = [idSchema.safeParse(id), milestoneInputSchema.safeParse(input)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await updateGoalMilestone(client, idParsed.data, {
      name: parsed.data.name, description: parsed.data.description, status: parsed.data.status,
      due_date: parsed.data.dueDate, target_value: parsed.data.targetValue, sort_order: parsed.data.sortOrder,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    });
    refreshWork(); return { ok: true, message: "Meta atualizada." };
  } catch (error) { return failure(error); }
}

export async function toggleMilestoneAction(id: string, completed: boolean): Promise<WorkActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await updateGoalMilestone(client, parsed.data, { status: completed ? "completed" : "pending", completed_at: completed ? new Date().toISOString() : null });
    refreshWork(); return { ok: true, message: completed ? "Meta concluída." : "Meta reaberta." };
  } catch (error) { return failure(error); }
}

export async function moveMilestoneAction(id: string, direction: "up" | "down", goalId: string): Promise<WorkActionResult> {
  const [idParsed, goalParsed] = [idSchema.safeParse(id), idSchema.safeParse(goalId)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!goalParsed.success) return invalid(goalParsed.error);
  try {
    const client = await authorizedClient();
    const milestones = await listGoalMilestones(client, goalParsed.data);
    const index = milestones.findIndex((item) => item.id === idParsed.data);
    const otherIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || otherIndex < 0 || otherIndex >= milestones.length) return { ok: true, message: "A ordem já está correta." };
    const current = milestones[index]!; const other = milestones[otherIndex]!;
    await updateGoalMilestone(client, current.id, { sort_order: other.sort_order });
    await updateGoalMilestone(client, other.id, { sort_order: current.sort_order });
    refreshWork(); return { ok: true, message: "Ordem atualizada." };
  } catch (error) { return failure(error); }
}

export async function deleteMilestoneAction(id: string): Promise<WorkActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try { const client = await authorizedClient(); await deleteGoalMilestone(client, parsed.data); refreshWork(); return { ok: true, message: "Meta eliminada." }; }
  catch (error) { return failure(error); }
}

export async function createTaskAction(input: TaskInput): Promise<WorkActionResult> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await assertActiveOwner(client, parsed.data.responsibleUserId);
    const task = await createTask(client, {
      title: parsed.data.title, description: parsed.data.description, status: parsed.data.status,
      waiting_reason: parsed.data.waitingReason, priority: parsed.data.priority, due_date: parsed.data.dueDate,
      responsible_user_id: parsed.data.responsibleUserId, business_id: parsed.data.businessId,
      project_id: parsed.data.projectId, deal_id: parsed.data.dealId,
    });
    try { await replaceTaskGoals(client, task.id, parsed.data.goalIds); }
    catch (error) { await deleteTask(client, task.id); throw error; }
    refreshWork(); return { ok: true, message: "Tarefa criada com sucesso." };
  } catch (error) { return failure(error); }
}

export async function updateTaskAction(id: string, input: TaskInput): Promise<WorkActionResult> {
  const [idParsed, parsed] = [idSchema.safeParse(id), taskInputSchema.safeParse(input)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await assertActiveOwner(client, parsed.data.responsibleUserId);
    await updateTask(client, idParsed.data, {
      title: parsed.data.title, description: parsed.data.description, status: parsed.data.status,
      waiting_reason: parsed.data.waitingReason, priority: parsed.data.priority, due_date: parsed.data.dueDate,
      responsible_user_id: parsed.data.responsibleUserId, business_id: parsed.data.businessId,
      project_id: parsed.data.projectId, deal_id: parsed.data.dealId,
    });
    await replaceTaskGoals(client, idParsed.data, parsed.data.goalIds);
    refreshWork(); return { ok: true, message: "Tarefa atualizada." };
  } catch (error) { return failure(error); }
}

export async function changeTaskStatusAction(id: string, status: "todo" | "in_progress" | "done"): Promise<WorkActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try { const client = await authorizedClient(); await updateTask(client, parsed.data, { status, waiting_reason: null }); refreshWork(); return { ok: true, message: status === "done" ? "Tarefa concluída." : "Estado atualizado." }; }
  catch (error) { return failure(error); }
}

export async function deleteTaskAction(id: string): Promise<WorkActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try { const client = await authorizedClient(); await deleteTask(client, parsed.data); refreshWork(); return { ok: true, message: "Tarefa eliminada." }; }
  catch (error) { return failure(error); }
}
