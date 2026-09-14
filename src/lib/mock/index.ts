import type {
  Business,
  Contact,
  Deal,
  Goal,
  MaintenanceRequest,
  MaterialAsset,
  Payment,
  PiriCard,
  Project,
  Renewal,
  Task,
  User,
  Website,
} from "@/types";

import { buildBusinesses } from "./businesses";
import { buildContacts } from "./contacts";
import { buildDeals } from "./deals";
import { buildGoals } from "./goals";
import { buildMaintenanceRequests } from "./maintenance-requests";
import { buildMaterialAssets } from "./material-assets";
import { buildPayments } from "./payments";
import { buildPiriCards, buildProjects, buildWebsites } from "./projects";
import { buildRenewals } from "./renewals";
import { createSeedDates } from "./seed-dates";
import { buildTasks } from "./tasks";
import { buildUsers } from "./users";

export interface MockDataset {
  anchorDate: string;
  users: User[];
  businesses: Business[];
  contacts: Contact[];
  deals: Deal[];
  projects: Project[];
  websites: Website[];
  piriCards: PiriCard[];
  tasks: Task[];
  renewals: Renewal[];
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  goals: Goal[];
  materialAssets: MaterialAsset[];
}

/**
 * Constrói o dataset completo a partir de uma **âncora de data**.
 *
 * Em runtime a âncora é o dia de hoje, o que mantém os cenários vivos
 * ("renovação amanhã" é sempre amanhã). Nos testes a âncora é `TEST_TODAY`,
 * o que os torna completamente independentes do relógio da máquina.
 */
export function buildMockData(anchor: Date): MockDataset {
  const d = createSeedDates(anchor);

  return {
    anchorDate: d.today,
    users: buildUsers(d),
    businesses: buildBusinesses(d),
    contacts: buildContacts(d),
    deals: buildDeals(d),
    projects: buildProjects(d),
    websites: buildWebsites(),
    piriCards: buildPiriCards(),
    tasks: buildTasks(d),
    renewals: buildRenewals(d),
    payments: buildPayments(d),
    maintenanceRequests: buildMaintenanceRequests(d),
    goals: buildGoals(d),
    materialAssets: buildMaterialAssets(d),
  };
}

export { createSeedDates, TEST_TODAY } from "./seed-dates";
export type { SeedDates } from "./seed-dates";
