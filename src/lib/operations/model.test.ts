import { describe, expect, it } from "vitest";
import {
  attention,
  nextTask,
  searchTasks,
  taskClient,
  taskInput,
  projectInput,
  type Snapshot,
  type Task,
  type Project,
} from "./model";
const id = "00000000-0000-4000-8000-000000000001";
const audit = {
  id,
  created_at: "2026-09-14T10:00:00Z",
  updated_at: "2026-09-14T10:00:00Z",
};
const task: Task = {
  ...audit,
  title: "Confirmar fotografias",
  status: "todo",
  priority: "normal",
  assignee_id: id,
  due_date: null,
  project_id: null,
  business_id: null,
  notes: "",
  waiting_note: "",
  review_date: null,
};
const project: Project = {
  ...audit,
  name: "Website",
  type: "website",
  status: "in_progress",
  priority: "normal",
  assignee_id: id,
  due_date: null,
  notes: "",
  business_id: id,
};
const data: Snapshot = {
  clients: [{ ...audit, name: "Clínica", notes: "" }],
  projects: [project],
  tasks: [task],
  members: [],
  activity: [],
};
describe("operational attention", () => {
  it("keeps open work on completed projects visible as an explicit alert", () => {
    const alerts = attention(
      {
        ...data,
        projects: [{ ...project, status: "done" }],
        tasks: [{ ...task, project_id: id }],
      },
      "2026-09-14",
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.reasons).toContain(
      "Projeto concluído com trabalho aberto",
    );
  });
  it("never recommends blocked/waiting/done tasks as the next executable action", () => {
    expect(
      nextTask([
        { ...task, status: "blocked" },
        { ...task, status: "waiting_on_client" },
        { ...task, status: "done" },
      ]),
    ).toBeUndefined();
  });
  it("orders by due date then priority, and puts undated work last", () => {
    expect(
      nextTask([
        task,
        { ...task, id: "b", due_date: "2026-09-14", priority: "high" },
        { ...task, id: "c", due_date: "2026-09-13" },
      ])?.id,
    ).toBe("c");
  });
  it("groups reasons on one item and excludes completed work", () => {
    const alerts = attention(
      {
        ...data,
        projects: [],
        tasks: [
          {
            ...task,
            assignee_id: null,
            status: "blocked",
            due_date: "2026-09-13",
            review_date: "2026-09-14",
            waiting_note: "Resposta",
          },
          { ...task, id: "done", status: "done", due_date: "2026-01-01" },
        ],
      },
      "2026-09-14",
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.reasons).toHaveLength(4);
  });
  it("detects projects without an executable next step", () => {
    expect(attention(data, "2026-09-14")[0]!.reasons).toContain(
      "Sem próxima ação executável",
    );
    expect(
      attention(
        { ...data, tasks: [{ ...task, project_id: id }] },
        "2026-09-14",
      ),
    ).toEqual([]);
  });
  it("resolves the client through the project without copying its identity", () => {
    expect(taskClient({ ...task, project_id: id }, data)?.name).toBe("Clínica");
    expect(
      searchTasks({ ...data, tasks: [{ ...task, project_id: id }] }, "clinica"),
    ).toHaveLength(1);
    expect(searchTasks(data, "", "none")).toHaveLength(0);
    expect(searchTasks(data, "", "all", "done")).toHaveLength(0);
  });
});
describe("operational validation", () => {
  it("allows title-only capture with neutral defaults supplied by the form", () => {
    expect(taskInput.safeParse(task).success).toBe(true);
  });
  it("requires a reason and review date when waiting or blocked", () => {
    expect(taskInput.safeParse({ ...task, status: "blocked" }).success).toBe(
      false,
    );
    expect(
      taskInput.safeParse({
        ...task,
        status: "blocked",
        waiting_note: "Acesso em falta",
        review_date: "2026-09-15",
      }).success,
    ).toBe(true);
    expect(
      taskInput.safeParse({
        ...task,
        status: "done",
        review_date: "2026-09-15",
      }).success,
    ).toBe(false);
  });
  it("rejects invalid dates, forged relationships and empty titles", () => {
    expect(
      taskInput.safeParse({ ...task, due_date: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      taskInput.safeParse({ ...task, project_id: id, business_id: id }).success,
    ).toBe(false);
    expect(taskInput.safeParse({ ...task, title: "  " }).success).toBe(false);
  });
  it("distinguishes internal work from client projects", () => {
    expect(
      projectInput.safeParse({
        ...project,
        type: "internal",
        business_id: null,
      }).success,
    ).toBe(true);
    expect(
      projectInput.safeParse({ ...project, business_id: null }).success,
    ).toBe(false);
    expect(
      projectInput.safeParse({ ...project, type: "internal" }).success,
    ).toBe(false);
  });
});
