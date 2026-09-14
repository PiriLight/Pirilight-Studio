import { z } from "zod";

import { auditFields, entityId } from "./common";

/**
 * `Business` é a **fonte única de verdade** de qualquer relação comercial.
 *
 * Não existem entidades `Lead` e `Client` separadas: o mesmo registo atravessa
 * o ciclo de vida do primeiro contacto até cliente (ou até inativo), e as
 * áreas Comercial e Clientes são apenas duas vistas filtradas destas linhas.
 */
export const LIFECYCLE_STATUSES = [
  "prospect",
  "lead",
  "interested",
  "client",
  "inactive",
] as const;

export const lifecycleStatusSchema = z.enum(LIFECYCLE_STATUSES);
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

/** Estados mostrados na área Comercial (ainda não são clientes). */
export const COMMERCIAL_LIFECYCLE_STATUSES: readonly LifecycleStatus[] = [
  "prospect",
  "lead",
  "interested",
];

export const businessSchema = z.strictObject({
  id: entityId,
  name: z.string().min(1),
  industry: z.string().min(1),
  lifecycleStatus: lifecycleStatusSchema,
  /** Contacto principal deste negócio. Aponta para um Contact do próprio Business. */
  primaryContactId: entityId.nullable(),
  location: z.string().min(1),
  notes: z.string().nullable(),
  ...auditFields,
});

export type Business = z.infer<typeof businessSchema>;
