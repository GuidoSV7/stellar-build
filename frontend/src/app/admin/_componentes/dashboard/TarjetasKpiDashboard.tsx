"use client";

import { useEffect, useState } from "react";
import { estiloMascaraIcono } from "../../_utilidades/estiloMascaraIcono";
import estilosMascara from "../iconos-mascara.module.css";
import estilos from "./tarjetas-kpi-dashboard.module.css";
import { obtenerTokenSesion } from "../../../demoAuth";
import {
  ErrorApiBolivianpets,
  agregarMetricasMerchantsTodasLasPaginas,
} from "../../../_lib/apiBolivianpets";

/** KPIs reales desde GET /admin/metrics/merchants/payments (agregado en cliente). */
export default function TarjetasKpiDashboard() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volumenSol, setVolumenSol] = useState("—");
  const [totalPagos, setTotalPagos] = useState("—");
  const [merchants, setMerchants] = useState("—");
  const [comisionSol, setComisionSol] = useState("—");
  const [bps, setBps] = useState<number | null>(null);

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
        const agg = await agregarMetricasMerchantsTodasLasPaginas(token);
        if (cancelado) return;
        setVolumenSol(agg.volumenSol);
        setTotalPagos(String(agg.totalPagos));
        setMerchants(String(agg.totalMerchants));
        setComisionSol(agg.comisionSol);
        setBps(agg.commissionBps);
        setError(null);
      } catch (e) {
        if (cancelado) return;
        if (e instanceof ErrorApiBolivianpets) {
          setError(e.message);
        } else {
          setError("No se pudieron cargar las métricas.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const sub = cargando
    ? "…"
    : error
      ? "Error"
      : bps != null
        ? `Comisión ${(bps / 100).toFixed(2)}%`
        : "—";

  return (
    <section className={estilos.gridTarjetas} data-purpose="admin-dashboard-kpis">
      {error ? (
        <p
          className={estilos.nombreTarjeta}
          style={{ gridColumn: "1 / -1", color: "var(--error, #b91c1c)" }}
          role="alert"
        >
          Métricas: {error}
        </p>
      ) : null}

      <article className={estilos.tarjeta} data-tarjeta="volumen">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoIndigo}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={estiloMascaraIcono("/iconos/icon-money.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeInfo}`}>Escrow</span>
        </div>
        <p className={estilos.nombreTarjeta}>Volumen (pagos escrow)</p>
        <h3 className={estilos.valorTarjeta}>
          {cargando ? "…" : `${volumenSol} SOL`}
        </h3>
      </article>

      <article className={estilos.tarjeta} data-tarjeta="transacciones">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoAzul}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={estiloMascaraIcono("/iconos/icon-transacciones.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeInfo}`}>API</span>
        </div>
        <p className={estilos.nombreTarjeta}>Pagos (conteo)</p>
        <h3 className={estilos.valorTarjeta}>{cargando ? "…" : totalPagos}</h3>
      </article>

      <article className={estilos.tarjeta} data-tarjeta="socios">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoVioleta}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={estiloMascaraIcono("/iconos/icon-persona-unidas.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeInfo}`}>Merchants</span>
        </div>
        <p className={estilos.nombreTarjeta}>Cuentas merchant</p>
        <h3 className={estilos.valorTarjeta}>{cargando ? "…" : merchants}</h3>
      </article>

      <article className={estilos.tarjeta} data-tarjeta="comision">
        <div className={estilos.cabeceraTarjeta}>
          <div className={`${estilos.iconoTarjeta} ${estilos.iconoFondoRojo}`}>
            <span
              className={estilosMascara.mascaraIcono}
              style={estiloMascaraIcono("/iconos/icon-exclamation.svg")}
              aria-hidden
            />
          </div>
          <span className={`${estilos.badge} ${estilos.badgeExito}`}>{sub}</span>
        </div>
        <p className={estilos.nombreTarjeta}>Comisión estimada (plataforma)</p>
        <h3 className={estilos.valorTarjeta}>
          {cargando ? "…" : `${comisionSol} SOL`}
        </h3>
      </article>
    </section>
  );
}
