import { afterEach, describe, expect, it } from "vitest";
import {
  armarDestinoProxyApi,
  debeOmitirVerificacionTls,
  origenApiInterno,
  urlPublicaClienteBolivianpets,
} from "@/lib/origen-api-bolivianpets";

describe("urlPublicaClienteBolivianpets", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BOLIVIANPETS_API_URL;
  });

  it("usa el proxy same-origin si no hay env", () => {
    expect(urlPublicaClienteBolivianpets()).toBe("/bolivianpets-api");
  });

  it("no manda el browser a un host traefik.me (certificado default)", () => {
    process.env.NEXT_PUBLIC_BOLIVIANPETS_API_URL =
      "https://app-hack-bluetooth-monitor-38vpk4-c29fd3-187-127-17-128.traefik.me";
    expect(urlPublicaClienteBolivianpets()).toBe("/bolivianpets-api");
  });

  it("respeta localhost para desarrollo", () => {
    process.env.NEXT_PUBLIC_BOLIVIANPETS_API_URL = "http://localhost:3001/";
    expect(urlPublicaClienteBolivianpets()).toBe("http://localhost:3001");
  });
});

describe("origenApiInterno", () => {
  afterEach(() => {
    delete process.env.BOLIVIANPETS_API_INTERNAL_URL;
    delete process.env.NETLIFY;
    delete process.env.URL;
    delete process.env.SITE_NAME;
  });

  it("prioriza BOLIVIANPETS_API_INTERNAL_URL", () => {
    process.env.BOLIVIANPETS_API_INTERNAL_URL = "http://backend:3001/";
    expect(origenApiInterno()).toBe("http://backend:3001");
  });

  it("en Netlify usa el HTTPS público del API", () => {
    process.env.NETLIFY = "true";
    expect(origenApiInterno()).toContain("traefik.me");
    expect(origenApiInterno().startsWith("https://")).toBe(true);
  });

  it("detecta Netlify por URL aunque NETLIFY no sea true", () => {
    process.env.URL = "https://bolivianpetsbol.netlify.app";
    expect(origenApiInterno()).toContain("traefik.me");
  });
});

describe("armarDestinoProxyApi", () => {
  it("concatena ruta y query", () => {
    expect(
      armarDestinoProxyApi("https://api.example", ["auth", "login"], "?x=1"),
    ).toBe("https://api.example/auth/login?x=1");
  });
});

describe("debeOmitirVerificacionTls", () => {
  it("omite TLS solo en https de traefik.me", () => {
    expect(
      debeOmitirVerificacionTls(
        "https://app-hack-bluetooth-monitor-38vpk4-c29fd3-187-127-17-128.traefik.me/auth/login",
      ),
    ).toBe(true);
    expect(debeOmitirVerificacionTls("http://127.0.0.1:3001/auth/login")).toBe(
      false,
    );
  });
});
