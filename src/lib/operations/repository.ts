import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAuthorizedUser } from "@/lib/auth/authorization";
import type {
  Activity,
  Client,
  LoadResult,
  Member,
  Project,
  Task,
} from "./model";

export const operationsEnabled = () =>
  process.env.PIRILIGHT_OPERATIONS_ENABLED === "true";

async function allRows<T>(db: SupabaseClient, table: string): Promise<T[]> {
  const rows: T[] = [];
  // Supabase limits result sizes. Page explicitly rather than silently dropping work.
  for (let offset = 0; offset < 20000; offset += 500) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.code);
    rows.push(...(data as T[]));
    if (data.length < 500) return rows;
  }
  throw new Error("workspace_size_limit");
}

export const loadOperations = cache(async (): Promise<LoadResult> => {
  await requireAuthorizedUser();
  if (!operationsEnabled())
    return {
      status: "disabled",
      message:
        "A base operacional ainda não foi ativada. O acesso ao Studio está a funcionar; os registos partilhados precisam de ser preparados antes de começares a guardar trabalho.",
    };
  try {
    const db = await createClient();
    const [clients, projects, tasks, members, activity] = await Promise.all([
      allRows<Client>(db, "businesses"),
      allRows<Project>(db, "projects"),
      allRows<Task>(db, "tasks"),
      db.rpc("studio_members"),
      db
        .from("operation_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    if (members.error || activity.error)
      throw new Error(members.error?.code ?? activity.error?.code);
    return {
      status: "ready",
      data: {
        clients,
        projects,
        tasks,
        members: members.data as Member[],
        activity: activity.data as Activity[],
      },
    };
  } catch (error) {
    console.error(
      "[operations] Read failed",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      status: "error",
      message:
        "Não foi possível carregar o trabalho. Os dados guardados não foram alterados. Tenta atualizar; se continuar, verifica a ligação à base operacional.",
    };
  }
});
