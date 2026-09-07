import { describe, expect, it } from "vitest";

import { goalInputSchema, taskInputSchema } from "./work-management";

describe("work management validation", () => {
  it("rejeita prazo de objetivo anterior ao início", () => {
    const result = goalInputSchema.safeParse({ name: "Meta", description: "", category: "commercial", status: "active", priority: "normal", responsibleUserId: null, startDate: "2026-09-10", deadline: "2026-09-09", metric: "Leads", currentValue: 0, targetValue: 10, taskIds: [] });
    expect(result.success).toBe(false);
  });
  it("rejeita duas relações canónicas e waiting incoerente", () => {
    const result = taskInputSchema.safeParse({ title: "Tarefa", description: "", status: "todo", waitingReason: "content", priority: "normal", dueDate: null, responsibleUserId: "11111111-1111-1111-1111-111111111111", businessId: "22222222-2222-2222-2222-222222222222", projectId: "33333333-3333-3333-3333-333333333333", dealId: null, goalIds: [] });
    expect(result.success).toBe(false);
  });
});
