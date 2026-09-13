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

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
    writable: true,
  });

  if (typeof globalThis.window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(globalThis.window, "localStorage", {
      value: memory,
      configurable: true,
      writable: true,
    });
  }
}

describe("auth-session store", () => {
  beforeEach(() => {
    installMemoryLocalStorage();
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
