"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isWaiting,
  priorityLabels,
  statusLabels,
  typeLabels,
  type Client,
  type EntityKind,
  type Project,
  type SaveAction,
  type Snapshot,
  type Task,
} from "@/lib/operations/model";

export function Editor({
  kind,
  record,
  data,
  actorId,
  projectId,
  clientId,
  save,
  onClose,
  onSaved,
}: {
  kind: EntityKind;
  record?: Client | Project | Task;
  data: Snapshot;
  actorId: string;
  projectId?: string;
  clientId?: string;
  save: SaveAction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const task = kind === "task" ? (record as Task | undefined) : undefined;
  const project =
    kind === "project" ? (record as Project | undefined) : undefined;
  const [status, setStatus] = useState(
    task?.status ?? project?.status ?? "todo",
  );
  const [type, setType] = useState(
    project?.type ?? (clientId ? "digital" : "internal"),
  );
  const [context, setContext] = useState(
    task?.project_id
      ? `project:${task.project_id}`
      : task?.business_id
        ? `client:${task.business_id}`
        : projectId
          ? `project:${projectId}`
          : clientId
            ? `client:${clientId}`
            : "",
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const noun =
    kind === "task" ? "tarefa" : kind === "project" ? "projeto" : "cliente";
  function submit(form: FormData) {
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const optional = (key: string) => text(key) || null;
    const work = {
      status,
      priority: text("priority") || "normal",
      assignee_id: optional("assignee_id"),
      due_date: optional("due_date"),
      notes: text("notes"),
    };
    const values =
      kind === "client"
        ? { name: text("title"), notes: text("notes") }
        : kind === "project"
          ? {
              ...work,
              name: text("title"),
              type,
              business_id: type === "internal" ? null : optional("business_id"),
            }
          : {
              ...work,
              title: text("title"),
              project_id: context.startsWith("project:")
                ? context.slice(8)
                : null,
              business_id: context.startsWith("client:")
                ? context.slice(7)
                : null,
              waiting_note: isWaiting(status) ? text("waiting_note") : "",
              review_date: isWaiting(status) ? optional("review_date") : null,
            };
    setError("");
    startTransition(async () => {
      try {
        const result = await save({
          kind,
          id: record?.id,
          version: record?.updated_at,
          values,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onSaved();
        onClose();
        router.refresh();
        if (!record)
          router.push(
            `/${kind === "client" ? "clients" : kind === "project" ? "projects" : "tasks"}/${result.id}`,
          );
      } catch {
        setError(
          "Não foi possível confirmar a gravação. Mantivemos os campos; verifica a ligação antes de repetir.",
        );
      }
    });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-xl"
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {record ? "Editar" : "Registar"} {noun}
          </DialogTitle>
          <DialogDescription>
            {kind === "task" && !record
              ? "Começa pelo que precisa de ser feito. Podes organizar os detalhes depois."
              : "Mantém o contexto e o próximo passo claros."}
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="space-y-4">
          <fieldset disabled={pending} className="space-y-4">
            <Field
              label={kind === "task" ? "O que precisa de ser feito?" : "Nome"}
              id="edit-title"
            >
              <Input
                id="edit-title"
                name="title"
                required
                maxLength={kind === "task" ? 200 : 160}
                defaultValue={
                  task?.title ??
                  (record as Client | Project | undefined)?.name ??
                  ""
                }
              />
            </Field>
            {kind === "project" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de trabalho" id="edit-type">
                  <Select
                    id="edit-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as Project["type"])}
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {type !== "internal" && (
                  <Field label="Cliente" id="edit-client">
                    <Select
                      id="edit-client"
                      name="business_id"
                      required
                      defaultValue={project?.business_id ?? clientId ?? ""}
                    >
                      <option value="">Escolher cliente</option>
                      {data.clients.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
            )}
            {kind === "task" && (
              <Field label="Contexto" id="edit-context">
                <Select
                  id="edit-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                >
                  <option value="">PiriLight · sem projeto</option>
                  <optgroup label="Projetos">
                    {data.projects.map((p) => (
                      <option key={p.id} value={`project:${p.id}`}>
                        {p.name} ·{" "}
                        {data.clients.find((c) => c.id === p.business_id)
                          ?.name ?? "PiriLight"}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Clientes · sem projeto">
                    {data.clients.map((c) => (
                      <option key={c.id} value={`client:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
            )}
            {kind !== "client" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Responsável" id="edit-owner">
                    <Select
                      id="edit-owner"
                      name="assignee_id"
                      defaultValue={
                        record
                          ? ((task ?? project)?.assignee_id ?? "")
                          : actorId
                      }
                    >
                      <option value="">Por atribuir</option>
                      {data.members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.display_name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Prazo" id="edit-due">
                    <Input
                      id="edit-due"
                      type="date"
                      name="due_date"
                      defaultValue={(task ?? project)?.due_date ?? ""}
                    />
                  </Field>
                </div>
                <details open={!!record || undefined}>
                  <summary className="cursor-pointer py-2 text-sm text-info">
                    Estado, prioridade e notas
                  </summary>
                  <div className="space-y-4 pt-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Estado" id="edit-status">
                        <Select
                          id="edit-status"
                          value={status}
                          onChange={(e) =>
                            setStatus(e.target.value as Task["status"])
                          }
                        >
                          {Object.entries(statusLabels).map(
                            ([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </Select>
                      </Field>
                      <Field label="Prioridade" id="edit-priority">
                        <Select
                          id="edit-priority"
                          name="priority"
                          defaultValue={(task ?? project)?.priority ?? "normal"}
                        >
                          {Object.entries(priorityLabels).map(
                            ([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ),
                          )}
                        </Select>
                      </Field>
                    </div>
                    {kind === "task" && isWaiting(status) && (
                      <div className="space-y-3 rounded-lg border border-warning/40 p-3">
                        <Field
                          label="O que falta / de quem dependemos?"
                          id="edit-wait"
                        >
                          <Input
                            id="edit-wait"
                            name="waiting_note"
                            required
                            maxLength={500}
                            defaultValue={task?.waiting_note ?? ""}
                          />
                        </Field>
                        <Field label="Voltar a acompanhar em" id="edit-review">
                          <Input
                            id="edit-review"
                            type="date"
                            name="review_date"
                            required
                            defaultValue={task?.review_date ?? ""}
                          />
                        </Field>
                      </div>
                    )}
                    <Field label="Notas e contexto" id="edit-notes">
                      <Textarea
                        id="edit-notes"
                        name="notes"
                        maxLength={5000}
                        defaultValue={record?.notes ?? ""}
                      />
                    </Field>
                  </div>
                </details>
              </>
            )}
            {kind === "client" && (
              <Field label="Notas de acompanhamento" id="edit-notes">
                <Textarea
                  id="edit-notes"
                  name="notes"
                  maxLength={5000}
                  defaultValue={record?.notes ?? ""}
                />
              </Field>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/50 p-3 text-sm"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
