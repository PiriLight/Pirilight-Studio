"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthorizedUser } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { operationsEnabled } from "@/lib/operations/repository";
import {
  clientInput,
  projectInput,
  taskInput,
  validationMessage,
  type SaveCommand,
  type SaveResult,
} from "@/lib/operations/model";

const commandSchema = z
  .object({
    kind: z.enum(["client", "project", "task"]),
    id: z.uuid().optional(),
    version: z.iso.datetime({ offset: true }).optional(),
    values: z.unknown(),
  })
  .refine((c) => !c.id || !!c.version, {
    message: "Atualiza a página antes de editar.",
  });

export async function deleteOperation(input: {
  kind: "client" | "project" | "task";
  id: string;
  version: string;
}): Promise<SaveResult> {
  await requireAuthorizedUser();
  if (!operationsEnabled()) return { ok: false, message: "A base operacional não está ativa." };
  const parsed = z.object({ kind: z.enum(["client", "project", "task"]), id: z.uuid(), version: z.iso.datetime({ offset: true }) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Pedido inválido. Atualiza a página." };
  const { kind, id, version } = parsed.data;
  try {
    const db = await createClient();
    const { data, error } = await db.from(kind === "client" ? "businesses" : kind === "project" ? "projects" : "tasks")
      .delete().eq("id", id).eq("updated_at", version).select("id").maybeSingle();
    if (error) return { ok: false, message: error.code === "23503"
      ? "Existem projetos ou tarefas associados. Move ou apaga primeiro esses registos."
      : "Não foi possível apagar. Atualiza a página e tenta novamente." };
    if (!data) return { ok: false, message: "O registo mudou entretanto ou já foi apagado. Atualiza a página antes de continuar." };
    revalidatePath("/", "layout");
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, message: "A ligação falhou. Atualiza a página para confirmar se o registo foi apagado." };
  }
}

export async function saveOperation(input: SaveCommand): Promise<SaveResult> {
  await requireAuthorizedUser();
  if (!operationsEnabled())
    return {
      ok: false,
      message: "A base operacional ainda não está ativa. Nada foi guardado.",
    };
  const command = commandSchema.safeParse(input);
  if (!command.success)
    return {
      ok: false,
      message: "Pedido inválido. Atualiza a página e tenta novamente.",
    };
  const { kind, id, version, values } = command.data;
  const schema =
    kind === "client"
      ? clientInput
      : kind === "project"
        ? projectInput
        : taskInput;
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: validationMessage(parsed.error) };
  const table =
    kind === "client"
      ? "businesses"
      : kind === "project"
        ? "projects"
        : "tasks";
  try {
    const db = await createClient();
    const payload: Record<string, unknown> = parsed.data;
    const result = id
      ? await db
          .from(table)
          .update(payload)
          .eq("id", id)
          .eq("updated_at", version!)
          .select("id")
          .maybeSingle()
      : await db.from(table).insert(payload).select("id").single();
    if (result.error) {
      console.error("[operations] Save failed", result.error.code);
      return {
        ok: false,
        message:
          result.error.code === "23503" || result.error.code === "23514"
            ? "Revê o cliente, o projeto, o responsável e os campos obrigatórios. A relação selecionada pode já não estar disponível."
            : "Não foi possível guardar. Mantivemos o formulário para poderes tentar novamente.",
      };
    }
    if (!result.data)
      return {
        ok: false,
        message:
          "Este registo mudou entretanto ou já não está acessível. Fecha e atualiza a página antes de editar, para não sobrescrever trabalho.",
      };
    revalidatePath("/", "layout");
    return { ok: true, id: result.data.id as string };
  } catch {
    return {
      ok: false,
      message:
        "A ligação falhou. Confirma se o registo foi guardado antes de repetires a criação.",
    };
  }
}
