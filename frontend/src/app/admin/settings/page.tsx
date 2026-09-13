"use client";

import CabeceraDashboard from "../_componentes/dashboard/CabeceraDashboard";
import SeccionComisionesAdmin from "../_componentes/settings/SeccionComisionesAdmin";

/** Configuración global de la plataforma (solo rol admin). */
export default function PaginaAdminSettings() {
  return (
    <>
      <CabeceraDashboard
        titulo="Configuración"
        subtitulo="Parámetros globales de BolivianPets (comisiones, etc.)"
        mostrarSelectorMes={false}
      />
      <div style={{ padding: "8px 0 32px" }}>
        <SeccionComisionesAdmin />
      </div>
    </>
  );
}
