import { describe, expect, it } from "vitest";
import { enlaceExploradorTx } from "@/features/solana/enlace-explorador";

const FIRMA = "FakeSig11111111111111111111111111111111111111111111111111111111111";

describe("enlaceExploradorTx", () => {
  it("en mainnet no agrega cluster (Solscan default)", () => {
    expect(enlaceExploradorTx(FIRMA, "mainnet-beta")).toBe(
      `https://solscan.io/tx/${FIRMA}`,
    );
  });

  it("en devnet agrega ?cluster=devnet", () => {
    expect(enlaceExploradorTx(FIRMA, "devnet")).toBe(
      `https://solscan.io/tx/${FIRMA}?cluster=devnet`,
    );
  });

  it("en testnet agrega ?cluster=testnet", () => {
    expect(enlaceExploradorTx(FIRMA, "testnet")).toContain("cluster=testnet");
  });

  it("por defecto usa devnet (red actual de BolivianPets)", () => {
    expect(enlaceExploradorTx(FIRMA)).toContain("cluster=devnet");
  });
});
