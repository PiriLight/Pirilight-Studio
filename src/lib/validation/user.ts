import { z } from "zod";

import { auditFields, entityId } from "./common";

/**
 * Modelado como a futura tabela `profiles` do Supabase — deliberadamente
 * separada de `auth.users`, para que a autenticação real seja aditiva e não
 * uma remodelação.
 *
 * São exatamente duas pessoas, com ids estáveis: `sny` e `bino`.
 */
export const userSchema = z.strictObject({
  id: entityId,
  name: z.string().min(1),
  initials: z.string().min(1).max(3),
  accentColor: z.string().min(1),
  ...auditFields,
});

export type User = z.infer<typeof userSchema>;
