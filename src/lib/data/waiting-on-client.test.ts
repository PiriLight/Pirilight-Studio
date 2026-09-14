import { describe, expect, it } from "vitest";

import { buildMockData, TEST_TODAY } from "@/lib/mock";
import { PROJECT_IDS } from "@/lib/mock/projects";
import { TASK_IDS } from "@/lib/mock/tasks";
import type { Business, Project, Task } from "@/types";

import {
  buildAttentionItems,
  buildWaitingOnClientItems,
  type AttentionInput,
} from "./attention-rules";

/**
 * O teste-chave do Round 2.
 *
 * A regra que o Sny e o Bino mais fizeram questão de fixar: um projeto à espera
 * do cliente **não** se transforma em trabalho nosso atrasado pelo simples
 * passar do tempo. Se houver ação nossa, ela existe como Task separada — e é
 * essa Task, não o projeto, que aparece como atrasada.
 *
 * O objetivo é evitar exatamente uma coisa: trabalho bloqueado por terceiros
 * parecer trabalho que nós ainda não fizemos.
 */

const NOW = new Date("2026-03-29T12:00:00Z");

const business: Business = {
  id: "biz-1",
  name: "Boi na Brasa",
  industry: "Restauração",
  lifecycleStatus: "client",
  primaryContactId: null,
  location: "Leiria",
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** Projeto parado à espera de fotografias há muito tempo. */
const waitingProject: Project = {
  id: "proj-1",
  businessId: business.id,
  dealId: null,
  type: "website",
  name: "Website Boi na Brasa",
  status: "waiting_on_client",
  waitingReason: "photos",
  startDate: "2026-01-05",
  launchDate: null,
  createdAt: "2026-01-05T00:00:00.000Z",
  updatedAt: "2026-02-10T00:00:00.000Z",
};

/** A ação nossa sobre esse projeto — já vencida. */
const overdueFollowUpTask: Task = {
  id: "task-1",
  title: "Insistir pelas fotografias",
  status: "todo",
  waitingReason: null,
  priority: "high",
  dueDate: "2026-03-26",
  assigneeId: "sny",
  relatedEntityType: "project",
  relatedEntityId: waitingProject.id,
  createdAt: "2026-02-10T00:00:00.000Z",
  updatedAt: "2026-02-10T00:00:00.000Z",
};

const input: AttentionInput = {
  businesses: [business],
  projects: [waitingProject],
  tasks: [overdueFollowUpTask],
  deals: [],
  renewals: [],
  payments: [],
  maintenanceRequests: [],
};

describe("projeto à espera do cliente + tarefa nossa vencida", () => {
  const items = buildAttentionItems(input, NOW);

  it("o projeto não aparece no feed de atenção", () => {
    expect(items.some((item) => item.sourceId === waitingProject.id)).toBe(false);
  });

  it("nenhum item de atenção é sequer do tipo projeto", () => {
    expect(items.every((item) => item.kind !== ("project" as never))).toBe(true);
  });

  it("a tarefa nossa aparece como atrasada", () => {
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "task",
      sourceId: overdueFollowUpTask.id,
      urgency: "overdue",
      daysDelta: -3,
    });
  });

  it("o projeto aparece no feed separado, com o motivo da espera", () => {
    const waiting = buildWaitingOnClientItems(input);

    expect(waiting).toHaveLength(1);
    expect(waiting[0]).toMatchObject({
      kind: "project",
      sourceId: waitingProject.id,
      waitingReason: "photos",
      businessName: "Boi na Brasa",
    });
  });
});

describe("o mesmo projeto sem tarefa associada", () => {
  it("não produz nenhum item de atenção, por muito tempo que passe", () => {
    const items = buildAttentionItems({ ...input, tasks: [] }, NOW);
    expect(items).toHaveLength(0);
  });
});

describe("tarefa à espera do cliente", () => {
  it("sai do feed de atenção mesmo com data passada, e entra no de espera", () => {
    const waitingTask: Task = {
      ...overdueFollowUpTask,
      id: "task-waiting",
      status: "waiting_on_client",
      waitingReason: "content",
      dueDate: "2026-03-01",
    };

    const attention = buildAttentionItems({ ...input, tasks: [waitingTask] }, NOW);
    expect(attention).toHaveLength(0);

    const waiting = buildWaitingOnClientItems({ ...input, tasks: [waitingTask] });
    expect(waiting.some((item) => item.sourceId === "task-waiting")).toBe(true);
  });
});

describe("a mock data traz este par de propósito", () => {
  it("o Boi na Brasa tem o projeto à espera de fotografias e a tarefa vencida ligada a ele", () => {
    const data = buildMockData(TEST_TODAY);

    const project = data.projects.find((p) => p.id === PROJECT_IDS.boiNaBrasaWeb);
    const task = data.tasks.find((t) => t.id === TASK_IDS.boiNaBrasaChasePhotos);

    expect(project).toMatchObject({ status: "waiting_on_client", waitingReason: "photos" });
    expect(task).toMatchObject({
      status: "todo",
      relatedEntityType: "project",
      relatedEntityId: PROJECT_IDS.boiNaBrasaWeb,
    });

    const items = buildAttentionItems(data, TEST_TODAY);
    expect(items.some((i) => i.sourceId === PROJECT_IDS.boiNaBrasaWeb)).toBe(false);
    expect(
      items.find((i) => i.sourceId === TASK_IDS.boiNaBrasaChasePhotos)?.urgency,
    ).toBe("overdue");
  });
});
