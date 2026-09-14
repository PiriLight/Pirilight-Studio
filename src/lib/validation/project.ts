import { z } from "zod";

import { auditFields, entityId, isoDate } from "./common";
import {
  WAITING_REASON_INVARIANT_MESSAGE,
  hasValidWaitingReason,
  waitingReasonSchema,
  workStatusSchema,
} from "./work-status";

/**
 * `Project` é a espinha partilhada pelas duas linhas de produto.
 *
 * Website e PiriCard **não** são entidades paralelas: são linhas de detalhe 1:1
 * ligadas por `projectId`, com apenas os campos específicos de cada produto.
 * Tudo o que é transversal — cliente, estado, tarefas, renovações, pedidos,
 * pagamentos — aponta para `projectId` e é escrito uma só vez.
 */
export const PROJECT_TYPES = ["website", "piricard"] as const;
export const projectTypeSchema = z.enum(PROJECT_TYPES);
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const projectSchema = z
  .strictObject({
    id: entityId,
    businessId: entityId,
    /** Deal de origem, quando existe. `null` = cliente direto, sem histórico de CRM. */
    dealId: entityId.nullable(),
    type: projectTypeSchema,
    name: z.string().min(1),
    status: workStatusSchema,
    waitingReason: waitingReasonSchema.nullable(),
    startDate: isoDate,
    launchDate: isoDate.nullable(),
    ...auditFields,
  })
  .refine(hasValidWaitingReason, { message: WAITING_REASON_INVARIANT_MESSAGE })
  .refine((p) => p.launchDate === null || p.launchDate >= p.startDate, {
    message: "launchDate não pode ser anterior a startDate",
  });

export type Project = z.infer<typeof projectSchema>;

/** Detalhe 1:1 de um Project com `type: 'website'`. */
export const websiteSchema = z.strictObject({
  projectId: entityId,
  domain: z.string().min(1),
  hostingProvider: z.string().min(1),
  cmsType: z.string().min(1),
  stagingUrl: z.string().nullable(),
});

export type Website = z.infer<typeof websiteSchema>;

export const CARD_TYPES = ["physical", "digital", "hybrid"] as const;
export const cardTypeSchema = z.enum(CARD_TYPES);
export type CardType = (typeof CARD_TYPES)[number];

export const DESIGN_STATUSES = ["not_started", "in_design", "approved"] as const;
export const designStatusSchema = z.enum(DESIGN_STATUSES);
export type DesignStatus = (typeof DESIGN_STATUSES)[number];

export const SHIPPING_STATUSES = [
  "not_shipped",
  "in_production",
  "shipped",
  "delivered",
] as const;
export const shippingStatusSchema = z.enum(SHIPPING_STATUSES);
export type ShippingStatus = (typeof SHIPPING_STATUSES)[number];

/** Detalhe 1:1 de um Project com `type: 'piricard'`. */
export const piriCardSchema = z.strictObject({
  projectId: entityId,
  cardType: cardTypeSchema,
  designStatus: designStatusSchema,
  shippingStatus: shippingStatusSchema,
  quantity: z.number().int().positive(),
});

export type PiriCard = z.infer<typeof piriCardSchema>;
