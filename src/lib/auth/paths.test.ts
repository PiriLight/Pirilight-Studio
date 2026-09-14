import { describe, expect, it } from "vitest";

import { isPublicAuthPath, safeAuthCallbackPath, safeNextPath } from "./paths";

describe("safeNextPath", () => {
  it("preserva apenas destinos internos privados", () => {
    expect(safeNextPath("/tasks?view=open")).toBe("/tasks?view=open");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath("/\\example.com")).toBe("/");
    expect(safeNextPath("/login?next=/finance")).toBe("/");
  });
});

describe("isPublicAuthPath", () => {
  it("reconhece apenas as rotas públicas de autenticação", () => {
    expect(isPublicAuthPath("/forgot-password")).toBe(true);
    expect(isPublicAuthPath("/auth/callback")).toBe(true);
    expect(isPublicAuthPath("/finance")).toBe(false);
  });
});

describe("safeAuthCallbackPath", () => {
  it("permite apenas o destino público necessário à recuperação", () => {
    expect(safeAuthCallbackPath("/reset-password")).toBe("/reset-password");
    expect(safeAuthCallbackPath("https://example.com")).toBe("/");
    expect(safeAuthCallbackPath("/login")).toBe("/");
  });
});
