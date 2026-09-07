import { z } from "zod";

import { DEAL_STAGES } from "./deal";

const optionalText = z.string().trim().max(1000).transform((value) => value || null);
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "" || z.email().safeParse(value).success, "Introduz um email válido.")
  .transform((value) => value || null);

export const businessInputSchema = z.object({
  name: z.string().trim().min(1, "Indica o nome do negócio.").max(160),
  industry: optionalText,
  location: optionalText,
  notes: optionalText,
});

export const contactInputSchema = z.object({
  businessId: z.uuid(),
  name: z.string().trim().min(1, "Indica o nome do contacto.").max(160),
  role: optionalText,
  email: optionalEmail,
  phone: optionalText,
  isPrimary: z.boolean().default(false),
});

export const dealInputSchema = z.object({
  businessId: z.uuid(),
  contactId: z.uuid().nullable(),
  title: z.string().trim().min(1, "Indica o título da oportunidade.").max(180),
  leadSource: optionalText,
  interestedService: optionalText,
  estimatedValue: z.number().finite().min(0).max(9999999999.99),
  responsibleUserId: z.uuid(),
  stage: z.enum(DEAL_STAGES),
  nextAction: optionalText,
  nextActionDate: z.iso.date().nullable(),
  expectedCloseDate: z.iso.date().nullable(),
  notes: optionalText,
});

export const quickBusinessDealInputSchema = dealInputSchema.omit({ businessId: true, contactId: true }).extend({
  business: businessInputSchema,
  contact: z
    .object({
      name: z.string().trim().max(160),
      role: optionalText,
      email: optionalEmail,
      phone: optionalText,
    })
    .nullable(),
});

export const idSchema = z.uuid();

export type BusinessInput = z.input<typeof businessInputSchema>;
export type ContactInput = z.input<typeof contactInputSchema>;
export type DealInput = z.input<typeof dealInputSchema>;
export type QuickBusinessDealInput = z.input<typeof quickBusinessDealInputSchema>;
