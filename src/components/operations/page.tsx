import { notFound } from "next/navigation";
import { requireAuthorizedUser } from "@/lib/auth/authorization";
import { loadOperations } from "@/lib/operations/repository";
import { todayIso } from "@/lib/utils/date";
import { saveOperation } from "@/app/actions/operations";
import { OperationsBoard, type Mode } from "./board";

export async function OperationsPage({
  mode,
  id,
  searchParams,
}: {
  mode: Mode;
  id?: string;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [result, user, params] = await Promise.all([
    loadOperations(),
    requireAuthorizedUser(),
    searchParams ?? Promise.resolve({}),
  ]);
  if (id && result.status === "ready") {
    const records =
      mode === "tasks"
        ? result.data.tasks
        : mode === "projects"
          ? result.data.projects
          : result.data.clients;
    if (!records.some((r) => r.id === id)) notFound();
  }
  const filters: Record<string, string> = {};
  for (const key of ["q", "owner", "state", "view", "type"] as const) {
    const value = (params as Record<string, string | string[] | undefined>)[
      key
    ];
    if (typeof value === "string") filters[key] = value.slice(0, 200);
  }
  return (
    <OperationsBoard
      key={JSON.stringify([mode, id, filters])}
      mode={mode}
      id={id}
      result={result}
      actorId={user.userId}
      today={todayIso(new Date())}
      filters={filters}
      save={saveOperation}
    />
  );
}
