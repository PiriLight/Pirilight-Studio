"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Handshake,
  PauseCircle,
  RefreshCw,
  Rocket,
  Target,
  Wallet,
} from "lucide-react";

import { FollowUpStatus } from "@/components/domain/follow-up-status";
import { WaitingReasonTag } from "@/components/domain/waiting-reason-tag";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RENEWALS_PANEL_WINDOW_DAYS,
  buildBlockedProjects,
  buildWaitingOnClientItems,
  classifyUrgency,
  dealAttention,
  maintenanceAttention,
  paymentAttention,
  rankAttention,
  renewalAttention,
  taskAttention,
} from "@/lib/data/attention-rules";
import { computeDealFollowUp } from "@/lib/data/business-overview";
import { projectDetailHref } from "@/lib/data/project-overview";
import { renewalTypeLabel, workStatusLabel } from "@/lib/constants/labels";
import { diffCalendarDays } from "@/lib/utils/date";
import { isOpenDealStage } from "@/lib/validation/deal";
import { useGoalStore } from "@/store/use-goal-store";
import { useMaintenanceStore } from "@/store/use-maintenance-store";
import { useProjectStore } from "@/store/use-project-store";
import { useRenewalStore } from "@/store/use-renewal-store";
import { useTaskStore } from "@/store/use-task-store";
import type {
  AttentionItem,
  Business,
  Deal,
  Goal,
  MaintenanceRequest,
  Payment,
  Project,
  Renewal,
  Task,
  User,
} from "@/types";

interface DashboardBoardProps {
  /** Estáticos nesta fase — sem store própria (Deal/Payment só leitura na Phase 1A). */
  businesses: Business[];
  deals: Deal[];
  payments: Payment[];
  users: User[];
  /** Snapshots globais do servidor — só para semear as stores se ainda não estiverem inicializadas. */
  initialTasks: Task[];
  initialProjects: Project[];
  initialRenewals: Renewal[];
  initialGoals: Goal[];
  initialMaintenanceRequests: MaintenanceRequest[];
  today: string;
}

/**
 * O Dashboard real (Round 7) — a mesma estrutura de secções do placeholder
 * (Round 1, plano secção 8), agora com dados a sério. A lógica de urgência
 * continua a viver, sem alterações, em `lib/data/attention-rules.ts`
 * (Round 2) — este componente só a chama com os arrays certos e apresenta o
 * resultado. Live: Task/Project/Renewal/Goal (Round 8) vêm das mesmas stores
 * já usadas em `/tasks`, `/websites`, `/piricards`, `/renewals` e `/goals`,
 * para uma mudança feita em qualquer um desses sítios aparecer aqui de
 * imediato, sem reload — a mesma disciplina do Round 5.1/6 aplicada ao
 * resumo do topo. Business/Deal/Payment continuam só de leitura nesta fase
 * (sem store própria).
 */
