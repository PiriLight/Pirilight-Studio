import type { PiriCard, Project, ProjectType, Website } from "@/types";

import { getMockData, read } from "./internal";

export async function getProjects(now: Date = new Date()): Promise<Project[]> {
  return read(getMockData(now).projects);
}

export async function getProjectById(id: string, now: Date = new Date()): Promise<Project | null> {
  return read(getMockData(now).projects.find((p) => p.id === id) ?? null);
}

export async function getProjectsByBusinessId(
  businessId: string,
  now: Date = new Date(),
): Promise<Project[]> {
  return read(getMockData(now).projects.filter((p) => p.businessId === businessId));
}

export async function getProjectsByType(
  type: ProjectType,
  now: Date = new Date(),
): Promise<Project[]> {
  return read(getMockData(now).projects.filter((p) => p.type === type));
}

/** Projetos em produção ativa (Dashboard, secção "Produção ativa"). */
export async function getActiveProjects(now: Date = new Date()): Promise<Project[]> {
  return read(getMockData(now).projects.filter((p) => p.status === "in_progress"));
}

export async function getWebsites(now: Date = new Date()): Promise<Website[]> {
  return read(getMockData(now).websites);
}

export async function getWebsiteByProjectId(
  projectId: string,
  now: Date = new Date(),
): Promise<Website | null> {
  return read(getMockData(now).websites.find((w) => w.projectId === projectId) ?? null);
}

export async function getPiriCards(now: Date = new Date()): Promise<PiriCard[]> {
  return read(getMockData(now).piriCards);
}

export async function getPiriCardByProjectId(
  projectId: string,
  now: Date = new Date(),
): Promise<PiriCard | null> {
  return read(getMockData(now).piriCards.find((c) => c.projectId === projectId) ?? null);
}
