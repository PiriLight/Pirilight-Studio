"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireAuthorizedUser } from "@/lib/auth/authorization";
import { isSupabaseCrmEnabled } from "@/lib/data/crm-mode";
import {
  archiveBusiness,
  changeDealStage,
  createBusiness,
  createContact,
  createDeal,
  deleteBusiness,
  deleteContact,
  deleteDeal,
  setPrimaryContact,
  updateBusiness,
  updateContact,
  updateDeal,
} from "@/lib/data/supabase/operational";
import { createClient } from "@/lib/supabase/server";
import {
  businessInputSchema,
  contactInputSchema,
  dealInputSchema,
  idSchema,
  quickBusinessDealInputSchema,
  type BusinessInput,
  type ContactInput,
  type DealInput,
  type QuickBusinessDealInput,
} from "@/lib/validation/crm";
import { dealStageSchema, type DealStage } from "@/lib/validation/deal";

export interface CrmActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

function invalid(error: z.ZodError): CrmActionResult {
  return {
    ok: false,
    message: "Revê os campos assinalados.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

async function authorizedClient() {
  if (!isSupabaseCrmEnabled()) {
    throw new Error("A persistência CRM Supabase ainda não está ativa neste ambiente.");
  }
  await requireAuthorizedUser();
  return createClient();
}

function refreshCrm(businessId?: string): void {
  revalidatePath("/commercial");
  revalidatePath("/clients");
  if (businessId) revalidatePath(`/businesses/${businessId}`);
}

function failure(error: unknown): CrmActionResult {
  console.error("[crm] Mutation failed", {
    message: error instanceof Error ? error.message : "Unknown error",
  });
  return {
    ok: false,
    message: error instanceof Error ? error.message : "Não foi possível guardar a alteração.",
  };
}

export async function createClientAction(
  businessInput: BusinessInput,
  contactInput?: Omit<ContactInput, "businessId">,
): Promise<CrmActionResult> {
  const businessParsed = businessInputSchema.safeParse(businessInput);
  if (!businessParsed.success) return invalid(businessParsed.error);

  try {
    const client = await authorizedClient();
    const business = await createBusiness(client, {
      ...businessParsed.data,
      lifecycle_status: "client",
    });

    if (contactInput?.name.trim()) {
      const contactParsed = contactInputSchema.safeParse({
        ...contactInput,
        businessId: business.id,
        isPrimary: true,
      });
      if (!contactParsed.success) {
        await deleteBusiness(client, business.id);
        return invalid(contactParsed.error);
      }
      try {
        await createContact(client, {
          business_id: business.id,
          name: contactParsed.data.name,
          role: contactParsed.data.role,
          email: contactParsed.data.email,
          phone: contactParsed.data.phone,
          is_primary: true,
        });
      } catch (error) {
        await deleteBusiness(client, business.id);
        throw error;
      }
    }

    refreshCrm(business.id);
    return { ok: true, message: "Cliente criado com sucesso." };
  } catch (error) {
    return failure(error);
  }
}

export async function updateBusinessAction(id: string, input: BusinessInput): Promise<CrmActionResult> {
  const [idParsed, inputParsed] = [idSchema.safeParse(id), businessInputSchema.safeParse(input)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!inputParsed.success) return invalid(inputParsed.error);

  try {
    const client = await authorizedClient();
    await updateBusiness(client, idParsed.data, inputParsed.data);
    refreshCrm(idParsed.data);
    return { ok: true, message: "Cliente atualizado." };
  } catch (error) {
    return failure(error);
  }
}

export async function archiveBusinessAction(id: string): Promise<CrmActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await archiveBusiness(client, parsed.data);
    refreshCrm(parsed.data);
    return { ok: true, message: "Cliente arquivado." };
  } catch (error) {
    return failure(error);
  }
}

export async function createContactAction(input: ContactInput): Promise<CrmActionResult> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    const contact = await createContact(client, {
      business_id: parsed.data.businessId,
      name: parsed.data.name,
      role: parsed.data.role,
      email: parsed.data.email,
      phone: parsed.data.phone,
      is_primary: false,
    });
    if (parsed.data.isPrimary) {
      await setPrimaryContact(client, parsed.data.businessId, contact.id);
    }
    refreshCrm(parsed.data.businessId);
    return { ok: true, message: "Contacto adicionado." };
  } catch (error) {
    return failure(error);
  }
}