export function DashboardBoard({
  businesses,
  deals,
  payments,
  users,
  initialTasks,
  initialProjects,
  initialRenewals,
  initialGoals,
  initialMaintenanceRequests,
  today,
}: DashboardBoardProps) {
  const initializeTasks = useTaskStore((state) => state.initialize);
  const liveTasks = useTaskStore((state) => state.tasks);
  const initializeProjects = useProjectStore((state) => state.initialize);
  const liveProjects = useProjectStore((state) => state.projects);
  const initializeRenewals = useRenewalStore((state) => state.initialize);
  const liveRenewals = useRenewalStore((state) => state.renewals);
  const initializeGoals = useGoalStore((state) => state.initialize);
  const liveGoals = useGoalStore((state) => state.goals);
  const initializeMaintenance = useMaintenanceStore((state) => state.initialize);
  const liveMaintenanceRequests = useMaintenanceStore((state) => state.requests);

  useEffect(() => {
    initializeTasks(initialTasks);
    initializeProjects(initialProjects);
    initializeRenewals(initialRenewals);
    initializeGoals(initialGoals);
    initializeMaintenance(initialMaintenanceRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const businessById = useMemo(() => new Map(businesses.map((b) => [b.id, b])), [businesses]);
  const projectById = useMemo(() => new Map(liveProjects.map((p) => [p.id, p])), [liveProjects]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const attentionItems = useMemo(
    () =>
      rankAttention([
        ...taskAttention(liveTasks, { businesses, projects: liveProjects, deals, maintenanceRequests: liveMaintenanceRequests }, today),
        ...dealAttention(deals, businesses, today),
        ...paymentAttention(payments, businesses, today),
        ...renewalAttention(liveRenewals, { projects: liveProjects, businesses }, today),
        ...maintenanceAttention(liveMaintenanceRequests, businesses, today),
      ]),
    [liveTasks, liveProjects, liveRenewals, businesses, deals, payments, liveMaintenanceRequests, today],
  );

  const blockedProjectsCount = useMemo(
    () => buildBlockedProjects(liveProjects, businesses).length,
    [liveProjects, businesses],
  );

  const waitingOnClientItems = useMemo(
    () =>
      buildWaitingOnClientItems({
        projects: liveProjects,
        tasks: liveTasks,
        maintenanceRequests: liveMaintenanceRequests,
        businesses,
      }),
    [liveProjects, liveTasks, liveMaintenanceRequests, businesses],
  );

  const counters = useMemo(
    () => [
      {
        label: "Tarefas atrasadas",
        value: attentionItems.filter((item) => item.kind === "task" && item.urgency === "overdue").length,
        icon: AlertTriangle,
        tone: "text-primary",
        href: "/tasks",
      },
      {
        label: "Follow-ups atrasados",
        value: attentionItems.filter(
          (item) => item.kind === "deal" && (item.urgency === "overdue" || item.urgency === "stalled"),
        ).length,
        icon: Handshake,
        tone: "text-primary",
        href: "/commercial",
      },
      {
        // Round 7.1: não há uma listagem transversal de Projects bloqueados
        // (podem ser Website ou PiriCard); /clients já mostra o estado geral
        // "Bloqueado" por negócio — destino existente mais coerente, sem
        // inventar uma rota nova nem infraestrutura de query params.
        label: "Projetos bloqueados",
        value: blockedProjectsCount,
        icon: PauseCircle,
        tone: "text-destructive",
        href: "/clients",
      },
      {
        // Round 7.1: label esclarece a janela (30 dias) para não se ler como
        // o mesmo total do painel "Renovações" abaixo, que usa 60 dias.
        label: "Renovações a 30 dias",
        value: attentionItems.filter((item) => item.kind === "renewal").length,
        icon: RefreshCw,
        tone: "text-info",
        href: "/renewals",
      },
      {
        label: "Pagamentos em atraso",
        value: attentionItems.filter((item) => item.kind === "payment" && item.urgency === "overdue").length,
        icon: Wallet,
        tone: "text-primary",
        href: "/finance",
      },
    ],
    [attentionItems, blockedProjectsCount],
  );

  const todayItems = useMemo(
    () => attentionItems.filter((item) => item.urgency === "due_today" && (item.kind === "task" || item.kind === "deal")),
    [attentionItems],
  );

  const topActions = attentionItems.slice(0, 8);

  const activeProduction = useMemo(
    () =>
      liveProjects
        .filter((project) => project.status === "in_progress")
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, 5),
    [liveProjects],
  );

  const openDeals = useMemo(
    () =>
      deals
        .filter((deal) => isOpenDealStage(deal.stage))
        .filter((deal) => businessById.get(deal.businessId)?.lifecycleStatus !== "inactive")
        .map((deal) => ({ deal, followUp: computeDealFollowUp(deal, today) }))
        .sort((a, b) => (a.followUp.daysDelta ?? Infinity) - (b.followUp.daysDelta ?? Infinity))
        .slice(0, 5),
    [deals, businessById, today],
  );

  const upcomingRenewalRows = useMemo(
    () =>
      liveRenewals
        .filter((renewal) => renewal.status === "pending" && diffCalendarDays(renewal.dueDate, today) <= RENEWALS_PANEL_WINDOW_DAYS)
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
        .slice(0, 5)
        .map((renewal) => {
          const project = projectById.get(renewal.projectId);
          const business = project ? businessById.get(project.businessId) : undefined;
          return { renewal, project, business };
        }),
    [liveRenewals, projectById, businessById, today],
  );

  const topGoals = useMemo(() => [...liveGoals].sort((a, b) => a.progress - b.progress).slice(0, 3), [liveGoals]);

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Precisa da tua atenção */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {counters.map(({ label, value, icon: Icon, tone, href }) => {
          const card = (
            <Card className={href ? "transition-colors hover:bg-accent/40" : undefined}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
                <div>
                  <p className="text-2xl font-semibold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
          return href ? (
            <Link key={label} href={href}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          {/* 2. Hoje */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-info" /> Hoje
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {todayItems.length === 0 ? (
                <EmptyRow text="Nada agendado para hoje." />
              ) : (
                todayItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <Link
                      href={resolveItemHref(item)}
                      className="min-w-0 truncate text-sm hover:text-info hover:underline"
                    >
                      {displayTitle(item)}
                    </Link>
                    <div className="shrink-0">
                      <OwnerBadge ownerId={item.ownerId} userById={userById} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 3. Próximas ações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas ações</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {topActions.length === 0 ? (
                <EmptyRow text="Sem nada a precisar da tua atenção — bom sinal." />
              ) : (
                topActions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={resolveItemHref(item)}
                      className="flex min-w-0 items-center gap-2 text-sm hover:text-info hover:underline"
                    >
                      {item.businessName && <span className="shrink-0 font-medium">{item.businessName}</span>}
                      {item.businessName && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      <span className="min-w-0 truncate text-muted-foreground">{item.title}</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <OwnerBadge ownerId={item.ownerId} userById={userById} variant="outline" />
                      <FollowUpStatus urgency={item.urgency} daysDelta={item.daysDelta} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 4. À espera do cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">À espera do cliente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {waitingOnClientItems.length === 0 ? (
                <EmptyRow text="Nada à espera de terceiros neste momento." />
              ) : (
                waitingOnClientItems.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <Link href={item.href} className="min-w-0 truncate text-sm hover:text-info hover:underline">
                      {item.businessName ? `${item.businessName} — ${item.title}` : item.title}
                    </Link>
                    <WaitingReasonTag reason={item.waitingReason} className="shrink-0" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {/* 5. Produção ativa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="h-4 w-4 text-info" /> Produção ativa
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {activeProduction.length === 0 ? (
                <EmptyRow text="Nada em produção neste momento." />
              ) : (
                activeProduction.map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <Link
                      href={projectDetailHref(project)}
                      className="min-w-0 truncate text-sm hover:text-info hover:underline"
                    >
                      {businessById.get(project.businessId)?.name ?? "?"} — {project.name}
                    </Link>
                    <Badge variant="info" className="shrink-0">
                      {workStatusLabel(project.status)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 6. Comercial / Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Handshake className="h-4 w-4 text-info" /> Comercial / Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {openDeals.length === 0 ? (
                <EmptyRow text="Sem oportunidades comerciais em aberto." />
              ) : (
                openDeals.map(({ deal, followUp }) => (
                  <div key={deal.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <Link
                      href={`/businesses/${deal.businessId}?tab=commercial`}
                      className="min-w-0 truncate text-sm hover:text-info hover:underline"
                    >
                      {businessById.get(deal.businessId)?.name ?? deal.title}
                    </Link>
                    <FollowUpStatus
                      urgency={followUp.urgency}
                      daysDelta={followUp.daysDelta}
                      className="shrink-0"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 7. Renovações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-info" /> Renovações · próximos 60 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {upcomingRenewalRows.length === 0 ? (
                <EmptyRow text="Sem renovações nos próximos 60 dias." />
              ) : (
                upcomingRenewalRows.map(({ renewal, project, business }) => (
                  <div key={renewal.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <Link
                      href={project ? projectDetailHref(project) : "/renewals"}
                      className="min-w-0 truncate text-sm hover:text-info hover:underline"
                    >
                      {renewalTypeLabel(renewal.type)} — {business?.name ?? project?.name ?? "?"}
                    </Link>
                    <FollowUpStatus
                      urgency={classifyUrgency(renewal.dueDate, today, RENEWALS_PANEL_WINDOW_DAYS)}
                      daysDelta={diffCalendarDays(renewal.dueDate, today)}
                      className="shrink-0"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 8. Goals — título visível em PT-PT (Round 7.1); nomes internos (Goal, topGoals, getGoals) mantêm-se em inglês. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-info" /> Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {topGoals.length === 0 ? (
                <EmptyRow text="Sem objetivos definidos." />
              ) : (
                topGoals.map((goal) => (
                  <div key={goal.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="min-w-0 truncate">{goal.title}</span>
                      <span className="shrink-0 text-muted-foreground">{goal.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              <Link href="/goals" className="text-xs text-muted-foreground hover:text-info hover:underline">
                Ver objetivos
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-6 py-6 text-center text-xs text-muted-foreground">{text}</p>;
}

function OwnerBadge({
  ownerId,
  userById,
  variant = "secondary",
}: {
  ownerId: string | null;
  userById: Map<string, User>;
  variant?: "secondary" | "outline";
}) {
  if (ownerId === null) return null;
  const user = userById.get(ownerId);
  if (user === undefined) return null;
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Avatar className="h-4 w-4">
        <AvatarFallback className="text-[8px]">{user.initials}</AvatarFallback>
      </Avatar>
      {user.name}
    </Badge>
  );
}

/**
 * Título a mostrar numa linha — `task`/`renewal`/`payment` já embutem o
 * negócio no próprio texto (convenção de `attention-rules.ts`); só `deal` e
 * `maintenance` precisam do prefixo aqui, para nunca aparecer duplicado.
 */
function displayTitle(item: AttentionItem): string {
  if ((item.kind === "deal" || item.kind === "maintenance") && item.businessName) {
    return `${item.businessName} — ${item.title}`;
  }
  return item.title;
}

/**
 * `AttentionItem.href` aponta para a lista do género (ainda não há detalhe
 * por item de Task/Renewal/Payment/Manutenção); um `deal` já pode ir direto
 * à aba Comercial do Business Detail, que existe desde o Round 3.
 */
/**
 * Round 7.1 — `AttentionItem.href` (definido em `attention-rules.ts`, não
 * tocado aqui) aponta sempre para a lista do género; onde já existe um
 * contexto funcional mais específico e sem alterar essa estrutura, o
 * Dashboard usa-o em vez do destino genérico:
 * - `deal` → aba Comercial do Business Detail (já existia desde o Round 7)
 * - `payment` → aba Pagamentos do Business Detail (Finance ainda não é
 *   funcional — nunca se deve levar para lá)
 * - `maintenance` → aba Manutenção do Business Detail (Round 9: a aba passou
 *   a existir; antes disso ia só para o Business Detail sem aba nenhuma)
 * Sem `businessId`, cai sempre no `item.href` original (`/tasks`,
 * `/renewals`, `/commercial`, `/finance`, `/maintenance`).
 */
export function resolveItemHref(item: AttentionItem): string {
  if (item.businessId === null) return item.href;

  switch (item.kind) {
    case "deal":
      return `/businesses/${item.businessId}?tab=commercial`;
    case "payment":
      return `/businesses/${item.businessId}?tab=payments`;
    case "maintenance":
      return `/businesses/${item.businessId}?tab=maintenance`;
    default:
      return item.href;
  }
}
