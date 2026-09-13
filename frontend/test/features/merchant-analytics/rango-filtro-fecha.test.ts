import { describe, expect, it } from "vitest";
import {
  finDelDiaLocal,
  inicioDelDiaLocal,
  resolverRangoFiltroFecha,
  ymdLocal,
} from "@/features/merchant-analytics/rango-filtro-fecha";

/** Reloj fijo: 24 ago 2026 15:30 hora local (no UTC). */
const AHORA = new Date(2026, 7, 24, 15, 30, 0, 0);

describe("ymdLocal", () => {
  it("formatea el día calendario local como YYYY-MM-DD", () => {
    expect(ymdLocal(AHORA)).toBe("2026-08-24");
  });
});

describe("resolverRangoFiltroFecha", () => {
  it("hoy cubre desde el inicio hasta el fin del día local", () => {
    const r = resolverRangoFiltroFecha({
      preset: "hoy",
      fechaCalendarioYmd: "2026-08-24",
      ahora: AHORA,
    });
    expect(new Date(r.from).getTime()).toBe(inicioDelDiaLocal(AHORA).getTime());
    expect(new Date(r.to).getTime()).toBe(finDelDiaLocal(AHORA).getTime());
  });

  it("semana cubre 7 días inclusive hoy", () => {
    const r = resolverRangoFiltroFecha({
      preset: "semana",
      fechaCalendarioYmd: "2026-08-24",
      ahora: AHORA,
    });
    const inicio = inicioDelDiaLocal(new Date(2026, 7, 18));
    expect(new Date(r.from).getTime()).toBe(inicio.getTime());
    expect(new Date(r.to).getTime()).toBe(finDelDiaLocal(AHORA).getTime());
  });

  it("mes cubre desde el día 1 del mes local hasta el fin de hoy", () => {
    const r = resolverRangoFiltroFecha({
      preset: "mes",
      fechaCalendarioYmd: "2026-08-24",
      ahora: AHORA,
    });
    const inicio = inicioDelDiaLocal(new Date(2026, 7, 1));
    expect(new Date(r.from).getTime()).toBe(inicio.getTime());
    expect(new Date(r.to).getTime()).toBe(finDelDiaLocal(AHORA).getTime());
  });

  it("calendario cubre solo el día elegido", () => {
    const r = resolverRangoFiltroFecha({
      preset: "calendario",
      fechaCalendarioYmd: "2026-01-05",
      ahora: AHORA,
    });
    const dia = new Date(2026, 0, 5, 12, 0, 0);
    expect(new Date(r.from).getTime()).toBe(inicioDelDiaLocal(dia).getTime());
    expect(new Date(r.to).getTime()).toBe(finDelDiaLocal(dia).getTime());
  });

  it("emite ISO-8601 con offset de zona (no Z suelto sin offset)", () => {
    const r = resolverRangoFiltroFecha({
      preset: "hoy",
      fechaCalendarioYmd: "2026-08-24",
      ahora: AHORA,
    });
    expect(r.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    expect(r.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
  });
});
