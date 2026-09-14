import { describe, expect, it } from "vitest";

import { businessSchema } from "@/lib/validation/business";
import { contactSchema } from "@/lib/validation/contact";
import { dealSchema } from "@/lib/validation/deal";
import { goalSchema } from "@/lib/validation/goal";
import { maintenanceRequestSchema } from "@/lib/validation/maintenance-request";
import { materialAssetSchema } from "@/lib/validation/material-asset";
import { paymentSchema } from "@/lib/validation/payment";
import { piriCardSchema, projectSchema, websiteSchema } from "@/lib/validation/project";
import { renewalSchema } from "@/lib/validation/renewal";
import { taskSchema } from "@/lib/validation/task";
import { userSchema } from "@/lib/validation/user";
import { diffCalendarDays, todayIso } from "@/lib/utils/date";
import { getRemainingValue } from "@/lib/utils/payment";

import { buildMockData, TEST_TODAY } from "./index";

/**
 * A mock data é escrita à mão — é por isso que a integridade tem de ser
 * verificada por um teste, e não por leitura atenta. Este ficheiro é a rede
 * que apanha o FK partido, o detalhe órfão e o cenário que alguém apagou sem
 * dar por isso.
 *
 * Ancorado em `TEST_TODAY`: não depende da data da máquina.
 */
const data = buildMockData(TEST_TODAY);
const today = todayIso(TEST_TODAY);

const ids = <T extends { id: string }>(rows: readonly T[]) => new Set(rows.map((r) => r.id));

const businessIds = ids(data.businesses);
const contactIds = ids(data.contacts);
const dealIds = ids(data.deals);
const projectIds = ids(data.projects);
const taskIds = ids(data.tasks);
const userIds = ids(data.users);
const maintenanceIds = ids(data.maintenanceRequests);

describe("todas as fixtures respeitam o seu schema", () => {
  const cases = [
    ["users", data.users, userSchema],
    ["businesses", data.businesses, businessSchema],
    ["contacts", data.contacts, contactSchema],
    ["deals", data.deals, dealSchema],
    ["projects", data.projects, projectSchema],
    ["websites", data.websites, websiteSchema],
    ["piriCards", data.piriCards, piriCardSchema],
    ["tasks", data.tasks, taskSchema],
    ["renewals", data.renewals, renewalSchema],
    ["payments", data.payments, paymentSchema],
    ["maintenanceRequests", data.maintenanceRequests, maintenanceRequestSchema],
    ["goals", data.goals, goalSchema],
    ["materialAssets", data.materialAssets, materialAssetSchema],
  ] as const;

  for (const [name, rows, schema] of cases) {
    it(`${name} (${rows.length} registos)`, () => {
      for (const row of rows) {
        const result = schema.safeParse(row);
        if (!result.success) {
          throw new Error(
            `${name}: registo inválido\n${JSON.stringify(row, null, 2)}\n${result.error.message}`,
          );
        }
      }
    });
  }
});

describe("ids únicos", () => {
  it("não há ids repetidos em nenhuma coleção", () => {
    expect(businessIds.size).toBe(data.businesses.length);
    expect(contactIds.size).toBe(data.contacts.length);
    expect(dealIds.size).toBe(data.deals.length);
    expect(projectIds.size).toBe(data.projects.length);
    expect(taskIds.size).toBe(data.tasks.length);
    expect(ids(data.renewals).size).toBe(data.renewals.length);
    expect(ids(data.payments).size).toBe(data.payments.length);
    expect(maintenanceIds.size).toBe(data.maintenanceRequests.length);
  });
});

