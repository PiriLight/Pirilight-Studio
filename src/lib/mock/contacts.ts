import type { Contact } from "@/types";

import { BUSINESS_IDS, CONTACT_IDS } from "./businesses";
import type { SeedDates } from "./seed-dates";

/**
 * Contactos fictícios. Emails em `@example.pt` e telefones no bloco
 * `+351 900 000 0XX` — deliberadamente inválidos, para nunca haver dados
 * pessoais reais no repositório.
 */
export function buildContacts(d: SeedDates): Contact[] {
  const base = { createdAt: d.stamp(-60), updatedAt: d.stamp(-60) };

  return [
    { id: CONTACT_IDS.oftRacing, businessId: BUSINESS_IDS.oftRacing, name: "Rui Marques", role: "Team manager", email: "geral@oft-racing.example.pt", phone: "+351 900 000 001", ...base },
    { id: CONTACT_IDS.floricultura, businessId: BUSINESS_IDS.floricultura, name: "Marta Nunes", role: "Proprietária", email: "geral@floricultura.example.pt", phone: "+351 900 000 002", ...base },
    { id: CONTACT_IDS.padaria, businessId: BUSINESS_IDS.padaria, name: "Hugo Dias", role: "Gerente", email: "geral@padariadavila.example.pt", phone: "+351 900 000 003", ...base },
    { id: CONTACT_IDS.phoneStop, businessId: BUSINESS_IDS.phoneStop, name: "Tiago Lopes", role: "Proprietário", email: "geral@phonestop.example.pt", phone: "+351 900 000 004", ...base },
    { id: CONTACT_IDS.studioVetorial, businessId: BUSINESS_IDS.studioVetorial, name: "Inês Barbosa", role: "Direção criativa", email: "geral@studiovetorial.example.pt", phone: "+351 900 000 005", ...base },
    { id: CONTACT_IDS.optica, businessId: BUSINESS_IDS.optica, name: "Carla Pinto", role: "Gerente", email: "geral@visaoclara.example.pt", phone: "+351 900 000 006", ...base },
    { id: CONTACT_IDS.boiNaBrasa, businessId: BUSINESS_IDS.boiNaBrasa, name: "Paulo Ferreira", role: "Proprietário", email: "geral@boinabrasa.example.pt", phone: "+351 900 000 007", ...base },
    { id: CONTACT_IDS.boiNaBrasaSecond, businessId: BUSINESS_IDS.boiNaBrasa, name: "Sara Ferreira", role: "Gestão de sala", email: "sala@boinabrasa.example.pt", phone: "+351 900 000 008", ...base },
    { id: CONTACT_IDS.beautyConnection, businessId: BUSINESS_IDS.beautyConnection, name: "Rita Amaral", role: "Proprietária", email: "geral@beautyconnection.example.pt", phone: "+351 900 000 009", ...base },
    { id: CONTACT_IDS.autoformigal, businessId: BUSINESS_IDS.autoformigal, name: "Nuno Trindade", role: "Sócio-gerente", email: "geral@autoformigal.example.pt", phone: "+351 900 000 010", ...base },
    { id: CONTACT_IDS.autoformigalSecond, businessId: BUSINESS_IDS.autoformigal, name: "Bruno Trindade", role: "Oficina", email: "oficina@autoformigal.example.pt", phone: "+351 900 000 011", ...base },
    { id: CONTACT_IDS.talho, businessId: BUSINESS_IDS.talho, name: "Álvaro Sousa", role: "Proprietário", email: "geral@talhodobairro.example.pt", phone: "+351 900 000 012", ...base },
    { id: CONTACT_IDS.cafeCentral, businessId: BUSINESS_IDS.cafeCentral, name: "Diana Rocha", role: "Gerente", email: "geral@cafecentral.example.pt", phone: "+351 900 000 013", ...base },
    { id: CONTACT_IDS.clinicaSorriso, businessId: BUSINESS_IDS.clinicaSorriso, name: "Helena Matos", role: "Diretora clínica", email: "geral@clinicasorriso.example.pt", phone: "+351 900 000 014", ...base },
    { id: CONTACT_IDS.ginasioImpulso, businessId: BUSINESS_IDS.ginasioImpulso, name: "Miguel Costa", role: "Diretor", email: "geral@ginasioimpulso.example.pt", phone: "+351 900 000 015", ...base },
    { id: CONTACT_IDS.autoEletrica, businessId: BUSINESS_IDS.autoEletrica, name: "José Ferreira", role: "Proprietário", email: "geral@autoeletricaferreira.example.pt", phone: "+351 900 000 016", ...base },
    { id: CONTACT_IDS.barbearia, businessId: BUSINESS_IDS.barbearia, name: "Ricardo Neves", role: "Proprietário", email: "geral@novaonda.example.pt", phone: "+351 900 000 017", ...base },
  ];
}
