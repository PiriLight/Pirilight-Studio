import type { PiriCard, Project, Website } from "@/types";

import { BUSINESS_IDS } from "./businesses";
import { DEAL_IDS } from "./deals";
import type { SeedDates } from "./seed-dates";

export const PROJECT_IDS = {
  boiNaBrasaWeb: "proj-boi-na-brasa-web",
  boiNaBrasaCard: "proj-boi-na-brasa-card",
  beautyCard: "proj-beauty-connection-card",
  beautyWeb: "proj-beauty-connection-web",
  autoformigalWeb: "proj-autoformigal-web",
  talhoWeb: "proj-talho-web",
  cafeCentralCard: "proj-cafe-central-card",
  clinicaWeb: "proj-clinica-sorriso-web",
  ginasioWeb: "proj-ginasio-impulso-web",
  autoEletricaCard: "proj-auto-eletrica-card",
  barbeariaWeb: "proj-barbearia-web",
} as const;

/**
 * `Project` é a espinha; Website e PiriCard são detalhes 1:1 (abaixo).
 *
 * Cobertura deliberada de estados:
 * - `in_progress` (Autoformigal, Beauty Connection, Auto Elétrica);
 * - `waiting_on_client` com motivo `photos` (Boi na Brasa) e `approval` (Beauty);
 * - `blocked` (Talho do Bairro);
 * - `done` (Café Central, Clínica, Ginásio, Barbearia);
 * - projeto **sem deal de origem** (`dealId: null`, Clínica) — cliente direto.
 */
export function buildProjects(d: SeedDates): Project[] {
  return [
    {
      // CENÁRIO: à espera de fotografias do cliente.
      id: PROJECT_IDS.boiNaBrasaWeb,
      businessId: BUSINESS_IDS.boiNaBrasa,
      dealId: DEAL_IDS.boiNaBrasaWon,
      type: "website",
      name: "Website Boi na Brasa",
      status: "waiting_on_client",
      waitingReason: "photos",
      startDate: d.day(-75),
      launchDate: null,
      createdAt: d.stamp(-75),
      updatedAt: d.stamp(-12),
    },
    {
      id: PROJECT_IDS.boiNaBrasaCard,
      businessId: BUSINESS_IDS.boiNaBrasa,
      dealId: DEAL_IDS.boiNaBrasaWon,
      type: "piricard",
      name: "PiriCards Boi na Brasa",
      status: "done",
      waitingReason: null,
      startDate: d.day(-320),
      launchDate: d.day(-290),
      createdAt: d.stamp(-320),
      updatedAt: d.stamp(-290),
    },
    {
      // CENÁRIO: PiriCard em produção.
      id: PROJECT_IDS.beautyCard,
      businessId: BUSINESS_IDS.beautyConnection,
      dealId: DEAL_IDS.beautyConnectionWon,
      type: "piricard",
      name: "PiriCards de fidelização",
      status: "in_progress",
      waitingReason: null,
      startDate: d.day(-30),
      launchDate: null,
      createdAt: d.stamp(-30),
      updatedAt: d.stamp(-8),
    },
    {
      // CENÁRIO: à espera de aprovação do cliente.
      id: PROJECT_IDS.beautyWeb,
      businessId: BUSINESS_IDS.beautyConnection,
      dealId: null,
      type: "website",
      name: "Landing page de campanha",
      status: "waiting_on_client",
      waitingReason: "approval",
      startDate: d.day(-40),
      launchDate: null,
      createdAt: d.stamp(-40),
      updatedAt: d.stamp(-9),
    },
    {
      // CENÁRIO: website em desenvolvimento.
      id: PROJECT_IDS.autoformigalWeb,
      businessId: BUSINESS_IDS.autoformigal,
      dealId: DEAL_IDS.autoformigalWon,
      type: "website",
      name: "Website Autoformigal",
      status: "in_progress",
      waitingReason: null,
      startDate: d.day(-45),
      launchDate: null,
      createdAt: d.stamp(-45),
      updatedAt: d.stamp(-3),
    },
    {
      // CENÁRIO: projeto bloqueado (é nosso para desbloquear).
      id: PROJECT_IDS.talhoWeb,
      businessId: BUSINESS_IDS.talho,
      dealId: null,
      type: "website",
      name: "Website Talho do Bairro",
      status: "blocked",
      waitingReason: null,
      startDate: d.day(-90),
      launchDate: null,
      createdAt: d.stamp(-90),
      updatedAt: d.stamp(-15),
    },
    {
      // CENÁRIO: projeto concluído.
      id: PROJECT_IDS.cafeCentralCard,
      businessId: BUSINESS_IDS.cafeCentral,
      dealId: null,
      type: "piricard",
      name: "PiriCards Café Central",
      status: "done",
      waitingReason: null,
      startDate: d.day(-120),
      launchDate: d.day(-60),
      createdAt: d.stamp(-120),
      updatedAt: d.stamp(-60),
    },
    {
      // Projeto sem deal de origem: cliente direto, sem histórico de CRM.
      id: PROJECT_IDS.clinicaWeb,
      businessId: BUSINESS_IDS.clinicaSorriso,
      dealId: null,
      type: "website",
      name: "Website Clínica Sorriso",
      status: "done",
      waitingReason: null,
      startDate: d.day(-200),
      launchDate: d.day(-150),
      createdAt: d.stamp(-200),
      updatedAt: d.stamp(-150),
    },
    {
      id: PROJECT_IDS.ginasioWeb,
      businessId: BUSINESS_IDS.ginasioImpulso,
      dealId: null,
      type: "website",
      name: "Website Ginásio Impulso",
      status: "done",
      waitingReason: null,
      startDate: d.day(-300),
      launchDate: d.day(-260),
      createdAt: d.stamp(-300),
      updatedAt: d.stamp(-260),
    },
    {
      id: PROJECT_IDS.autoEletricaCard,
      businessId: BUSINESS_IDS.autoEletrica,
      dealId: DEAL_IDS.autoEletricaWon,
      type: "piricard",
      name: "PiriCards Auto Elétrica",
      status: "in_progress",
      waitingReason: null,
      startDate: d.day(-25),
      launchDate: null,
      createdAt: d.stamp(-25),
      updatedAt: d.stamp(-7),
    },
    {
      id: PROJECT_IDS.barbeariaWeb,
      businessId: BUSINESS_IDS.barbearia,
      dealId: null,
      type: "website",
      name: "Website Barbearia Nova Onda",
      status: "done",
      waitingReason: null,
      startDate: d.day(-520),
      launchDate: d.day(-480),
      createdAt: d.stamp(-520),
      updatedAt: d.stamp(-480),
    },
  ];
}