describe("integridade referencial", () => {
  it("todos os contactos apontam para um negócio existente", () => {
    for (const contact of data.contacts) {
      expect(businessIds.has(contact.businessId)).toBe(true);
    }
  });

  it("o contacto principal de cada negócio existe e pertence a esse negócio", () => {
    for (const business of data.businesses) {
      if (business.primaryContactId === null) continue;

      const contact = data.contacts.find((c) => c.id === business.primaryContactId);
      expect(contact, `contacto principal em falta: ${business.id}`).toBeDefined();
      expect(contact?.businessId).toBe(business.id);
    }
  });

  it("todos os deals apontam para negócio e responsável existentes", () => {
    for (const deal of data.deals) {
      expect(businessIds.has(deal.businessId)).toBe(true);
      expect(userIds.has(deal.responsibleUserId)).toBe(true);
    }
  });

  it("todos os projetos apontam para negócio existente e, quando há, para um deal existente", () => {
    for (const project of data.projects) {
      expect(businessIds.has(project.businessId)).toBe(true);
      if (project.dealId !== null) {
        expect(dealIds.has(project.dealId)).toBe(true);
      }
    }
  });

  it("cada projeto tem exatamente uma linha de detalhe, do tipo certo", () => {
    for (const project of data.projects) {
      const website = data.websites.filter((w) => w.projectId === project.id);
      const card = data.piriCards.filter((c) => c.projectId === project.id);

      if (project.type === "website") {
        expect(website, `website em falta: ${project.id}`).toHaveLength(1);
        expect(card).toHaveLength(0);
      } else {
        expect(card, `piricard em falta: ${project.id}`).toHaveLength(1);
        expect(website).toHaveLength(0);
      }
    }
  });

  it("não há linhas de detalhe órfãs", () => {
    for (const website of data.websites) {
      expect(projectIds.has(website.projectId)).toBe(true);
    }
    for (const card of data.piriCards) {
      expect(projectIds.has(card.projectId)).toBe(true);
    }
  });

  it("todas as tarefas têm responsável existente e link polimórfico resolúvel", () => {
    const collections = {
      business: businessIds,
      project: projectIds,
      deal: dealIds,
      maintenance_request: maintenanceIds,
      goal: ids(data.goals),
    } as const;

    for (const task of data.tasks) {
      expect(userIds.has(task.assigneeId)).toBe(true);

      if (task.relatedEntityType === null || task.relatedEntityId === null) continue;
      expect(
        collections[task.relatedEntityType].has(task.relatedEntityId),
        `task ${task.id} aponta para ${task.relatedEntityType} inexistente`,
      ).toBe(true);
    }
  });

  it("todas as renovações apontam para um projeto existente", () => {
    for (const renewal of data.renewals) {
      expect(projectIds.has(renewal.projectId)).toBe(true);
    }
  });

  it("todos os pagamentos apontam para negócio existente e projeto coerente", () => {
    for (const payment of data.payments) {
      expect(businessIds.has(payment.businessId)).toBe(true);
      if (payment.projectId === null) continue;

      const project = data.projects.find((p) => p.id === payment.projectId);
      expect(project, `projeto em falta: ${payment.id}`).toBeDefined();
      expect(project?.businessId).toBe(payment.businessId);
    }
  });

  it("os pedidos de manutenção são coerentes entre projeto e negócio", () => {
    for (const request of data.maintenanceRequests) {
      const project = data.projects.find((p) => p.id === request.projectId);
      expect(project).toBeDefined();
      expect(project?.businessId).toBe(request.businessId);
    }
  });

  it("os goals apontam para responsáveis e tarefas existentes", () => {
    for (const goal of data.goals) {
      if (goal.ownerId !== null) expect(userIds.has(goal.ownerId)).toBe(true);
      for (const taskId of goal.linkedTaskIds) {
        expect(taskIds.has(taskId)).toBe(true);
      }
    }
  });
});

