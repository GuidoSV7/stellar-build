import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe("merchant-businesses api barrel", () => {
  it("re-exporta funciones de negocios", async () => {
    const mod = await import("@/features/merchant-businesses/api");
    expect(typeof mod.obtenerNegociosCliente).toBe("function");
    expect(typeof mod.crearNegocioCliente).toBe("function");
  });
});
