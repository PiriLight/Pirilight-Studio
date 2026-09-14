import { z } from "zod";

import { auditFields, entityId } from "./common";

export const MATERIAL_CATEGORIES = [
  "sales_material",
  "onboarding",
  "brand",
  "idea_backlog",
] as const;
export const materialCategorySchema = z.enum(MATERIAL_CATEGORIES);
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_STATUSES = ["idea", "in_progress", "done", "published"] as const;
export const materialStatusSchema = z.enum(MATERIAL_STATUSES);
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];

export const PRODUCT_LINES = ["pirilight", "piricard", "both"] as const;
export const productLineSchema = z.enum(PRODUCT_LINES);
export type ProductLine = (typeof PRODUCT_LINES)[number];

/**
 * Phase 1B. É aqui que o vídeo profissional do PiriCard vive: uma linha com
 * `category: 'idea_backlog'` e `status: 'idea'`. Nada mais.
 */
export const materialAssetSchema = z.strictObject({
  id: entityId,
  title: z.string().min(1),
  description: z.string().min(1),
  category: materialCategorySchema,
  status: materialStatusSchema,
  productLine: productLineSchema,
  tags: z.array(z.string().min(1)),
  ...auditFields,
});

export type MaterialAsset = z.infer<typeof materialAssetSchema>;