describe("os 15 cenários pedidos estão todos representados", () => {
  const scenarios: Array<[string, () => boolean]> = [
    [
      "1. lead novo",
      () =>
        data.businesses.some((b) => b.lifecycleStatus === "prospect") &&
        data.deals.some((d) => d.stage === "new"),
    ],
    [
      "2. negócio já visitado",
      () =>
        data.deals.some(
          (d) => d.stage === "contacted" && diffCalendarDays(d.lastInteractionDate, today) < 0,
        ),
    ],
    [
      "3. follow-up para hoje",
      () =>
        data.deals.some(
          (d) => d.nextActionDate !== null && diffCalendarDays(d.nextActionDate, today) === 0,
        ),
    ],
    [
      "4. follow-up atrasado",
      () =>
        data.deals.some(
          (d) =>
            d.nextActionDate !== null &&
            diffCalendarDays(d.nextActionDate, today) < 0 &&
            d.stage !== "won" &&
            d.stage !== "lost",
        ),
    ],
    ["5. cliente ativo", () => data.businesses.some((b) => b.lifecycleStatus === "client")],
    [
      "6. website em desenvolvimento",
      () => data.projects.some((p) => p.type === "website" && p.status === "in_progress"),
    ],
    [
      "7. PiriCard em produção",
      () =>
        data.projects.some((p) => p.type === "piricard" && p.status === "in_progress") &&
        data.piriCards.some((c) => c.shippingStatus === "in_production"),
    ],
    [
      "8. projeto à espera de fotografias",
      () =>
        data.projects.some(
          (p) => p.status === "waiting_on_client" && p.waitingReason === "photos",
        ),
    ],
    [
      "9. projeto à espera de aprovação",
      () =>
        data.projects.some(
          (p) => p.status === "waiting_on_client" && p.waitingReason === "approval",
        ),
    ],
    ["10. projeto bloqueado", () => data.projects.some((p) => p.status === "blocked")],
    [
      "11. pagamento parcial",
      () =>
        data.payments.some(
          (p) => p.paymentStatus === "partial" && getRemainingValue(p) > 0,
        ),
    ],
    [
      "12. pagamento em atraso",
      () =>
        data.payments.some(
          (p) =>
            p.paymentStatus !== "paid" &&
            getRemainingValue(p) > 0 &&
            diffCalendarDays(p.expectedDate, today) < 0,
        ),
    ],
    [
      "13. renovação amanhã",
      () =>
        data.renewals.some(
          (r) => r.status === "pending" && diffCalendarDays(r.dueDate, today) === 1,
        ),
    ],
    [
      "14. renovação dentro de 30–60 dias",
      () =>
        data.renewals.some((r) => {
          const diff = diffCalendarDays(r.dueDate, today);
          return r.status === "pending" && diff >= 30 && diff <= 60;
        }),
    ],
    [
      "15. projeto concluído",
      () => data.projects.some((p) => p.status === "done" && p.launchDate !== null),
    ],
  ];

  for (const [name, predicate] of scenarios) {
    it(name, () => {
      expect(predicate()).toBe(true);
    });
  }
});

describe("casos limite que a UI vai encontrar", () => {
  it("existe um negócio sem deals, sem projetos e sem pagamentos", () => {
    const empty = data.businesses.filter(
      (b) =>
        !data.deals.some((d) => d.businessId === b.id) &&
        !data.projects.some((p) => p.businessId === b.id) &&
        !data.payments.some((p) => p.businessId === b.id),
    );
    expect(empty.length).toBeGreaterThan(0);
  });

  it("existe um negócio inativo e um deal perdido", () => {
    expect(data.businesses.some((b) => b.lifecycleStatus === "inactive")).toBe(true);
    expect(data.deals.some((d) => d.stage === "lost")).toBe(true);
  });

  it("existe um projeto sem deal de origem e um pagamento sem projeto", () => {
    expect(data.projects.some((p) => p.dealId === null)).toBe(true);
    expect(data.payments.some((p) => p.projectId === null)).toBe(true);
  });

  it("existe uma tarefa concluída com data passada (nunca pode contar como atrasada)", () => {
    expect(
      data.tasks.some(
        (t) => t.status === "done" && t.dueDate !== null && diffCalendarDays(t.dueDate, today) < 0,
      ),
    ).toBe(true);
  });

  it("existe uma tarefa de backlog sem data", () => {
    expect(data.tasks.some((t) => t.dueDate === null)).toBe(true);
  });

  it("há tarefas atribuídas ao Sny e ao Bino", () => {
    expect(data.tasks.some((t) => t.assigneeId === "sny")).toBe(true);
    expect(data.tasks.some((t) => t.assigneeId === "bino")).toBe(true);
  });

  it("os utilizadores são exatamente o Sny e o Bino", () => {
    expect(data.users.map((u) => u.id).sort()).toEqual(["bino", "sny"]);
  });

  it("o vídeo do PiriCard está registado como ideia em backlog", () => {
    expect(
      data.materialAssets.some(
        (m) => m.category === "idea_backlog" && m.status === "idea" && m.productLine === "piricard",
      ),
    ).toBe(true);
  });
});

describe("privacidade da mock data", () => {
  it("todos os emails são de domínios de exemplo", () => {
    for (const contact of data.contacts) {
      expect(contact.email.endsWith(".example.pt")).toBe(true);
    }
  });

  it("todos os telefones estão no bloco fictício +351 900 000 0XX", () => {
    for (const contact of data.contacts) {
      expect(contact.phone.startsWith("+351 900 000 0")).toBe(true);
    }
  });
});
