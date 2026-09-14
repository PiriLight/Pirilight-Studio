import { COMMERCIAL_LIFECYCLE_STATUSES } from "@/lib/validation/business";
import type { Business, Contact, LifecycleStatus } from "@/types";

import { getMockData, read } from "./internal";

/**
 * Comercial e Clientes leem daqui — do **mesmo array**, com filtros
 * diferentes. É esta função que prova que não há entidades duplicadas: a Phone
 * Stop é uma linha só, que passa de `lead` a `client` sem mudar de tabela.
 */
export async function getBusinesses(now: Date = new Date()): Promise<Business[]> {
  return read(getMockData(now).businesses);
}

export async function getBusinessById(
  id: string,
  now: Date = new Date(),
): Promise<Business | null> {
  const business = getMockData(now).businesses.find((b) => b.id === id);
  return read(business ?? null);
}

export async function getBusinessesByLifecycleStatus(
  status: LifecycleStatus | readonly LifecycleStatus[],
  now: Date = new Date(),
): Promise<Business[]> {
  const wanted = Array.isArray(status) ? status : [status as LifecycleStatus];
  return read(getMockData(now).businesses.filter((b) => wanted.includes(b.lifecycleStatus)));
}

/** Atalho para a área Comercial: prospects, leads e interessados. */
export async function getCommercialBusinesses(now: Date = new Date()): Promise<Business[]> {
  return getBusinessesByLifecycleStatus(COMMERCIAL_LIFECYCLE_STATUSES, now);
}

/** Atalho para a área Clientes. */
export async function getClientBusinesses(now: Date = new Date()): Promise<Business[]> {
  return getBusinessesByLifecycleStatus("client", now);
}

export async function getContacts(now: Date = new Date()): Promise<Contact[]> {
  return read(getMockData(now).contacts);
}

export async function getContactsByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<Contact[]> {
  return read(getMockData(now).contacts.filter((c) => c.businessId === businessId));
}
