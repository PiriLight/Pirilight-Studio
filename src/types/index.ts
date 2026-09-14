import type { z } from "zod";

import type { businessSchema } from "@/lib/validation/business";
import type { contactSchema } from "@/lib/validation/contact";
import type { dealSchema } from "@/lib/validation/deal";
import type { goalSchema } from "@/lib/validation/goal";
import type { maintenanceRequestSchema } from "@/lib/validation/maintenance-request";
import type { materialAssetSchema } from "@/lib/validation/material-asset";
import type { paymentSchema } from "@/lib/validation/payment";
import type {
  piriCardSchema,
  projectSchema,
  websiteSchema,
} from "@/lib/validation/project";
import type { renewalSchema } from "@/lib/validation/renewal";
import type { taskSchema } from "@/lib/validation/task";
import type { userSchema } from "@/lib/validation/user";

/**
 * **O único sítio de onde a aplicação importa tipos de entidade.**
 *
 * Tudo aqui usa `import type`, por isso este ficheiro compila para nada: o zod
 * nunca entra no bundle por causa de um tipo, mesmo com `isolatedModules`.
 *
 * É também o ponto de troca para a Supabase: quando os tipos gerados
 * existirem, cada linha passa a
 * `export type Business = Database["public"]["Tables"]["businesses"]["Row"]`
 * e nenhum consumidor precisa de ser tocado.
 */
export type User = z.infer<typeof userSchema>;
export type Business = z.infer<typeof businessSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Website = z.infer<typeof websiteSchema>;
export type PiriCard = z.infer<typeof piriCardSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Renewal = z.infer<typeof renewalSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type MaintenanceRequest = z.infer<typeof maintenanceRequestSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type MaterialAsset = z.infer<typeof materialAssetSchema>;

// Uniões partilhadas (também definidas nos schemas, re-exportadas aqui para a
// aplicação ter um único ponto de importação de tipos).
export type { WorkStatus, WaitingReason } from "@/lib/validation/work-status";
export type { LifecycleStatus } from "@/lib/validation/business";
export type { DealStage } from "@/lib/validation/deal";
export type { ProjectType, CardType, DesignStatus, ShippingStatus } from "@/lib/validation/project";
export type { Priority, TaskRelatedEntityType } from "@/lib/validation/task";
export type { RenewalType, RenewalCadence, RenewalStatus } from "@/lib/validation/renewal";
export type { PaymentStatus, StoredPaymentStatus } from "@/lib/validation/payment";
export type { GoalTimeframe } from "@/lib/validation/goal";
export type {
  MaterialCategory,
  MaterialStatus,
  ProductLine,
} from "@/lib/validation/material-asset";

// Tipos de vista (escritos à mão — não são linhas de tabela).
export type {
  AttentionItem,
  AttentionKind,
  Urgency,
  WaitingOnClientItem,
  PaymentSummary,
  BlockedProjectItem,
  ProjectWithDetail,
  BusinessOverallStatus,
  BusinessSummary,
  BusinessOverview,
  CommercialDealCard,
  RankedUrgency,
  NextAction,
  TaskWithDetail,
  ProjectListRow,
  ProjectOverview,
  RenewalTiming,
  RenewalListRow,
  GoalStatus,
  GoalNextAction,
  MaintenanceListRow,
  MaintenanceTiming,
} from "./views";
