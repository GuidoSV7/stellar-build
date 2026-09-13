import { describe, expect, it } from "vitest";
import { solAStringLamports } from "@/features/merchant-qr/sol-a-lamports";

describe("solAStringLamports", () => {
  it("0.5 SOL son 500000000 lamports", () => {
    expect(solAStringLamports("0.5")).toBe("500000000");
  });

  it("acepta coma decimal", () => {
    expect(solAStringLamports("0,5")).toBe("500000000");
  });

  it("rechaza cero o inválido", () => {
    expect(solAStringLamports("0")).toBeNull();
    expect(solAStringLamports("abc")).toBeNull();
  });
});
