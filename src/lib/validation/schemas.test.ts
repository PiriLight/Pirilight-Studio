import { describe, expect, it } from "vitest";

import { businessSchema } from "./business";
import { paymentSchema } from "./payment";
import { projectSchema } from "./project";
import { taskSchema } from "./task";

const audit = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validBusiness = {
  id: "biz-1",
  name: "Negócio",
  industry: "Testes",
  lifecycleStatus: "lead",
  primaryContactId: null,
  location: "Leiria",
  notes: null,
  ...audit,
};

const validTask = {
  id: "task-1",
  title: "Tarefa",
  status: "todo",
  waitingReason: null,
  priority: "normal",
  dueDate: "2026-03-29",
  assigneeId: "sny",
  relatedEntityType: null,
  relatedEntityId: null,
  ...audit,
};

const validProject = {
  id: "proj-1",
  businessId: "biz-1",
  dealId: null,
  type: "website",
  name: "Projeto",
  status: "in_progress",
  waitingReason: null,
  startDate: "2026-01-10",
  launchDate: null,
  ...audit,
};

const validPayment = {
  id: "pay-1",
  businessId: "biz-1",
  projectId: null,
  totalValue: 400,
  amountReceived: 200,
  paymentStatus: "partial",
  expectedDate: "2026-03-29",
  ...audit,
};

describe("business", () => {
  it("aceita um registo válido", () => {
    expect(businessSchema.safeParse(validBusiness).success).toBe(true);
  });

  it("rejeita um lifecycleStatus inválido", () => {
    expect(
      businessSchema.safeParse({ ...validBusiness, lifecycleStatus: "customer" }).success,
    ).toBe(false);
  });

  it("rejeita campos a mais (typos em fixtures escritas à mão)", () => {
    expect(businessSchema.safeParse({ ...validBusiness, lifecycle: "lead" }).success).toBe(false);
  });
});

describe("invariante do waitingReason", () => {
  it("rejeita waitingReason sem o estado waiting_on_client", () => {
    expect(taskSchema.safeParse({ ...validTask, waitingReason: "photos" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...validProject, waitingReason: "photos" }).success).toBe(
      false,
    );
  });

  it("rejeita waiting_on_client sem motivo", () => {
    expect(
      taskSchema.safeParse({ ...validTask, status: "waiting_on_client", waitingReason: null })
        .success,
    ).toBe(false);
  });

  it("aceita o par correto", () => {
    expect(
      taskSchema.safeParse({
        ...validTask,
        status: "waiting_on_client",
        waitingReason: "photos",
      }).success,
    ).toBe(true);
  });
});

describe("datas", () => {
  it("rejeita datas mal formadas", () => {
    expect(taskSchema.safeParse({ ...validTask, dueDate: "29-03-2026" }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, dueDate: "2026-3-9" }).success).toBe(false);
  });

  it("rejeita um launchDate anterior ao startDate", () => {
    expect(
      projectSchema.safeParse({ ...validProject, launchDate: "2026-01-01" }).success,
    ).toBe(false);
  });
});

describe("par polimórfico da Task", () => {
  it("exige que tipo e id existam em conjunto", () => {
    expect(
      taskSchema.safeParse({ ...validTask, relatedEntityType: "project", relatedEntityId: null })
        .success,
    ).toBe(false);
    expect(
      taskSchema.safeParse({ ...validTask, relatedEntityType: null, relatedEntityId: "proj-1" })
        .success,
    ).toBe(false);
  });
});

describe("pagamentos", () => {
  it("rejeita receber mais do que o total", () => {
    expect(
      paymentSchema.safeParse({ ...validPayment, amountReceived: 500 }).success,
    ).toBe(false);
  });

  it("rejeita um estado incoerente com os montantes", () => {
    expect(paymentSchema.safeParse({ ...validPayment, paymentStatus: "paid" }).success).toBe(false);
    expect(
      paymentSchema.safeParse({ ...validPayment, paymentStatus: "not_started" }).success,
    ).toBe(false);
  });

  it("não aceita 'overdue' como estado guardado — é sempre derivado", () => {
    expect(
      paymentSchema.safeParse({ ...validPayment, paymentStatus: "overdue" }).success,
    ).toBe(false);
  });
});
