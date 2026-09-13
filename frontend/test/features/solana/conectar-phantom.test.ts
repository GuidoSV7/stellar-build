import { describe, expect, it } from "vitest";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  planearConexionPhantom,
  resolverCarteraPhantom,
} from "@/features/solana/conectar-phantom";

function cartera(name: string, readyState: WalletReadyState) {
  return { adapter: { name, readyState } };
}

describe("resolverCarteraPhantom", () => {
  it("prefiere Phantom en estado Installed sobre el adapter legacy Loadable", () => {
    const wallets = [
      cartera("Phantom", WalletReadyState.Loadable),
      cartera("Phantom", WalletReadyState.Installed),
    ];
    const hallada = resolverCarteraPhantom(wallets);
    expect(hallada?.adapter.readyState).toBe(WalletReadyState.Installed);
  });

  it("devuelve null si no hay Phantom", () => {
    expect(resolverCarteraPhantom([cartera("Solflare", WalletReadyState.Installed)])).toBeNull();
  });
});

describe("planearConexionPhantom", () => {
  it("desconecta si ya está conectado", () => {
    expect(
      planearConexionPhantom({ connected: true, nombrePhantom: "Phantom" }),
    ).toEqual({ tipo: "desconectar" });
  });

  it("pide instalar Phantom si no hay adapter", () => {
    expect(
      planearConexionPhantom({ connected: false, nombrePhantom: null }),
    ).toEqual({ tipo: "sin-phantom" });
  });

  it("selecciona y conecta con el nombre del adapter detectado", () => {
    expect(
      planearConexionPhantom({ connected: false, nombrePhantom: "Phantom" }),
    ).toEqual({ tipo: "seleccionar-y-conectar", nombre: "Phantom" });
  });
});
