import type { Task, TaskRelatedEntityType } from "@/types";

import { getMockData, read } from "./internal";

function resolveTaskBusinessId(
  task: Task,
  projectBusinessById: Map<string, string>,
  dealBusinessById: Map<string, string>,
): string | null {
  if (task.relatedEntityId === null) return null;

  switch (task.relatedEntityType) {
    case "business":
      return task.relatedEntityId;
    case "project":
      return projectBusinessById.get(task.relatedEntityId) ?? null;
    case "deal":
      return dealBusinessById.get(task.relatedEntityId) ?? null;
    default:
      return null;
  }
}

export async function getTasks(now: Date = new Date()): Promise<Task[]> {
  return read(getMockData(now).tasks);
}

export async function getTaskById(id: string, now: Date = new Date()): Promise<Task | null> {
  return read(getMockData(now).tasks.find((t) => t.id === id) ?? null);
}

export async function getTasksByAssignee(
  assigneeId: string,
  now: Date = new Date(),
): Promise<Task[]> {
  return read(getMockData(now).tasks.filter((t) => t.assigneeId === assigneeId));
}

/** Resolve o par polimórfico (`relatedEntityType` + `relatedEntityId`). */
export async function getTasksForEntity(
  type: TaskRelatedEntityType,
  entityId: string,
  now: Date = new Date(),
): Promise<Task[]> {
  return read(
    getMockData(now).tasks.filter(
      (t) => t.relatedEntityType === type && t.relatedEntityId === entityId,
    ),
  );
}

/**
 * Tarefas relacionadas com um negócio — diretamente, ou através de um dos
 * seus Projects ou Deals. É o que o separador "Tarefas" do Business Detail
 * Hub mostra: tudo o que toca este negócio, seja qual for o link polimórfico.
 */
export async function getTasksByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<Task[]> {
  const data = getMockData(now);
  const projectBusinessById = new Map(data.projects.map((p) => [p.id, p.businessId]));
  const dealBusinessById = new Map(data.deals.map((d) => [d.id, d.businessId]));

  return read(
    data.tasks.filter(
      (t) => resolveTaskBusinessId(t, projectBusinessById, dealBusinessById) === businessId,
    ),
  );
}

/** Tarefas ainda nossas: nem concluídas, nem à espera do cliente. */
export async function getOpenTasks(now: Date = new Date()): Promise<Task[]> {
  return read(
    getMockData(now).tasks.filter((t) => t.status !== "done" && t.status !== "waiting_on_client"),
  );
}
