import type { GoalRow, TaskRow } from "@/lib/data/supabase/operational";

export type TaskTimeFilter = "all" | "mine" | "today" | "overdue" | "upcoming" | "completed";

export interface GoalProgress {
  percentage: number | null;
  barPercentage: number;
  label: string;
}

const numberFormatter = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 });

export function deriveGoalProgress(goal: Pick<GoalRow, "metric" | "current_value" | "target_value">): GoalProgress {
  const metric = goal.metric?.trim();
  if (!metric) return { percentage: null, barPercentage: 0, label: "Sem métrica numérica" };

  const current = Number(goal.current_value);
  const target = Number(goal.target_value);
  const label = `${numberFormatter.format(current)} / ${numberFormatter.format(target)} ${metric}`;
  if (target === 0) return { percentage: null, barPercentage: current > 0 ? 100 : 0, label };

  const percentage = Math.max(0, Math.round((current / target) * 100));
  return { percentage, barPercentage: Math.min(100, percentage), label };
}

export function filterOperationalTasks(
  tasks: readonly TaskRow[],
  options: {
    today: string;
    currentUserId: string;
    time: TaskTimeFilter;
    responsibleUserId?: string;
    priority?: string;
    status?: string;
    query?: string;
  },
): TaskRow[] {
  const query = options.query?.trim().toLocaleLowerCase("pt-PT") ?? "";
  const upcomingLimit = new Date(`${options.today}T12:00:00`);
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);
  const upcomingIso = upcomingLimit.toISOString().slice(0, 10);

  return tasks.filter((task) => {
    if (query && !`${task.title} ${task.description ?? ""}`.toLocaleLowerCase("pt-PT").includes(query)) return false;
    if (options.responsibleUserId && task.responsible_user_id !== options.responsibleUserId) return false;
    if (options.priority && task.priority !== options.priority) return false;
    if (options.status && task.status !== options.status) return false;

    switch (options.time) {
      case "mine": return task.responsible_user_id === options.currentUserId;
      case "today": return task.status !== "done" && task.due_date === options.today;
      case "overdue": return task.status !== "done" && Boolean(task.due_date && task.due_date < options.today);
      case "upcoming": return task.status !== "done" && Boolean(task.due_date && task.due_date > options.today && task.due_date <= upcomingIso);
      case "completed": return task.status === "done";
      default: return true;
    }
  });
}
