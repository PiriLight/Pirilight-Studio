import type {
  BusinessOverallStatus,
  CardType,
  DealStage,
  DesignStatus,
  GoalStatus,
  GoalTimeframe,
  LifecycleStatus,
  PaymentStatus,
  Priority,
  ProjectType,
  RenewalCadence,
  RenewalStatus,
  RenewalType,
  ShippingStatus,
  Urgency,
  WaitingReason,
  WorkStatus,
} from "@/types";

/**
 * Traduções PT-PT de todos os valores internos.
 *
 * O código fica em inglês (alinhado com a futura base de dados); a interface
 * fala português. Este é o único sítio onde essa fronteira existe — nenhum
 * componente escreve o seu próprio texto de estado.
 *
 * `satisfies Record<T, string>` faz o TypeScript exigir exaustividade: acrescentar
 * um estado novo parte o build aqui, em vez de aparecer um enum cru na UI.
 *
 * (Criados neste round, ainda não consumidos pela UI — a interface do Round 1
 * mantém-se exatamente como está.)
 */

export const WORK_STATUS_LABELS = {
  todo: "Por fazer",
  in_progress: "Em progresso",
  waiting_on_client: "À espera do cliente",
  blocked: "Bloqueado",
  done: "Concluído",
} satisfies Record<WorkStatus, string>;

export const WAITING_REASON_LABELS = {
  content: "Conteúdo",
  photos: "Fotografias",
  approval: "Aprovação",
  payment: "Pagamento",
  access_login: "Acesso/Login",
  response: "Resposta",
  other: "Outro",
} satisfies Record<WaitingReason, string>;

export const LIFECYCLE_STATUS_LABELS = {
  prospect: "Prospect",
  lead: "Lead",
  interested: "Interessado",
  client: "Cliente",
  inactive: "Inativo",
} satisfies Record<LifecycleStatus, string>;

export const DEAL_STAGE_LABELS = {
  new: "Novo",
  contacted: "Contacto obtido",
  proposal_sent: "Proposta enviada",
  negotiating: "Em negociação",
  won: "Ganho",
  lost: "Perdido",
} satisfies Record<DealStage, string>;

export const PROJECT_TYPE_LABELS = {
  website: "Website",
  piricard: "PiriCard",
} satisfies Record<ProjectType, string>;

export const RENEWAL_TYPE_LABELS = {
  domain: "Domínio",
  // Round 7.1: só o label muda — o valor interno do enum continua "hosting".
  hosting: "Alojamento",
  card_subscription: "Subscrição PiriCard",
  maintenance_plan: "Plano de manutenção",
} satisfies Record<RenewalType, string>;

export const PAYMENT_STATUS_LABELS = {
  not_started: "Por receber",
  partial: "Parcial",
  paid: "Pago",
  overdue: "Em atraso",
} satisfies Record<PaymentStatus, string>;

export const PRIORITY_LABELS = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
} satisfies Record<Priority, string>;

/** `BusinessOverallStatus` reaproveita o vocabulário do WorkStatus + "none". */
/**
 * `done` e `none` propositadamente com o mesmo label: ao nível do Business,
 * "todos os projetos entregues" e "ainda sem projetos" significam a mesma
 * coisa — não há trabalho ativo agora. "Concluído" fica reservado para
 * Project/Task (`WORK_STATUS_LABELS.done`) — aqui leria-se como "já não é
 * cliente", que é exatamente o que isto não quer dizer.
 */
export const BUSINESS_OVERALL_STATUS_LABELS = {
  blocked: WORK_STATUS_LABELS.blocked,
  waiting_on_client: WORK_STATUS_LABELS.waiting_on_client,
  in_progress: WORK_STATUS_LABELS.in_progress,
  done: "Sem trabalho ativo",
  none: "Sem trabalho ativo",
} satisfies Record<BusinessOverallStatus, string>;

/** Round 5 — Websites/PiriCards. Só os valores reais do schema (`lib/validation/project.ts`). */
export const CARD_TYPE_LABELS = {
  physical: "Físico",
  digital: "Digital",
  hybrid: "Híbrido",
} satisfies Record<CardType, string>;

export const DESIGN_STATUS_LABELS = {
  not_started: "Por iniciar",
  in_design: "Em design",
  approved: "Aprovado",
} satisfies Record<DesignStatus, string>;

export const SHIPPING_STATUS_LABELS = {
  not_shipped: "Por preparar",
  in_production: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
} satisfies Record<ShippingStatus, string>;

/** Estado guardado do Renewal (`lib/validation/renewal.ts`) — não inclui `overdue`, que é derivado. */
export const RENEWAL_STATUS_LABELS = {
  pending: "Pendente",
  renewed: "Renovada",
  cancelled: "Cancelada",
} satisfies Record<RenewalStatus, string>;

/** Round 6 — cadência de uma Renewal (`lib/validation/renewal.ts`). */
export const RENEWAL_CADENCE_LABELS = {
  monthly: "Mensal",
  annual: "Anual",
  biennial: "Bienal",
} satisfies Record<RenewalCadence, string>;

/** Round 8 — período de um Goal (`lib/validation/goal.ts`). Só os 2 valores reais do schema. */
export const GOAL_TIMEFRAME_LABELS = {
  quarter: "Trimestre",
  year: "Ano",
} satisfies Record<GoalTimeframe, string>;

/** Round 8 — estado derivado de um Goal (`goal-board.ts#deriveGoalStatus`), nunca guardado. */
export const GOAL_STATUS_LABELS = {
  in_progress: "Em curso",
  done: "Concluído",
} satisfies Record<GoalStatus, string>;

export const URGENCY_LABELS = {
  overdue: "Atrasado",
  due_today: "Hoje",
  due_soon: "Em breve",
  stalled: "Parado",
} satisfies Record<Urgency, string>;

export function workStatusLabel(status: WorkStatus): string {
  return WORK_STATUS_LABELS[status];
}

export function waitingReasonLabel(reason: WaitingReason): string {
  return WAITING_REASON_LABELS[reason];
}

export function lifecycleStatusLabel(status: LifecycleStatus): string {
  return LIFECYCLE_STATUS_LABELS[status];
}

export function dealStageLabel(stage: DealStage): string {
  return DEAL_STAGE_LABELS[stage];
}

export function renewalTypeLabel(type: RenewalType): string {
  return RENEWAL_TYPE_LABELS[type];
}

export function urgencyLabel(urgency: Urgency): string {
  return URGENCY_LABELS[urgency];
}

export function businessOverallStatusLabel(status: BusinessOverallStatus): string {
  return BUSINESS_OVERALL_STATUS_LABELS[status];
}

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

export function projectTypeLabel(type: ProjectType): string {
  return PROJECT_TYPE_LABELS[type];
}

export function cardTypeLabel(type: CardType): string {
  return CARD_TYPE_LABELS[type];
}

export function designStatusLabel(status: DesignStatus): string {
  return DESIGN_STATUS_LABELS[status];
}

export function shippingStatusLabel(status: ShippingStatus): string {
  return SHIPPING_STATUS_LABELS[status];
}

export function renewalStatusLabel(status: RenewalStatus): string {
  return RENEWAL_STATUS_LABELS[status];
}

export function renewalCadenceLabel(cadence: RenewalCadence): string {
  return RENEWAL_CADENCE_LABELS[cadence];
}

export function goalTimeframeLabel(timeframe: GoalTimeframe): string {
  return GOAL_TIMEFRAME_LABELS[timeframe];
}

export function goalStatusLabel(status: GoalStatus): string {
  return GOAL_STATUS_LABELS[status];
}
