import { z } from "zod";

export function validationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue?.code === "custom") return issue.message;
  const labels: Record<string, string> = {
    title: "título",
    name: "nome",
    notes: "notas",
    due_date: "prazo",
    review_date: "data de acompanhamento",
    waiting_note: "motivo",
    assignee_id: "responsável",
    business_id: "cliente",
    project_id: "projeto",
    type: "tipo",
    status: "estado",
    priority: "prioridade",
  };
  return `Revê o campo ${labels[String(issue?.path[0])] ?? "indicado"}. Preenche um valor válido dentro dos limites do formulário.`;
}

export const statusLabels = {
  todo: "Por fazer",
  in_progress: "Em progresso",
  waiting_on_client: "A aguardar",
  blocked: "Bloqueado",
  done: "Concluído",
} as const;
export const priorityLabels = {
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
} as const;
export const typeLabels = {
  website: "Website",
  piricard: "PiriCard",
  digital: "Solução digital",
  internal: "Trabalho interno",
} as const;
const uuid = z.uuid();
const date = z.iso.date().nullable();
const notes = z.string().trim().max(5000);
const status = z.enum([
  "todo",
  "in_progress",
  "waiting_on_client",
  "blocked",
  "done",
]);
const priority = z.enum(["high", "normal", "low"]);
export const clientInput = z.object({
  name: z.string().trim().min(1).max(160),
  notes,
});
const workFields = {
  status,
  priority,
  assignee_id: uuid.nullable(),
  due_date: date,
  notes,
};
export const projectInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    business_id: uuid.nullable(),
    type: z.enum(["website", "piricard", "digital", "internal"]),
    ...workFields,
  })
  .refine(
    (p) =>
      p.type === "internal" ? p.business_id === null : p.business_id !== null,
    {
      message: "Associa um cliente; trabalho interno fica sem cliente.",
      path: ["business_id"],
    },
  );
export const taskInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    project_id: uuid.nullable(),
    business_id: uuid.nullable(),
    ...workFields,
    waiting_note: z.string().trim().max(500),
    review_date: date,
  })
  .refine((t) => !(t.project_id && t.business_id), {
    message: "O cliente é obtido através do projeto.",
    path: ["business_id"],
  })
  .refine(
    (t) =>
      !isWaiting(t.status) ||
      (t.waiting_note.length > 0 && t.review_date !== null),
    {
      message: "Indica o motivo e uma data para voltar a acompanhar.",
      path: ["review_date"],
    },
  )
  .refine(
    (t) =>
      isWaiting(t.status) || (t.waiting_note === "" && t.review_date === null),
    {
      message: "Retira o acompanhamento ao sair de espera ou bloqueio.",
      path: ["review_date"],
    },
  );

type Audit = { id: string; created_at: string; updated_at: string };
export type Client = z.infer<typeof clientInput> & Audit;
export type Project = z.infer<typeof projectInput> & Audit;
export type Task = z.infer<typeof taskInput> & Audit;
export type Member = { user_id: string; display_name: string };
export type Activity = {
  id: string;
  entity_type: "businesses" | "projects" | "tasks";
  entity_id: string;
  title: string;
  action: "created" | "updated" | "deleted";
  actor_id: string;
  created_at: string;
};
export type Snapshot = {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  members: Member[];
  activity: Activity[];
};
export type LoadResult =
  | { status: "ready"; data: Snapshot }
  | { status: "disabled" | "error"; message: string };
export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; message: string };
export type EntityKind = "task" | "project" | "client";
export type SaveCommand = {
  kind: EntityKind;
  id?: string;
  version?: string;
  values: unknown;
};
export type SaveAction = (command: SaveCommand) => Promise<SaveResult>;
export function isWaiting(s: string) {
  return s === "blocked" || s === "waiting_on_client";
}
export function taskClient(t: Task, data: Snapshot) {
  return data.clients.find(
    (c) =>
      c.id ===
      (t.project_id
        ? data.projects.find((p) => p.id === t.project_id)?.business_id
        : t.business_id),
  );
}
const rank = { high: 0, normal: 1, low: 2 };
export function orderTasks(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      rank[a.priority] - rank[b.priority] ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
}
export function nextTask(tasks: Task[]) {
  return orderTasks(
    tasks.filter((t) => t.status === "todo" || t.status === "in_progress"),
  )[0];
}
export type Attention = {
  kind: "task" | "project";
  id: string;
  title: string;
  reasons: string[];
  urgency: number;
  href: string;
};
export function attention(data: Snapshot, today: string): Attention[] {
  const tasks: Attention[] = data.tasks
    .filter((t) => t.status !== "done")
    .flatMap((t) => {
      const reasons = [];
      if (t.due_date && t.due_date < today) reasons.push("Prazo ultrapassado");
      if (t.status === "blocked") reasons.push("Trabalho bloqueado");
      if (isWaiting(t.status) && t.review_date && t.review_date <= today)
        reasons.push("Retomar acompanhamento");
      if (!t.assignee_id) reasons.push("Sem responsável");
      if (
        t.project_id &&
        data.projects.find((p) => p.id === t.project_id)?.status === "done"
      )
        reasons.push("Projeto concluído com trabalho aberto");
      return reasons.length
        ? [
            {
              kind: "task" as const,
              id: t.id,
              title: t.title,
              reasons,
              urgency: t.due_date && t.due_date < today ? 0 : 1,
              href: `/tasks/${t.id}`,
            },
          ]
        : [];
    });
  const projects: Attention[] = data.projects
    .filter((p) => p.status !== "done")
    .flatMap((p) => {
      const reasons = [];
      if (p.due_date && p.due_date < today)
        reasons.push("Prazo do projeto ultrapassado");
      if (p.status === "blocked") reasons.push("Projeto bloqueado");
      if (!p.assignee_id) reasons.push("Sem responsável");
      if (!nextTask(data.tasks.filter((t) => t.project_id === p.id)))
        reasons.push("Sem próxima ação executável");
      return reasons.length
        ? [
            {
              kind: "project" as const,
              id: p.id,
              title: p.name,
              reasons,
              urgency: 2,
              href: `/projects/${p.id}`,
            },
          ]
        : [];
    });
  return [...tasks, ...projects].sort(
    (a, b) =>
      a.urgency - b.urgency ||
      a.title.localeCompare(b.title, "pt") ||
      a.id.localeCompare(b.id),
  );
}
export function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
}
export function searchTasks(
  data: Snapshot,
  query: string,
  assignee = "all",
  state = "all",
) {
  const term = normalized(query.trim());
  return orderTasks(
    data.tasks.filter(
      (t) =>
        (assignee === "all" ||
          (assignee === "none"
            ? !t.assignee_id
            : t.assignee_id === assignee)) &&
        (state === "all" || t.status === state) &&
        normalized(
          [
            t.title,
            t.notes,
            taskClient(t, data)?.name,
            data.projects.find((p) => p.id === t.project_id)?.name,
          ].join(" "),
        ).includes(term),
    ),
  );
}
