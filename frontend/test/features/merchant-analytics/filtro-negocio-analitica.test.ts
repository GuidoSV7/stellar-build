import { describe, expect, it } from "vitest";
import {
  agregarFilasMetricasNegocio,
  filtrarFilasMetricasPorNegocio,
} from "@/features/merchant-analytics/filtro-negocio-analitica";

const FILAS = [
  {
    businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    paymentCount: 2,
    volumeLamports: "1000",
  },
  {
    businessId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    paymentCount: 3,
    volumeLamports: "4000",
  },
];

describe("filtrarFilasMetricasPorNegocio", () => {
  it("sin id devuelve todas las filas", () => {
    expect(filtrarFilasMetricasPorNegocio(FILAS, undefined)).toEqual(FILAS);
    expect(filtrarFilasMetricasPorNegocio(FILAS, "")).toEqual(FILAS);
  });

  it("con id deja solo ese negocio", () => {
    expect(filtrarFilasMetricasPorNegocio(FILAS, FILAS[0].businessId)).toEqual([FILAS[0]]);
  });
});

describe("agregarFilasMetricasNegocio", () => {
  it("suma pagos y volumen de las filas dadas", () => {
    const r = agregarFilasMetricasNegocio(FILAS);
    expect(r.totalPagos).toBe(5);
    expect(r.volumenLamports).toBe(5000n);
    expect(r.negociosConActividad).toBe(2);
    expect(r.totalNegocios).toBe(2);
  });

  it("tras filtrar un negocio, el agregado es solo ese", () => {
    const r = agregarFilasMetricasNegocio(
      filtrarFilasMetricasPorNegocio(FILAS, FILAS[1].businessId),
    );
    expect(r.totalPagos).toBe(3);
    expect(r.volumenLamports).toBe(4000n);
    expect(r.totalNegocios).toBe(1);
  });
});
