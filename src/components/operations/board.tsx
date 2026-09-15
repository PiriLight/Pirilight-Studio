"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CircleCheck,
  FolderKanban,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Editor } from "./editor";
import { RecordActions } from "./record-actions";
import {
  attention,
  isWaiting,
  nextTask,
  normalized,
  priorityLabels,
  searchTasks,
  statusLabels,
  taskClient,
  typeLabels,
  type Client,
  type EntityKind,
  type LoadResult,
  type Project,
  type SaveAction,
  type Snapshot,
  type Task,
} from "@/lib/operations/model";
import { cn } from "@/lib/utils";

export type Mode = "home" | "tasks" | "projects" | "clients";
type Filter = {
  q?: string;
  owner?: string;
  state?: string;
  view?: string;
  type?: string;
};
export function OperationsBoard({
  result,
  mode,
  id,
  actorId,
  today,
  filters,
  save,
}: {
  result: LoadResult;
  mode: Mode;
  id?: string;
  actorId: string;
  today: string;
  filters: Filter;
  save: SaveAction;
}) {
  const [editor, setEditor] = useState<{
    kind: EntityKind;
    record?: Client | Project | Task;
    projectId?: string;
    clientId?: string;
  } | null>(null);
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(
      filters.q ||
        (filters.owner && filters.owner !== "all") ||
        (filters.state && filters.state !== "all") ||
        (filters.type && filters.type !== "all"),
    ),
  );
  const data = result.status === "ready" ? result.data : null;
  const selectedTask =
    id && mode === "tasks" ? data?.tasks.find((t) => t.id === id) : undefined;
  const selectedProject =
    id && mode === "projects"
      ? data?.projects.find((p) => p.id === id)
      : undefined;
  const selectedClient =
    id && mode === "clients"
      ? data?.clients.find((c) => c.id === id)
      : undefined;
  const title =
    selectedTask?.title ??
    selectedProject?.name ??
    selectedClient?.name ??
    {
      home: "Centro de Organização",
      tasks: "Tarefas",
      projects: "Projetos",
      clients: "Clientes",
    }[mode];
  const description = {
    home: "O que precisa de atenção. O que fazemos a seguir.",
    tasks: "Do primeiro apontamento ao trabalho concluído.",
    projects: "Uma vista de todo o trabalho da PiriLight.",
    clients: "As relações e o trabalho que estamos a construir.",
  }[mode];
  const createTask = (projectId?: string, clientId?: string) =>
    setEditor({ kind: "task", projectId, clientId });
  const newKind =
    mode === "clients" ? "client" : mode === "projects" ? "project" : "task";
  const newLabel =
    newKind === "client"
      ? "Novo cliente"
      : newKind === "project"
        ? "Novo projeto"
        : "Capturar tarefa";
  const tasks = data
    ? searchTasks(data, filters.q ?? "", filters.owner, filters.state)
    : [];
  const term = normalized(filters.q ?? "");
  const projects =
    data?.projects.filter(
      (p) =>
        normalized(
          `${p.name} ${data.clients.find((c) => c.id === p.business_id)?.name ?? "PiriLight"}`,
        ).includes(term) &&
        (!filters.type || filters.type === "all" || p.type === filters.type) &&
        (!filters.owner ||
          filters.owner === "all" ||
          (filters.owner === "none"
            ? !p.assignee_id
            : p.assignee_id === filters.owner)) &&
        (!filters.state ||
          filters.state === "all" ||
          p.status === filters.state),
    ) ?? [];
  const clients =
    data?.clients.filter((c) =>
      normalized(`${c.name} ${c.notes}`).includes(term),
    ) ?? [];
  const alerts = data ? attention(data, today) : [];
  const view = filters.view ?? "attention";
  const selectedItems =
    view === "today"
      ? tasks.filter(
          (t) =>
            t.status !== "done" &&
            (t.due_date === today ||
              (isWaiting(t.status) &&
                !!t.review_date &&
                t.review_date <= today)),
        )
      : view === "waiting"
        ? tasks.filter((t) => isWaiting(t.status))
        : tasks.filter(
            (t) =>
              (t.status === "todo" || t.status === "in_progress") &&
              (!t.project_id ||
                data?.projects.find((p) => p.id === t.project_id)?.status !==
                  "done"),
          );
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-2 font-mono text-xs uppercase tracking-[.16em] text-muted-foreground">
            PiriLight · Organização
          </p>
          {id && (
            <Link
              className="mb-3 inline-block text-sm text-info hover:underline"
              href={`/${mode}`}
            >
              ←{" "}
              {mode === "tasks"
                ? "Todas as tarefas"
                : mode === "projects"
                  ? "Todos os projetos"
                  : "Todos os clientes"}
            </Link>
          )}
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {id
              ? "Contexto, decisões e trabalho ligado num só lugar."
              : description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data && (selectedTask || selectedProject || selectedClient) && (
            <RecordActions kind={selectedTask ? "task" : selectedProject ? "project" : "client"} record={(selectedTask || selectedProject || selectedClient)!} data={data} />
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Atualizar dados"
            onClick={() => router.refresh()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            disabled={!data}
            onClick={() => {
              if (selectedTask)
                setEditor({ kind: "task", record: selectedTask });
              else if (selectedProject) createTask(selectedProject.id);
              else if (selectedClient)
                setEditor({ kind: "project", clientId: selectedClient.id });
              else setEditor({ kind: newKind });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {selectedTask
              ? "Editar tarefa"
              : selectedProject
                ? "Adicionar tarefa"
                : selectedClient
                  ? "Criar projeto"
                  : newLabel}
          </Button>
        </div>
      </div>

      {saved && !editor && (
        <p
          role="status"
          className="rounded-lg border border-success/40 p-3 text-sm"
        >
          Alterações guardadas.
        </p>
      )}
      {!data ? (
        <section
          className="rounded-xl border border-info/30 bg-card p-6 sm:p-9"
          aria-label="Estado da base operacional"
        >
          <div className="flex items-start gap-4">
            <AlertCircle className="mt-1 h-6 w-6 shrink-0 text-info" />
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold">
                {result.status === "disabled"
                  ? "Pronto para ligar o trabalho da equipa"
                  : "Não conseguimos carregar os registos"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {result.status !== "ready" && result.message}
              </p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {result.status === "disabled"
                  ? "A criação ficará disponível depois da ativação. Os antigos exemplos e apontamentos locais não foram importados como trabalho real."
                  : "Não mostramos uma lista vazia quando a ligação falha. Usa Atualizar dados para voltar a tentar."}
              </p>
            </div>
          </div>
          {result.status === "disabled" && (
            <div className="mt-8 grid gap-6 border-t pt-6 sm:grid-cols-3">
              {[
                ["Clientes", "O contexto de cada relação."],
                ["Projetos", "O resultado a entregar e quem o acompanha."],
                ["Tarefas", "O próximo passo, o prazo e o que falta."],
              ].map(([label, text]) => (
                <div key={label}>
                  <h3 className="font-medium">{label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {!id && (
            <Button
              variant="outline"
              className="sm:hidden"
              aria-expanded={filtersOpen}
              aria-controls="operation-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Search className="mr-2 h-4 w-4" />
              Pesquisar e filtrar
            </Button>
          )}
          {!id && (
            <form
              id="operation-filters"
              className={cn(
                "flex-wrap items-end gap-3 rounded-xl border bg-card p-4 sm:flex",
                filtersOpen ? "flex" : "hidden",
              )}
              method="get"
              action={mode === "home" ? "/" : `/${mode}`}
            >
              <label className="min-w-[180px] flex-1 space-y-2">
                <span className="text-xs text-muted-foreground">
                  {mode === "home" ? "Encontrar no Centro" : "Pesquisar"}
                </span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    name="q"
                    defaultValue={filters.q ?? ""}
                    placeholder={
                      mode === "home"
                        ? "Cliente, projeto ou tarefa…"
                        : "Nome ou contexto…"
                    }
                  />
                </div>
              </label>
              {mode !== "clients" && (
                <>
                  <label
                    htmlFor="filter-owner"
                    className="min-w-36 flex-1 space-y-2 sm:max-w-44"
                  >
                    <span className="text-xs text-muted-foreground">
                      Responsável
                    </span>
                    <Select
                      id="filter-owner"
                      name="owner"
                      defaultValue={filters.owner ?? "all"}
                    >
                      <option value="all">Toda a equipa</option>
                      <option value="none">Por atribuir</option>
                      {data.members.map((m) => (
                        <option value={m.user_id} key={m.user_id}>
                          {m.display_name}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="min-w-36 flex-1 space-y-2 sm:max-w-44">
                    <span className="text-xs text-muted-foreground">
                      Estado
                    </span>
                    <Select name="state" defaultValue={filters.state ?? "all"}>
                      <option value="all">Todos os estados</option>
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </>
              )}
              {mode === "projects" && (
                <label className="space-y-2">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <Select name="type" defaultValue={filters.type ?? "all"}>
                    <option value="all">Todos os tipos</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              {mode === "home" && (
                <input type="hidden" name="view" value={view} />
              )}
              <Button variant="secondary">Pesquisar</Button>
              <Link
                className="px-2 py-2 text-xs text-muted-foreground hover:underline"
                href={mode === "home" ? "/" : `/${mode}`}
              >
                Limpar
              </Link>
            </form>
          )}

          {selectedTask ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="space-y-5 rounded-xl border bg-card p-6">
                <Status value={selectedTask.status} />
                <Context task={selectedTask} data={data} />
                <div className="grid gap-5 sm:grid-cols-3">
                  <Fact label="Responsável">
                    {memberName(data, selectedTask.assignee_id)}
                  </Fact>
                  <Fact label="Prazo">{formatDate(selectedTask.due_date)}</Fact>
                  <Fact label="Prioridade">
                    {priorityLabels[selectedTask.priority]}
                  </Fact>
                </div>
                {isWaiting(selectedTask.status) && (
                  <div className="rounded-lg border border-warning/40 p-4">
                    <p className="text-sm font-medium">
                      {selectedTask.waiting_note}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Voltar a acompanhar:{" "}
                      {formatDate(selectedTask.review_date)}
                    </p>
                  </div>
                )}
                <Notes value={selectedTask.notes} />
              </section>
              <History data={data} kind="tasks" id={selectedTask.id} />
            </div>
          ) : selectedProject ? (
            <>
              <section className="flex flex-wrap items-start justify-between gap-5 rounded-xl border bg-card p-5">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {typeLabels[selectedProject.type]}
                  </p>
                  {selectedProject.business_id ? (
                    <Link
                      href={`/clients/${selectedProject.business_id}`}
                      className="text-info hover:underline"
                    >
                      {
                        data.clients.find(
                          (c) => c.id === selectedProject.business_id,
                        )?.name
                      }
                    </Link>
                  ) : (
                    <p>PiriLight · trabalho interno</p>
                  )}
                  <div>
                    <Status value={selectedProject.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <Fact label="Responsável">
                    {memberName(data, selectedProject.assignee_id)}
                  </Fact>
                  <Fact label="Prazo">
                    {formatDate(selectedProject.due_date)}
                  </Fact>
                  <Fact label="Prioridade">
                    {priorityLabels[selectedProject.priority]}
                  </Fact>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setEditor({ kind: "project", record: selectedProject })
                  }
                >
                  Editar projeto
                </Button>
              </section>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-6">
                  <NextStep
                    task={
                      selectedProject.status !== "done"
                        ? nextTask(
                            data.tasks.filter(
                              (t) => t.project_id === selectedProject.id,
                            ),
                          )
                        : undefined
                    }
                    done={selectedProject.status === "done"}
                    onCreate={() => createTask(selectedProject.id)}
                  />
                  <TaskList
                    tasks={data.tasks.filter(
                      (t) => t.project_id === selectedProject.id,
                    )}
                    data={data}
                    title="Trabalho deste projeto"
                  />
                  <section className="rounded-xl border p-5">
                    <Notes value={selectedProject.notes} />
                  </section>
                </div>
                <History
                  data={data}
                  kind="projects"
                  id={selectedProject.id}
                  relatedTaskIds={data.tasks
                    .filter((t) => t.project_id === selectedProject.id)
                    .map((t) => t.id)}
                />
              </div>
            </>
          ) : selectedClient ? (
            <>
              <section className="flex flex-wrap items-start justify-between gap-5 rounded-xl border bg-card p-5">
                <Notes value={selectedClient.notes} />
                <Button
                  variant="outline"
                  onClick={() =>
                    setEditor({ kind: "client", record: selectedClient })
                  }
                >
                  Editar cliente
                </Button>
              </section>
              <ProjectList
                projects={data.projects.filter(
                  (p) => p.business_id === selectedClient.id,
                )}
                data={data}
              />
              <TaskList
                tasks={data.tasks.filter(
                  (t) => taskClient(t, data)?.id === selectedClient.id,
                )}
                data={data}
                title="Tarefas ligadas a este cliente"
              />
              <Button
                variant="outline"
                onClick={() => createTask(undefined, selectedClient.id)}
              >
                Adicionar tarefa sem projeto
              </Button>
            </>
          ) : mode === "home" && !filters.q ? (
            <>
              <div
                className="grid grid-cols-2 gap-2 pb-1 sm:flex sm:overflow-x-auto"
                aria-label="Vistas de trabalho"
              >
                {[
                  ["attention", "Precisa de atenção"],
                  ["today", "Hoje"],
                  ["next", "A seguir"],
                  ["waiting", "A aguardar"],
                ].map(([key, label]) => (
                  <Link
                    key={key}
                    aria-current={view === key ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm",
                      view === key
                        ? "border-info bg-info/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                    href={`/?${new URLSearchParams({ ...filters, view: key } as Record<string, string>)}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  {view === "attention" ? (
                    <section className="overflow-hidden rounded-xl border bg-card">
                      <div className="border-b p-5">
                        <h2 className="font-semibold">
                          Resolver antes de avançar
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Prazos, bloqueios, acompanhamento e trabalho sem
                          orientação.
                        </p>
                      </div>
                      <div className="divide-y">
                        {alerts
                          .filter((a) =>
                            a.kind === "task"
                              ? tasks.some((t) => t.id === a.id)
                              : projects.some((p) => p.id === a.id),
                          )
                          .map((a) => (
                            <Link
                              key={`${a.kind}:${a.id}`}
                              href={a.href}
                              className="flex items-start gap-4 p-5 transition-colors hover:bg-accent"
                            >
                              <span
                                className={cn(
                                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                  a.urgency === 0 ? "bg-primary" : "bg-info",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-medium">
                                  {a.title}
                                </p>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                  {a.reasons.join(" · ")}
                                </p>
                              </div>
                              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          ))}
                      </div>
                      {!alerts.some((a) =>
                        a.kind === "task"
                          ? tasks.some((t) => t.id === a.id)
                          : projects.some((p) => p.id === a.id),
                      ) && (
                        <Empty>
                          Sem alertas para esta seleção. Consulta “A seguir” ou
                          captura uma tarefa.
                        </Empty>
                      )}
                    </section>
                  ) : (
                    <TaskList
                      data={data}
                      tasks={selectedItems}
                      title={
                        view === "today"
                          ? "Hoje e acompanhamentos por retomar"
                          : view === "waiting"
                            ? "Dependências e respostas pendentes"
                            : "Trabalho que pode avançar"
                      }
                    />
                  )}
                  <details className="rounded-lg border px-4 py-3 text-xs leading-6 text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-foreground">
                      Como é decidida a atenção?
                    </summary>
                    <p className="mt-2">
                      Uma tarefa aberta aparece quando ultrapassa o prazo, está
                      bloqueada, chega à data de acompanhamento, não tem
                      responsável ou pertence a um projeto já concluído. Um
                      projeto aberto aparece se está atrasado, bloqueado, sem
                      responsável ou sem tarefa executável.
                    </p>
                    <p>
                      A seguir: só tarefas por fazer ou em progresso, ordenadas
                      por prazo, prioridade e antiguidade. Concluídas ficam fora
                      dos alertas. Datas calculadas em Lisboa.
                    </p>
                  </details>
                </div>
                <aside className="space-y-5">
                  <NextStep
                    task={nextTask(
                      tasks.filter(
                        (t) =>
                          !t.project_id ||
                          data.projects.find((p) => p.id === t.project_id)
                            ?.status !== "done",
                      ),
                    )}
                    done={false}
                    onCreate={() => createTask()}
                  />
                  <section className="rounded-xl border p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">Projetos ativos</h2>
                      <Link className="text-xs text-info" href="/projects">
                        Ver todos
                      </Link>
                    </div>
                    {projects
                      .filter((p) => p.status !== "done")
                      .slice(0, 5)
                      .map((p) => (
                        <Link
                          className="mt-4 block border-t pt-4"
                          key={p.id}
                          href={`/projects/${p.id}`}
                        >
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {statusLabels[p.status]} ·{" "}
                            {memberName(data, p.assignee_id)}
                          </p>
                        </Link>
                      ))}
                    {!projects.some((p) => p.status !== "done") && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Ainda não há projetos ativos nesta seleção.
                      </p>
                    )}
                  </section>
                  <History data={data} />
                </aside>
              </div>
            </>
          ) : mode === "tasks" ? (
            <TaskList
              data={data}
              tasks={tasks}
              title={`${tasks.length} tarefas encontradas`}
            />
          ) : mode === "projects" ? (
            <ProjectList projects={projects} data={data} />
          ) : mode === "clients" ? (
            <ClientList clients={clients} data={data} />
          ) : (
            <div className="space-y-6">
              <TaskList data={data} tasks={tasks} title="Tarefas encontradas" />
              <ProjectList projects={projects} data={data} />
              <ClientList clients={clients} data={data} />
            </div>
          )}
        </>
      )}
      {editor && data && (
        <Editor
          {...editor}
          data={data}
          actorId={actorId}
          save={save}
          onClose={() => setEditor(null)}
          onSaved={() => setSaved(true)}
        />
      )}
    </div>
  );
}
function memberName(data: Snapshot, id: string | null) {
  return (
    data.members.find((m) => m.user_id === id)?.display_name ??
    (id ? "Responsável indisponível" : "Por atribuir")
  );
}
function formatDate(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("pt-PT", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Europe/Lisbon",
      }).format(new Date(`${date}T12:00:00Z`))
    : "Sem data";
}
function Status({ value }: { value: Task["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs",
        value === "done"
          ? "border-success/40 text-success"
          : value === "blocked"
            ? "border-primary/50 text-primary"
            : "text-muted-foreground",
      )}
    >
      {statusLabels[value]}
    </span>
  );
}
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}
function Notes({ value }: { value: string }) {
  return (
    <div className="min-w-0">
      <h2 className="text-sm font-medium">Notas e contexto</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
        {value ||
          "Ainda sem notas. Usa Editar para registar contexto ou decisões."}
      </p>
    </div>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 p-6 text-sm leading-6 text-muted-foreground">
      <CircleCheck className="mt-1 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
function Context({ task, data }: { task: Task; data: Snapshot }) {
  const client = taskClient(task, data);
  const project = data.projects.find((p) => p.id === task.project_id);
  return (
    <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
      {client ? (
        <Link
          className="hover:text-info hover:underline"
          href={`/clients/${client.id}`}
        >
          {client.name}
        </Link>
      ) : (
        <span>PiriLight · interno</span>
      )}
      {project && (
        <>
          <span>→</span>
          <Link
            className="hover:text-info hover:underline"
            href={`/projects/${project.id}`}
          >
            {project.name}
          </Link>
        </>
      )}
    </p>
  );
}
function TaskList({
  tasks,
  data,
  title,
}: {
  tasks: Task[];
  data: Snapshot;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b p-5 text-sm font-semibold">{title}</h2>
      <div className="divide-y">
        {tasks.map((t) => (
          <article key={t.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  className="break-words text-sm font-medium hover:text-info hover:underline"
                  href={`/tasks/${t.id}`}
                >
                  {t.title}
                </Link>
                <div className="mt-2">
                  <Context task={t} data={data} />
                </div>
              </div>
              <Status value={t.status} />
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {memberName(data, t.assignee_id)} · {priorityLabels[t.priority]} ·{" "}
              {isWaiting(t.status)
                ? `Acompanhar: ${formatDate(t.review_date)}`
                : `Prazo: ${formatDate(t.due_date)}`}
            </p>
            {isWaiting(t.status) && (
              <p className="mt-1 text-xs leading-5 text-warning">
                {t.waiting_note}
              </p>
            )}
          </article>
        ))}
      </div>
      {!tasks.length && (
        <Empty>
          Sem tarefas nesta seleção. Limpa os filtros ou usa Capturar tarefa
          para começar.
        </Empty>
      )}
    </section>
  );
}
function ProjectList({
  projects,
  data,
}: {
  projects: Project[];
  data: Snapshot;
}) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold">
        Projetos · {projects.length}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p) => {
          const next = nextTask(
            data.tasks.filter((t) => t.project_id === p.id),
          );
          return (
            <article
              key={p.id}
              className="space-y-4 rounded-xl border bg-card p-5"
            >
              <div className="flex justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {typeLabels[p.type]}
                </span>
                <Status value={p.status} />
              </div>
              <Link
                className="block text-lg font-semibold hover:text-info"
                href={`/projects/${p.id}`}
              >
                {p.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {data.clients.find((c) => c.id === p.business_id)?.name ??
                  "PiriLight · interno"}{" "}
                · {memberName(data, p.assignee_id)}
              </p>
              <div className="border-t pt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Próxima ação
                </p>
                {p.status === "done" ? (
                  <p className="text-sm">Projeto concluído</p>
                ) : next ? (
                  <Link
                    className="text-sm hover:text-info"
                    href={`/tasks/${next.id}`}
                  >
                    {next.title} →
                  </Link>
                ) : (
                  <Link
                    className="text-sm text-primary"
                    href={`/projects/${p.id}`}
                  >
                    Definir o próximo passo →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!projects.length && (
        <div className="rounded-xl border">
          <Empty>
            Sem projetos nesta seleção. Regista um projeto interno ou associa o
            trabalho a um cliente.
          </Empty>
        </div>
      )}
    </section>
  );
}
function ClientList({ clients, data }: { clients: Client[]; data: Snapshot }) {
  return (
    <section className="rounded-xl border bg-card">
      <h2 className="border-b p-5 text-sm font-semibold">
        Clientes · {clients.length}
      </h2>
      {clients.map((c) => (
        <Link
          key={c.id}
          className="flex items-center gap-4 border-b p-5 last:border-b-0 hover:bg-accent"
          href={`/clients/${c.id}`}
        >
          <FolderKanban className="h-5 w-5 text-info" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium">{c.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {
                data.projects.filter(
                  (p) => p.business_id === c.id && p.status !== "done",
                ).length
              }{" "}
              projetos ativos
            </p>
          </div>
          <ArrowRight className="h-4 w-4" />
        </Link>
      ))}
      {!clients.length && (
        <Empty>
          Sem clientes nesta seleção. Usa Novo cliente para registar uma
          relação.
        </Empty>
      )}
    </section>
  );
}
function NextStep({
  task,
  done,
  onCreate,
}: {
  task?: Task;
  done: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-xl border border-info/30 bg-info/5 p-5">
      <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
        Próxima ação
      </h2>
      {done ? (
        <p className="mt-3">Projeto concluído.</p>
      ) : task ? (
        <Link
          className="mt-3 block text-lg font-medium hover:text-info"
          href={`/tasks/${task.id}`}
        >
          {task.title} →
        </Link>
      ) : (
        <>
          <p className="mt-3 text-sm">
            Falta uma tarefa que possa avançar. Define o próximo passo ou revê o
            trabalho pendente.
          </p>
          <Button variant="outline" className="mt-4" onClick={onCreate}>
            Definir uma tarefa
          </Button>
        </>
      )}
    </section>
  );
}
function History({
  data,
  kind,
  id,
  relatedTaskIds = [],
}: {
  data: Snapshot;
  kind?: string;
  id?: string;
  relatedTaskIds?: string[];
}) {
  const items = data.activity
    .filter(
      (a) =>
        !id ||
        (a.entity_type === kind && a.entity_id === id) ||
        (a.entity_type === "tasks" && relatedTaskIds.includes(a.entity_id)),
    )
    .slice(0, 6);
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-sm font-semibold">Atividade recente</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Últimos registos disponíveis
      </p>
      {items.map((a) => (
        <div className="mt-4 border-t pt-4" key={a.id}>
          {(a.entity_type === "tasks" ? data.tasks : a.entity_type === "projects" ? data.projects : data.clients).some(record => record.id === a.entity_id) ? <Link
            href={`/${a.entity_type === "businesses" ? "clients" : a.entity_type}/${a.entity_id}`}
            className="text-xs font-medium hover:text-info"
          >
            {a.title}
          </Link> : <span className="text-xs font-medium">{a.title}</span>}
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {a.action === "created" ? "Criado" : a.action === "deleted" ? "Apagado" : "Atualizado"} por{" "}
            {memberName(data, a.actor_id)} ·{" "}
            {new Intl.DateTimeFormat("pt-PT", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Lisbon",
            }).format(new Date(a.created_at))}
          </p>
        </div>
      ))}
      {!items.length && (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Sem alterações neste conjunto de registos recentes.
        </p>
      )}
    </section>
  );
}
