"use client";

import { useEffect, useRef, useState } from "react";
import type { PresetFiltroFecha, RangoIsoFiltroFecha } from "@/features/merchant-analytics/rango-filtro-fecha";
import {
  resolverRangoFiltroFecha,
  ymdLocal,
} from "@/features/merchant-analytics/rango-filtro-fecha";
import estilos from "./cabecera-dashboard.module.css";

type Props = {
  alCambiarRango?: (rango: RangoIsoFiltroFecha) => void;
};

const ATAJOS: Array<{ id: Exclude<PresetFiltroFecha, "calendario">; etiqueta: string }> = [
  { id: "hoy", etiqueta: "Hoy" },
  { id: "semana", etiqueta: "Semana" },
  { id: "mes", etiqueta: "Mes" },
];

export default function FiltroFechaAnalitica({ alCambiarRango }: Props) {
  const [preset, setPreset] = useState<PresetFiltroFecha>("hoy");
  const [ymd, setYmd] = useState(() => ymdLocal(new Date()));
  const alCambiarRef = useRef(alCambiarRango);
  alCambiarRef.current = alCambiarRango;

  useEffect(() => {
    const rango = resolverRangoFiltroFecha({
      preset,
      fechaCalendarioYmd: ymd,
      ahora: new Date(),
    });
    alCambiarRef.current?.(rango);
  }, [preset, ymd]);

  return (
    <div className={estilos.grupoFiltroFecha} role="group" aria-label="Filtro de período">
      <div className={estilos.atajosFecha}>
        {ATAJOS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={
              preset === a.id ? `${estilos.botonPreset} ${estilos.botonPresetActivo}` : estilos.botonPreset
            }
            aria-pressed={preset === a.id}
            onClick={() => {
              setPreset(a.id);
              if (a.id === "hoy") {
                setYmd(ymdLocal(new Date()));
              }
            }}
          >
            {a.etiqueta}
          </button>
        ))}
      </div>
      <label className={estilos.etiquetaCalendario}>
        <span className={estilos.textoSr}>Fecha en calendario</span>
        <input
          type="date"
          className={estilos.inputFecha}
          value={ymd}
          max={ymdLocal(new Date())}
          aria-label="Elegir fecha en calendario"
          onChange={(ev) => {
            const v = ev.target.value;
            if (!v) return;
            setYmd(v);
            setPreset("calendario");
          }}
        />
      </label>
    </div>
  );
}
