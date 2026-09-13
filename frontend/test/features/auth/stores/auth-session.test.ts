/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  guardarSesionBolivianpets,
  obtenerSesionBolivianpets,
  cerrarSesion,
  obtenerTokenSesion,
  obtenerSesion,
} from "@/stores/auth-session";

describe("auth-session store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persiste y recupera token y usuario merchant", () => {
    guardarSesionBolivianpets({
      token: "jwt-abc",
      user: {
        id: "u1",
        fullName: "Demo",
        email: "Merchant@Test.App",
        role: "merchant",
        country: "Bolivia",
        walletAddress: "wallet1",
      },
    });

    const sesion = obtenerSesionBolivianpets();
    expect(sesion?.token).toBe("jwt-abc");
    expect(sesion?.user.email).toBe("Merchant@Test.App");
    expect(obtenerTokenSesion()).toBe("jwt-abc");
    expect(obtenerSesion()).toEqual({
      email: "merchant@test.app",
      rol: "merchant",
    });
  });

  it("devuelve null si el JSON en localStorage es inválido", () => {
    localStorage.setItem("bolivianpets_sesion_v1", "{not-json");
    expect(obtenerSesionBolivianpets()).toBeNull();
  });

  it("cerrarSesion elimina la clave", () => {
    guardarSesionBolivianpets({
      token: "t",
      user: {
        id: "1",
        fullName: "A",
        email: "a@test.app",
        role: "admin",
        country: "BO",
        walletAddress: null,
      },
    });
    cerrarSesion();
    expect(obtenerSesionBolivianpets()).toBeNull();
  });
});