/** Detalhe 1:1 de cada projeto do tipo `website`. */
export function buildWebsites(): Website[] {
  return [
    { projectId: PROJECT_IDS.boiNaBrasaWeb, domain: "boinabrasa.example.pt", hostingProvider: "PiriLight Hosting", cmsType: "Next.js + CMS", stagingUrl: "staging.boinabrasa.example.pt" },
    { projectId: PROJECT_IDS.beautyWeb, domain: "beautyconnection.example.pt", hostingProvider: "PiriLight Hosting", cmsType: "Landing estática", stagingUrl: null },
    { projectId: PROJECT_IDS.autoformigalWeb, domain: "autoformigal.example.pt", hostingProvider: "PiriLight Hosting", cmsType: "Next.js + CMS", stagingUrl: "staging.autoformigal.example.pt" },
    { projectId: PROJECT_IDS.talhoWeb, domain: "talhodobairro.example.pt", hostingProvider: "Externo (cliente)", cmsType: "WordPress", stagingUrl: null },
    { projectId: PROJECT_IDS.clinicaWeb, domain: "clinicasorriso.example.pt", hostingProvider: "PiriLight Hosting", cmsType: "Next.js", stagingUrl: null },
    { projectId: PROJECT_IDS.ginasioWeb, domain: "ginasioimpulso.example.pt", hostingProvider: "PiriLight Hosting", cmsType: "Next.js", stagingUrl: null },
    { projectId: PROJECT_IDS.barbeariaWeb, domain: "novaonda.example.pt", hostingProvider: "Externo (cliente)", cmsType: "WordPress", stagingUrl: null },
  ];
}

/** Detalhe 1:1 de cada projeto do tipo `piricard`. */
export function buildPiriCards(): PiriCard[] {
  return [
    { projectId: PROJECT_IDS.boiNaBrasaCard, cardType: "physical", designStatus: "approved", shippingStatus: "delivered", quantity: 250 },
    { projectId: PROJECT_IDS.beautyCard, cardType: "hybrid", designStatus: "approved", shippingStatus: "in_production", quantity: 300 },
    { projectId: PROJECT_IDS.cafeCentralCard, cardType: "physical", designStatus: "approved", shippingStatus: "delivered", quantity: 150 },
    { projectId: PROJECT_IDS.autoEletricaCard, cardType: "digital", designStatus: "in_design", shippingStatus: "not_shipped", quantity: 200 },
  ];
}
