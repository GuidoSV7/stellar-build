"use client";

import { useEffect, useMemo, useState } from "react";
import estilosEncabezados from "../encabezados-seccion-dashboard.module.css";
import estilos from "./grafico-barras-ingresos.module.css";
import { obtenerTokenSesion } from "../../../demoAuth";
import {
  ErrorApiBolivianpets,
  obtenerSeriePagosAdmin,
  type PuntoSeriePagos,
} from "../../../_lib/apiBolivianpets";

function parseSol(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function etiquetaSemana(p: PuntoSeriePagos): string {
  const d = new Date(p.bucketStart);
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(d);
}

/** Barras: volumen SOL por semana (últimas 4) desde GET /admin/metrics/payments/timeseries */
export default function GraficoBarrasIngresos() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puntos, setPuntos] = useState<PuntoSeriePagos[]>([]);

  useEffect(() => {
    const token = obtenerTokenSesion();
    if (!token) {
      setCargando(false);
      setError("Sin sesión");
      return;
    }
    let cancelado = false;
    (async () => {
      try {
        const r = await obtenerSeriePagosAdmin(token, {
          groupBy: "week",
          buckets: 4,
        });
        if (cancelado) return;
        setPuntos(r.data);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof ErrorApiBolivianpets) setError(e.message);
        else setError("No se pudo cargar la serie.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const barras = useMemo(() => {
    if (puntos.length === 0) return [];
    const vols = puntos.map((p) => parseSol(p.volumeSol));
    const maxSol = Math.max(...vols, 1e-12);
    const maxIdx = vols.indexOf(Math.max(...vols));
    return puntos.map((p, i) => {
      const v = vols[i];
      const porcentaje = maxSol > 0 ? Math.max(4, (v / maxSol) * 100) : 4;
      return {
        clave: p.bucketStart,
        etiqueta: etiquetaSemana(p),
        porcentaje,
        valor: `${p.volumeSol} SOL`,
        destacada: i === maxIdx && v > 0,
      };
    });
  }, [puntos]);

  const tituloMes = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className={estilos.tarjetaGrafico}>
      <div className={estilos.cabeceraGrafico}>
        <div>
          <h2 className={estilosEncabezados.tituloSeccion}>Detalle de ingresos del mes</h2>
          <p className={estilosEncabezados.subtituloSeccion}>
            Volumen escrow por semana (últimas 4 semanas, API en vivo)
          </p>
        </div>
        <div className={estilos.navegacionMes}>
          <span className={estilos.etiquetaMes} style={{ textTransform: "capitalize" }}>
            {tituloMes}
          </span>
        </div>
      </div>
      {error ? (
        <p style={{ color: "var(--error, #b91c1c)", margin: "0 0 12px" }} role="alert">
          {error}
        </p>
      ) : null}
      <div className={estilos.areaBarras}>
        {cargando
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={estilos.columnaBarra}>
                <div className={estilos.pistaBarra}>
                  <div
                    className={estilos.rellenoBarra}
                    style={{ height: "20%", opacity: 0.35 }}
                  />
                </div>
                <span className={estilos.etiquetaSemana}>…</span>
              </div>
            ))
          : barras.map((s) => (
              <div key={s.clave} className={estilos.columnaBarra}>
                <div className={estilos.pistaBarra}>
                  <div
                    className={`${estilos.rellenoBarra} ${s.destacada ? estilos.rellenoBarraActiva : ""}`}
                    style={{ height: `${s.porcentaje}%` }}
                  />
                  <div className={estilos.tooltipBarra}>{s.valor}</div>
                </div>
                <span
                  className={`${estilos.etiquetaSemana} ${s.destacada ? estilos.etiquetaSemanaActiva : ""}`}
                >
                  {s.etiqueta}
                </span>
              </div>
            ))}
      </div>
    </section>
  );
}
