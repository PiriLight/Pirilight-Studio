import { z } from "zod";

import { auditFields, entityId } from "./common";

export const contactSchema = z.strictObject({
  id: entityId,
  businessId: entityId,
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
  ...auditFields,
});

export type Contact = z.infer<typeof contactSchema>;
