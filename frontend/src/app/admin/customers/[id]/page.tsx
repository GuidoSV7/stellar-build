"use client";

import { useParams } from "next/navigation";

import VistaDetalleUsuarioAdmin from "../../_componentes/clientes/VistaDetalleUsuarioAdmin";

// Detalle de usuario admin: GET /admin/users/:id y acciones PATCH / toggle-active.
export default function PaginaDetalleCliente() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  if (!id) {
    return <p style={{ fontWeight: 700 }}>ID no válido.</p>;
  }

  return <VistaDetalleUsuarioAdmin idUsuario={id} mostrarConfiguracion />;
}
