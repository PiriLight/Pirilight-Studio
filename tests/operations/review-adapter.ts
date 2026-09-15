// Local UI integration harness ONLY. Never imported by the final application.
// Uses the disposable Docker test DB, not any Supabase endpoint.
import { execFileSync } from "node:child_process";
import { revalidatePath } from "next/cache";
import { requireAuthorizedUser } from "@/lib/auth/authorization";
import {
  clientInput,
  projectInput,
  taskInput,
  type SaveCommand,
  type SaveResult,
  type LoadResult,
} from "@/lib/operations/model";
import { z } from "zod";
const actor = "00000000-0000-4000-8000-000000000001";
const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
function sql(statement: string) {
  if (process.env.NODE_ENV !== "development")
    throw new Error("Test harness is development-only");
  const text = execFileSync(
    "docker",
    [
      "exec",
      "pirilight-organization-test-db",
      "psql",
      "-U",
      "postgres",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `begin; set local role authenticated; set local "request.jwt.claim.sub"='${actor}'; ${statement}; commit;`,
    ],
    { encoding: "utf8", timeout: 15000 },
  );
  return JSON.parse(text.trim() || "null");
}
export async function reviewLoad(): Promise<LoadResult> {
  await requireAuthorizedUser();
  const data = sql(
    `select json_build_object('clients',(select coalesce(json_agg(b),'[]') from businesses b),'projects',(select coalesce(json_agg(p),'[]') from projects p),'tasks',(select coalesce(json_agg(t),'[]') from tasks t),'members',(select coalesce(json_agg(m),'[]') from studio_members() m),'activity',(select coalesce(json_agg(a),'[]') from (select * from operation_activity order by created_at desc limit 30) a))`,
  );
  return { status: "ready", data };
}
export async function reviewSave(input: SaveCommand): Promise<SaveResult> {
  await requireAuthorizedUser();
  const schema =
    input.kind === "client"
      ? clientInput
      : input.kind === "project"
        ? projectInput
        : taskInput;
  const parsed = schema.safeParse(input.values);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0]!.message };
  if (
    input.id &&
    (!z.uuid().safeParse(input.id).success ||
      !z.iso.datetime({ offset: true }).safeParse(input.version).success)
  )
    return { ok: false, message: "Versão inválida" };
  const table =
    input.kind === "client"
      ? "businesses"
      : input.kind === "project"
        ? "projects"
        : "tasks";
  const values = { ...parsed.data } as Record<string, unknown>;
  // Current real login is kept for UI authorization, assignment uses only fixture IDs.
  if (values.assignee_id && !String(values.assignee_id).startsWith("00000000-"))
    values.assignee_id = actor;
  const columns = Object.keys(values);
  const expressions = Object.values(values).map((v) =>
    v === null ? "null" : literal(String(v)),
  );
  const change = input.id
    ? `update ${table} set ${columns.map((c, i) => `${c}=${expressions[i]}`).join(",")} where id=${literal(input.id)} and updated_at=${literal(input.version!)}`
    : `insert into ${table}(${columns.join(",")}) values (${expressions.join(",")})`;
  const result = sql(
    `with changed as (${change} returning id) select (select row_to_json(changed) from changed)`,
  );
  if (!result)
    return {
      ok: false,
      message: "Este registo mudou entretanto. Atualiza antes de editar.",
    };
  revalidatePath("/", "layout");
  return { ok: true, id: result.id };
}