export async function updateContactAction(id: string, input: ContactInput): Promise<CrmActionResult> {
  const [idParsed, inputParsed] = [idSchema.safeParse(id), contactInputSchema.safeParse(input)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!inputParsed.success) return invalid(inputParsed.error);
  try {
    const client = await authorizedClient();
    await updateContact(client, idParsed.data, {
      name: inputParsed.data.name,
      role: inputParsed.data.role,
      email: inputParsed.data.email,
      phone: inputParsed.data.phone,
      is_primary: inputParsed.data.isPrimary ? undefined : false,
    });
    if (inputParsed.data.isPrimary) {
      await setPrimaryContact(client, inputParsed.data.businessId, idParsed.data);
    }
    refreshCrm(inputParsed.data.businessId);
    return { ok: true, message: "Contacto atualizado." };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteContactAction(
  id: string,
  businessId: string,
): Promise<CrmActionResult> {
  const [idParsed, businessParsed] = [idSchema.safeParse(id), idSchema.safeParse(businessId)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!businessParsed.success) return invalid(businessParsed.error);
  try {
    const client = await authorizedClient();
    await deleteContact(client, idParsed.data);
    refreshCrm(businessParsed.data);
    return { ok: true, message: "Contacto removido." };
  } catch (error) {
    return failure(error);
  }
}

export async function createOpportunityAction(
  mode: "existing" | "new",
  input: DealInput | QuickBusinessDealInput,
): Promise<CrmActionResult> {
  try {
    const client = await authorizedClient();
    let businessId: string;
    let contactId: string | null = null;
    let createdBusinessId: string | null = null;
    let createdContactId: string | null = null;
    let dealData: ReturnType<typeof dealInputSchema.parse>;

    if (mode === "new") {
      const parsed = quickBusinessDealInputSchema.safeParse(input);
      if (!parsed.success) return invalid(parsed.error);
      const business = await createBusiness(client, {
        ...parsed.data.business,
        lifecycle_status: "prospect",
      });
      businessId = business.id;
      createdBusinessId = business.id;

      try {
        if (parsed.data.contact?.name) {
          const contact = await createContact(client, {
            business_id: business.id,
            name: parsed.data.contact.name,
            role: parsed.data.contact.role,
            email: parsed.data.contact.email,
            phone: parsed.data.contact.phone,
            is_primary: true,
          });
          contactId = contact.id;
          createdContactId = contact.id;
        }
      } catch (error) {
        await deleteBusiness(client, business.id);
        throw error;
      }
      dealData = { ...parsed.data, businessId, contactId };
    } else {
      const parsed = dealInputSchema.safeParse(input);
      if (!parsed.success) return invalid(parsed.error);
      dealData = parsed.data;
      businessId = parsed.data.businessId;
    }

    try {
      await createDeal(client, {
        business_id: businessId,
        contact_id: dealData.contactId,
        title: dealData.title,
        lead_source: dealData.leadSource,
        interested_service: dealData.interestedService,
        estimated_value: dealData.estimatedValue,
        responsible_user_id: dealData.responsibleUserId,
        stage: dealData.stage,
        next_action: dealData.nextAction,
        next_action_date: dealData.nextActionDate,
        last_interaction_date: new Date().toISOString().slice(0, 10),
        expected_close_date: dealData.expectedCloseDate,
        notes: dealData.notes,
      });
    } catch (error) {
      if (createdContactId) await deleteContact(client, createdContactId);
      if (createdBusinessId) await deleteBusiness(client, createdBusinessId);
      throw error;
    }

    refreshCrm(businessId);
    return { ok: true, message: "Oportunidade criada." };
  } catch (error) {
    return failure(error);
  }
}

export async function updateDealAction(id: string, input: DealInput): Promise<CrmActionResult> {
  const [idParsed, inputParsed] = [idSchema.safeParse(id), dealInputSchema.safeParse(input)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!inputParsed.success) return invalid(inputParsed.error);
  try {
    const client = await authorizedClient();
    await updateDeal(client, idParsed.data, {
      business_id: inputParsed.data.businessId,
      contact_id: inputParsed.data.contactId,
      title: inputParsed.data.title,
      lead_source: inputParsed.data.leadSource,
      interested_service: inputParsed.data.interestedService,
      estimated_value: inputParsed.data.estimatedValue,
      responsible_user_id: inputParsed.data.responsibleUserId,
      stage: inputParsed.data.stage,
      next_action: inputParsed.data.nextAction,
      next_action_date: inputParsed.data.nextActionDate,
      expected_close_date: inputParsed.data.expectedCloseDate,
      notes: inputParsed.data.notes,
    });
    refreshCrm(inputParsed.data.businessId);
    return { ok: true, message: "Oportunidade atualizada." };
  } catch (error) {
    return failure(error);
  }
}

export async function changeDealStageAction(id: string, stage: DealStage): Promise<CrmActionResult> {
  const [idParsed, stageParsed] = [idSchema.safeParse(id), dealStageSchema.safeParse(stage)];
  if (!idParsed.success) return invalid(idParsed.error);
  if (!stageParsed.success) return invalid(stageParsed.error);
  try {
    const client = await authorizedClient();
    const deal = await changeDealStage(client, idParsed.data, stageParsed.data);
    refreshCrm(deal.business_id);
    return {
      ok: true,
      message: stageParsed.data === "won" ? "Oportunidade ganha e Business convertido em cliente." : "Stage atualizado.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteDealAction(id: string): Promise<CrmActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const client = await authorizedClient();
    await deleteDeal(client, parsed.data);
    refreshCrm();
    return { ok: true, message: "Oportunidade eliminada." };
  } catch (error) {
    return failure(error);
  }
}
