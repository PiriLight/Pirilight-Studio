import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  listActiveAppUsers,
  listAllGoalMilestones,
  listBusinesses,
  listDeals,
  listGoals,
  listGoalTasks,
  listProjects,
  listTasks,
  type AppUserRow,
  type BusinessRow,
  type DealRow,
  type GoalMilestoneRow,
  type GoalRow,
  type GoalTaskRow,
  type ProjectRow,
  type TaskRow,
} from "./operational";

export interface WorkManagementSnapshot {
  users: AppUserRow[];
  businesses: BusinessRow[];
  deals: DealRow[];
  projects: ProjectRow[];
  goals: GoalRow[];
  milestones: GoalMilestoneRow[];
  tasks: TaskRow[];
  goalTasks: GoalTaskRow[];
}

export async function loadWorkManagementSnapshot(): Promise<WorkManagementSnapshot> {
  const client = await createClient();
  const [users, businesses, deals, projects, goals, milestones, tasks, goalTasks] = await Promise.all([
    listActiveAppUsers(client),
    listBusinesses(client),
    listDeals(client),
    listProjects(client),
    listGoals(client),
    listAllGoalMilestones(client),
    listTasks(client),
    listGoalTasks(client),
  ]);

  return { users, businesses, deals, projects, goals, milestones, tasks, goalTasks };
}
