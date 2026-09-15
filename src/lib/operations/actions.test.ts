import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  create: vi.fn(),
  enabled: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({
  requireAuthorizedUser: mocks.auth,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
vi.mock("@/lib/operations/repository", () => ({
  operationsEnabled: mocks.enabled,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveOperation, deleteOperation } from "@/app/actions/operations";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "user" });
  mocks.enabled.mockReturnValue(true);
});
describe("operational write boundary", () => {
  it("rejects deletion without authorization or a valid version", async () => {
    const command = { kind: "task" as const, id: "00000000-0000-4000-8000-000000000001", version: "" };
    expect((await deleteOperation(command)).ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.auth.mockRejectedValue(new Error("redirect"));
    await expect(deleteOperation(command)).rejects.toThrow("redirect");
  });
  it.each([
    [{ data: null, error: { code: "23503" } }, false],
    [{ data: null, error: null }, false],
    [{ data: { id: "deleted" }, error: null }, true],
  ])("deletion handles dependencies, stale records and success: %j", async (response, success) => {
    const builder = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(response) };
    mocks.create.mockResolvedValue({ from: vi.fn().mockReturnValue(builder) });
    expect((await deleteOperation({ kind: "task", id: "00000000-0000-4000-8000-000000000001", version: "2026-09-15T10:00:00Z" })).ok).toBe(success);
    expect(builder.eq).toHaveBeenCalledWith("updated_at", "2026-09-15T10:00:00Z");
    expect(mocks.revalidate).toHaveBeenCalledTimes(success ? 1 : 0);
  });
  it("checks authorization before any DB mutation", async () => {
    mocks.auth.mockRejectedValue(new Error("redirect"));
    await expect(
      saveOperation({ kind: "client", values: { name: "A", notes: "" } }),
    ).rejects.toThrow("redirect");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("cannot write while the reviewed backend is not activated", async () => {
    mocks.enabled.mockReturnValue(false);
    expect((await saveOperation({ kind: "client", values: {} })).ok).toBe(
      false,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("validates data and requires a version for edits", async () => {
    expect(
      (await saveOperation({ kind: "client", values: { name: "", notes: "" } }))
        .ok,
    ).toBe(false);
    expect(
      (
        await saveOperation({
          kind: "client",
          id: "00000000-0000-4000-8000-000000000001",
          values: { name: "A", notes: "" },
        })
      ).ok,
    ).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns conflict instead of silently overwriting a newer record", async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mocks.create.mockResolvedValue({ from: vi.fn().mockReturnValue(builder) });
    const result = await saveOperation({
      kind: "client",
      id: "00000000-0000-4000-8000-000000000001",
      version: "2026-09-14T10:00:00Z",
      values: { name: "A", notes: "" },
    });
    expect(result.ok).toBe(false);
    expect(builder.eq).toHaveBeenCalledWith(
      "updated_at",
      "2026-09-14T10:00:00Z",
    );
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("writes only validated fields and refreshes dependent views after confirmed success", async () => {
    const builder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new" }, error: null }),
    };
    mocks.create.mockResolvedValue({ from: vi.fn().mockReturnValue(builder) });
    expect(
      await saveOperation({
        kind: "client",
        values: { name: " A ", notes: "", created_at: "forged" },
      }),
    ).toEqual({ ok: true, id: "new" });
    expect(builder.insert).toHaveBeenCalledWith({ name: "A", notes: "" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
});
