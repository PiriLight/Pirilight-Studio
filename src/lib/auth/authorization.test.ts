import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { getAuthorization } from "./authorization";

const future = { data: null, error: { code: "PGRST303", message: "JWT issued at future" } };
const owner = { data: { user_id: "owner-id", display_name: "Owner", role: "owner" }, error: null };
function client() {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
  return { query, db: { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient };
}
beforeEach(() => { vi.useFakeTimers(); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("authorization timing recovery", () => {
  it("recovers only after the API accepts the token and returns an active owner", async () => {
    const { db, query } = client();
    query.maybeSingle.mockResolvedValueOnce(future).mockResolvedValueOnce(owner);
    const pending = getAuthorization(db, "owner-id", "owner@example.test");
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).status).toBe("authorized");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner-id");
    expect(console.error).not.toHaveBeenCalled();
  });
  it("remains unavailable after bounded retries", async () => {
    const { db, query } = client();
    query.maybeSingle.mockResolvedValue(future);
    const pending = getAuthorization(db, "owner-id", "");
    await vi.advanceTimersByTimeAsync(3000);
    expect((await pending).status).toBe("unavailable");
    expect(query.maybeSingle).toHaveBeenCalledTimes(3);
  });
  it("does not retry other JWT failures", async () => {
    const { db, query } = client();
    query.maybeSingle.mockResolvedValue({ data: null, error: { code: "PGRST303", message: "JWT expired" } });
    expect((await getAuthorization(db, "owner-id", "")).status).toBe("unavailable");
    expect(query.maybeSingle).toHaveBeenCalledTimes(1);
  });
  it("does not grant access when the retried lookup returns no active member", async () => {
    const { db, query } = client();
    query.maybeSingle.mockResolvedValueOnce(future).mockResolvedValueOnce({ data: null, error: null });
    const pending = getAuthorization(db, "owner-id", "");
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).status).toBe("unauthorized");
  });
});
