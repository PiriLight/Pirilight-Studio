import { describe, expect, it } from "vitest";

import { businessInputSchema, contactInputSchema, dealInputSchema } from "./crm";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const BUSINESS_ID = "22222222-2222-4222-8222-222222222222";

describe("CRM input boundaries", () => {
  it("normaliza campos opcionais vazios sem inventar dados", () => {
    expect(businessInputSchema.parse({ name: "  Empresa  ", industry: "", location: "", notes: "" })).toEqual({
      name: "Empresa",
      industry: null,
      location: null,
      notes: null,
    });
  });

  it("aceita o novo stage meeting e valores monetários reais", () => {
    const parsed = dealInputSchema.parse({
      businessId: BUSINESS_ID,
      contactId: null,
      title: "Reunião comercial",
      leadSource: "Referência",
      interestedService: "Website",
      estimatedValue: 1250.5,
      responsibleUserId: OWNER_ID,
      stage: "meeting",
      nextAction: "Enviar proposta",
      nextActionDate: "2026-09-10",
      expectedCloseDate: null,
      notes: "",
    });

    expect(parsed.stage).toBe("meeting");
    expect(parsed.notes).toBeNull();
  });

  it("rejeita email inválido no contacto", () => {
    const result = contactInputSchema.safeParse({
      businessId: BUSINESS_ID,
      name: "Contacto",
      role: "",
      email: "email-invalido",
      phone: "",
      isPrimary: false,
    });

    expect(result.success).toBe(false);
  });
});
