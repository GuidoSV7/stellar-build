"use client";

import type { RangoIsoFiltroFecha } from "@/features/merchant-analytics/rango-filtro-fecha";
import { estiloMascaraIcono } from "../../_utilidades/estiloMascaraIcono";
import estilosMascara from "../iconos-mascara.module.css";
import FiltroFechaAnalitica from "./FiltroFechaAnalitica";
import FiltroNegocioAnalitica from "./FiltroNegocioAnalitica";
import estilos from "./cabecera-dashboard.module.css";

// Cabecera del panel: titulo, filtro de período y opcionalmente exportar CSV.
type Props = {
  /** Si se omite, no se muestra el boton de exportar. */
  alExportar?: () => void;
  /** Deshabilita el botón mientras se genera el CSV (p. ej. analítica comercio). */
  exportandoCsv?: boolean;
  titulo?: string;
  subtitulo?: string;
  /** Si es false, oculta el filtro de fechas (p. ej. Configuracion). */
  mostrarSelectorMes?: boolean;
  alCambiarRangoFecha?: (rango: RangoIsoFiltroFecha) => void;
  mostrarFiltroNegocio?: boolean;
  negocioId?: string;
  alCambiarNegocioId?: (negocioId: string) => void;
};

export default function CabeceraDashboard({
  alExportar,
  exportandoCsv = false,
  titulo = "Rendimiento del negocio",
  subtitulo = "Filtrá por hoy, semana, mes o calendario",
  mostrarSelectorMes = true,
  alCambiarRangoFecha,
  mostrarFiltroNegocio = false,
  negocioId = "",
  alCambiarNegocioId,
}: Props) {
  const mostrarExportar = typeof alExportar === "function";
  return (
    <header className={estilos.cabeceraPrincipal}>
      <div>
        <h1 className={estilos.tituloPrincipal}>{titulo}</h1>
        <p className={estilos.subtituloPrincipal}>{subtitulo}</p>
      </div>
      <div className={estilos.accionesCabecera}>
        {mostrarSelectorMes ? (
          <FiltroFechaAnalitica alCambiarRango={alCambiarRangoFecha} />
        ) : null}
        {mostrarFiltroNegocio ? (
          <FiltroNegocioAnalitica valor={negocioId} alCambiar={alCambiarNegocioId ?? (() => undefined)} />
        ) : null}
        {mostrarExportar ? (
          <button
            type="button"
            className={estilos.botonExportar}
            onClick={alExportar}
            disabled={exportandoCsv}
          >
            <span
              className={estilosMascara.iconoExportarMascara}
              style={estiloMascaraIcono("/file.svg")}
              aria-hidden
            />
            {exportandoCsv ? "Exportando…" : "Exportar datos"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
