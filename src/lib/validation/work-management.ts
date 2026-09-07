import { z } from "zod";

const optionalText = z.string().trim().max(4000).transform((value) => value || null);
const optionalDate = z.union([z.literal(""), z.iso.date(), z.null()]).transform((value) => value || null);
const optionalId = z.union([z.literal(""), z.uuid(), z.null()]).transform((value) => value || null);

export const GOAL_CATEGORIES = ["financial", "commercial", "product", "operations", "personal"] as const;
export const GOAL_STATUSES = ["planned", "active", "on_hold", "completed", "cancelled"] as const;
export const PRIORITIES = ["low", "normal", "high"] as const;
export const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "waiting_on_client", "blocked", "done"] as const;
export const WAITING_REASONS = ["content", "photos", "approval", "payment", "access_login", "response", "other"] as const;

export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Indica o nome do objetivo.").max(160),
  description: optionalText,
  category: z.enum(GOAL_CATEGORIES),
  status: z.enum(GOAL_STATUSES),
  priority: z.enum(PRIORITIES),
  responsibleUserId: optionalId,
  startDate: optionalDate,
  deadline: optionalDate,
  metric: z.string().trim().max(80).transform((value) => value || null),
  currentValue: z.number().finite().min(0).max(9999999999.99),
  targetValue: z.number().finite().min(0).max(9999999999.99),
  taskIds: z.array(z.uuid()).max(500).transform((values) => [...new Set(values)]),
}).superRefine((value, context) => {
  if (value.startDate && value.deadline && value.deadline < value.startDate) {
    context.addIssue({ code: "custom", path: ["deadline"], message: "O prazo não pode ser anterior ao início." });
  }
});

export const milestoneInputSchema = z.object({
  goalId: z.uuid(),
  name: z.string().trim().min(1, "Indica o nome da meta.").max(160),
  description: optionalText,
  status: z.enum(MILESTONE_STATUSES),
  dueDate: optionalDate,
  targetValue: z.number().finite().min(0).max(9999999999.99).nullable(),
  sortOrder: z.number().int().min(0).max(100000),
});

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Indica o título da tarefa.").max(180),
  description: optionalText,
  status: z.enum(TASK_STATUSES),
  waitingReason: z.enum(WAITING_REASONS).nullable(),
  priority: z.enum(PRIORITIES),
  dueDate: optionalDate,
  responsibleUserId: z.uuid(),
  businessId: optionalId,
  projectId: optionalId,
  dealId: optionalId,
  goalIds: z.array(z.uuid()).max(500).transform((values) => [...new Set(values)]),
}).superRefine((value, context) => {
  const relationCount = [value.businessId, value.projectId, value.dealId].filter(Boolean).length;
  if (relationCount > 1) {
    context.addIssue({ code: "custom", path: ["businessId"], message: "Escolhe apenas uma relação operacional." });
  }
  if ((value.status === "waiting_on_client") !== Boolean(value.waitingReason)) {
    context.addIssue({ code: "custom", path: ["waitingReason"], message: "Indica o motivo apenas quando aguarda o cliente." });
  }
});

export const relationIdsSchema = z.array(z.uuid()).max(500).transform((values) => [...new Set(values)]);
export const idSchema = z.uuid();

export type GoalInput = z.input<typeof goalInputSchema>;
export type MilestoneInput = z.input<typeof milestoneInputSchema>;
export type TaskInput = z.input<typeof taskInputSchema>;
