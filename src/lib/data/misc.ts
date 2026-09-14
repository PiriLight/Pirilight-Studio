import type { Goal, MaintenanceRequest, MaterialAsset, User } from "@/types";

import { getMockData, read } from "./internal";

export async function getUsers(now: Date = new Date()): Promise<User[]> {
  return read(getMockData(now).users);
}

export async function getUserById(id: string, now: Date = new Date()): Promise<User | null> {
  return read(getMockData(now).users.find((u) => u.id === id) ?? null);
}

export async function getMaintenanceRequests(
  now: Date = new Date(),
): Promise<MaintenanceRequest[]> {
  return read(getMockData(now).maintenanceRequests);
}

export async function getMaintenanceRequestsByProjectId(
  projectId: string,
  now: Date = new Date(),
): Promise<MaintenanceRequest[]> {
  return read(getMockData(now).maintenanceRequests.filter((m) => m.projectId === projectId));
}

export async function getMaintenanceRequestsByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<MaintenanceRequest[]> {
  return read(getMockData(now).maintenanceRequests.filter((m) => m.businessId === businessId));
}

export async function getGoals(now: Date = new Date()): Promise<Goal[]> {
  return read(getMockData(now).goals);
}

export async function getMaterialAssets(now: Date = new Date()): Promise<MaterialAsset[]> {
  return read(getMockData(now).materialAssets);
}
