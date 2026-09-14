import { z } from "zod";

/**
 * Primitivos partilhados por todos os schemas.
 *
 * Datas: guardadas sempre como **strings ISO**, nunca como objetos `Date`.
 * - `isoDate` — data de calendário ("2026-01-15"): dueDate, expectedDate, …
 * - `isoTimestamp` — instante completo: createdAt, updatedAt.
 *
 * É a forma que uma linha de base de dados tem, é serializável de Server
 * Component para Client Component sem truques, e mantém as comparações de
 * ordenação simples (string ISO ordena cronologicamente).
 *
 * Regex em vez de `z.iso.date()` de propósito: é estável entre versões do
 * zod e deixa explícito o formato aceite.
 */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data tem de estar no formato YYYY-MM-DD");

export const isoTimestamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/,
    "Timestamp tem de estar em ISO 8601",
  );

/** Identificador de registo. `string` (e não um enum) porque o Supabase usará uuid. */
export const entityId = z.string().min(1);

/** Valor monetário em euros, com no máximo 2 casas decimais. */
export const money = z.number().min(0).multipleOf(0.01);

/** Campos de auditoria presentes em todas as entidades persistidas. */
export const auditFields = {
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
};
