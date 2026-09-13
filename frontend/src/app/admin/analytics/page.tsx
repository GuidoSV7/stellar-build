"use client";

import ContenidoAnaliticaCentral from "../_componentes/analytics/ContenidoAnaliticaCentral";
import CabeceraDashboard from "../_componentes/dashboard/CabeceraDashboard";
import TarjetasKpiDashboard from "../_componentes/dashboard/TarjetasKpiDashboard";

// Pagina Analitica: misma cabecera y KPIs que el panel; abajo graficos y tablas demo.
export default function PaginaAnalytics() {
  const exportarDatos = () => {
    const lineas = [
      "mes,ingresos_sol,transacciones,socios_activos,disputas",
      "Noviembre 2023,412850,1245,48,2",
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "compra-segura-analitica.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <CabeceraDashboard alExportar={exportarDatos} />
      <TarjetasKpiDashboard />
      <ContenidoAnaliticaCentral />
    </>
  );
}
