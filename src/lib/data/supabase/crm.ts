import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Business, BusinessOverview, Contact, Deal, DealStage, User } from "@/types";

import { deriveNextAction, pickOpenDeal } from "../business-overview";

import {
  listActiveAppUsers,
  listBusinesses,
  listContacts,
  listDeals,
  type AppUserRow,
  type BusinessRow,
  type ContactRow,
  type DealRow,
} from "./operational";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function mapAppUser(row: AppUserRow): User {
  return {
    id: row.user_id,
    name: row.display_name,
    initials: initials(row.display_name),
    accentColor: "hsl(var(--primary))",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapContact(row: ContactRow): Contact {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    role: row.role ?? "Contacto",
    email: row.email ?? "",
    phone: row.phone ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusiness(row: BusinessRow, contacts: readonly ContactRow[]): Business {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry ?? "Sem setor definido",
    lifecycleStatus: row.lifecycle_status as Business["lifecycleStatus"],
    primaryContactId: contacts.find((contact) => contact.business_id === row.id && contact.is_primary)?.id ?? null,
    location: row.location ?? "Sem localização definida",
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDeal(row: DealRow): Deal {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    stage: row.stage as DealStage,
    value: Number(row.estimated_value),
    responsibleUserId: row.responsible_user_id,
    nextAction: row.next_action,
    nextActionDate: row.next_action_date,
    lastInteractionDate: row.last_interaction_date ?? row.created_at.slice(0, 10),
    expectedCloseDate: row.expected_close_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CrmSnapshot {
  businesses: Business[];
  contacts: Contact[];
  deals: Deal[];
  users: User[];
  contactRows: ContactRow[];
  dealRows: DealRow[];
}

export async function loadCrmSnapshot(): Promise<CrmSnapshot> {
  const client = await createClient();
  const [businessRows, contactRows, dealRows, appUserRows] = await Promise.all([
    listBusinesses(client),
    listContacts(client),
    listDeals(client),
    listActiveAppUsers(client),
  ]);

  return {
    businesses: businessRows.map((business) => mapBusiness(business, contactRows)),
    contacts: contactRows.map(mapContact),
    deals: dealRows.map(mapDeal),
    users: appUserRows.map(mapAppUser),
    contactRows,
    dealRows,
  };
}

export function buildCrmBusinessOverview(
  snapshot: CrmSnapshot,
  businessId: string,
  today: string,
): BusinessOverview | null {
  const business = snapshot.businesses.find((item) => item.id === businessId);
  if (!business) return null;

  const contacts = snapshot.contacts.filter((item) => item.businessId === businessId);
  const deals = snapshot.deals.filter((item) => item.businessId === businessId);
  const openDeal = pickOpenDeal(deals);
  const responsibleUserId = [...deals]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]?.responsibleUserId ?? null;

  return {
    business,
    primaryContact: contacts.find((item) => item.id === business.primaryContactId) ?? null,
    contacts,
    deals,
    openDeal,
    projects: [],
    renewals: [],
    tasks: [],
    maintenanceRequests: [],
    payments: [],
    paymentSummary: {
      totalValue: 0,
      amountReceived: 0,
      remainingValue: 0,
      hasOverdue: false,
      hasPayments: false,
    },
    responsibleUserId,
    overallStatus: "none",
    nextAction: deriveNextAction(
      { tasks: [], maintenanceRequests: [], openDeal, lifecycleStatus: business.lifecycleStatus },
      today,
    ),
  };
}
