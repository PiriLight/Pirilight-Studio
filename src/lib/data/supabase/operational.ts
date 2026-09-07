import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

export type OperationalDataClient = SupabaseClient<Database>;

type PublicTables = Database["public"]["Tables"];

export type AppUserRow = PublicTables["app_users"]["Row"];
export type BusinessRow = PublicTables["businesses"]["Row"];
export type BusinessInsert = PublicTables["businesses"]["Insert"];
export type BusinessUpdate = PublicTables["businesses"]["Update"];
export type ContactRow = PublicTables["contacts"]["Row"];
export type ContactInsert = PublicTables["contacts"]["Insert"];
export type ContactUpdate = PublicTables["contacts"]["Update"];
export type DealRow = PublicTables["deals"]["Row"];
export type DealInsert = PublicTables["deals"]["Insert"];
export type DealUpdate = PublicTables["deals"]["Update"];
export type ProjectRow = PublicTables["projects"]["Row"];
export type TaskRow = PublicTables["tasks"]["Row"];
export type GoalRow = PublicTables["goals"]["Row"];
export type GoalMilestoneRow = PublicTables["goal_milestones"]["Row"];

function assertData<T>(data: T | null, error: { message: string } | null, operation: string): T {
  if (error !== null) {
    throw new Error(`Supabase ${operation}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Supabase ${operation}: resposta sem dados`);
  }

  return data;
}

function assertNoError(error: { message: string } | null, operation: string): void {
  if (error !== null) {
    throw new Error(`Supabase ${operation}: ${error.message}`);
  }
}

export async function listActiveAppUsers(client: OperationalDataClient): Promise<AppUserRow[]> {
  const { data, error } = await client
    .from("app_users")
    .select("*")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  return assertData(data, error, "listActiveAppUsers");
}

export async function listBusinesses(client: OperationalDataClient): Promise<BusinessRow[]> {
  const { data, error } = await client
    .from("businesses")
    .select("*")
    .order("name", { ascending: true });

  return assertData(data, error, "listBusinesses");
}

export async function getBusiness(
  client: OperationalDataClient,
  id: string,
): Promise<BusinessRow | null> {
  const { data, error } = await client.from("businesses").select("*").eq("id", id).maybeSingle();
  if (error !== null) throw new Error(`Supabase getBusiness: ${error.message}`);
  return data;
}

export async function createBusiness(
  client: OperationalDataClient,
  input: BusinessInsert,
): Promise<BusinessRow> {
  const { data, error } = await client.from("businesses").insert(input).select("*").single();
  return assertData(data, error, "createBusiness");
}

export async function updateBusiness(
  client: OperationalDataClient,
  id: string,
  patch: BusinessUpdate,
): Promise<BusinessRow> {
  const { data, error } = await client
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return assertData(data, error, "updateBusiness");
}

export async function archiveBusiness(
  client: OperationalDataClient,
  id: string,
): Promise<BusinessRow> {
  return updateBusiness(client, id, { lifecycle_status: "inactive" });
}

export async function deleteBusiness(client: OperationalDataClient, id: string): Promise<void> {
  const { error } = await client.from("businesses").delete().eq("id", id);
  assertNoError(error, "deleteBusiness");
}

export async function listContactsForBusiness(
  client: OperationalDataClient,
  businessId: string,
): Promise<ContactRow[]> {
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("business_id", businessId)
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  return assertData(data, error, "listContactsForBusiness");
}

export async function listContacts(client: OperationalDataClient): Promise<ContactRow[]> {
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  return assertData(data, error, "listContacts");
}

export async function createContact(
  client: OperationalDataClient,
  input: ContactInsert,
): Promise<ContactRow> {
  const { data, error } = await client.from("contacts").insert(input).select("*").single();
  return assertData(data, error, "createContact");
}

export async function updateContact(
  client: OperationalDataClient,
  id: string,
  patch: ContactUpdate,
): Promise<ContactRow> {
  const { data, error } = await client
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  return assertData(data, error, "updateContact");
}

export async function setPrimaryContact(
  client: OperationalDataClient,
  businessId: string,
  contactId: string,
): Promise<void> {
  const { error } = await client.rpc("set_primary_contact", {
    p_business_id: businessId,
    p_contact_id: contactId,
  });
  assertNoError(error, "setPrimaryContact");
}

export async function deleteContact(client: OperationalDataClient, id: string): Promise<void> {
  const { error } = await client.from("contacts").delete().eq("id", id);
  assertNoError(error, "deleteContact");
}

export async function listDeals(client: OperationalDataClient): Promise<DealRow[]> {
  const { data, error } = await client
    .from("deals")
    .select("*")
    .order("updated_at", { ascending: false });

  return assertData(data, error, "listDeals");
}

export async function getDeal(client: OperationalDataClient, id: string): Promise<DealRow | null> {
  const { data, error } = await client.from("deals").select("*").eq("id", id).maybeSingle();
  if (error !== null) throw new Error(`Supabase getDeal: ${error.message}`);
  return data;
}

export async function listDealsForBusiness(
  client: OperationalDataClient,
  businessId: string,
): Promise<DealRow[]> {
  const { data, error } = await client
    .from("deals")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });

  return assertData(data, error, "listDealsForBusiness");
}

export async function createDeal(
  client: OperationalDataClient,
  input: DealInsert,
): Promise<DealRow> {
  const { data, error } = await client.from("deals").insert(input).select("*").single();
  return assertData(data, error, "createDeal");
}

export async function updateDeal(
  client: OperationalDataClient,
  id: string,
  patch: DealUpdate,
): Promise<DealRow> {
  const { data, error } = await client.from("deals").update(patch).eq("id", id).select("*").single();
  return assertData(data, error, "updateDeal");
}

export async function changeDealStage(
  client: OperationalDataClient,
  id: string,
  stage: DealRow["stage"],
): Promise<DealRow> {
  return updateDeal(client, id, { stage });
}

export async function deleteDeal(client: OperationalDataClient, id: string): Promise<void> {
  const { error } = await client.from("deals").delete().eq("id", id);
  assertNoError(error, "deleteDeal");
}

export async function listProjects(client: OperationalDataClient): Promise<ProjectRow[]> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  return assertData(data, error, "listProjects");
}

export async function listTasks(client: OperationalDataClient): Promise<TaskRow[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });

  return assertData(data, error, "listTasks");
}

export async function listGoals(client: OperationalDataClient): Promise<GoalRow[]> {
  const { data, error } = await client
    .from("goals")
    .select("*")
    .order("deadline", { ascending: true, nullsFirst: false });

  return assertData(data, error, "listGoals");
}

export async function listGoalMilestones(
  client: OperationalDataClient,
  goalId: string,
): Promise<GoalMilestoneRow[]> {
  const { data, error } = await client
    .from("goal_milestones")
    .select("*")
    .eq("goal_id", goalId)
    .order("sort_order", { ascending: true });

  return assertData(data, error, "listGoalMilestones");
}
