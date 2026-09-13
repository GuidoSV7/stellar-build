"use client";

import { useEffect } from "react";

import VistaDetalleUsuarioAdmin from "./VistaDetalleUsuarioAdmin";
import estilos from "./modal-detalle-usuario-admin.module.css";

type Props = Readonly<{
  abierta: boolean;
  idUsuario: string;
  alCerrar: () => void;
  alActualizarLista?: () => void;
}>;

export default function ModalDetalleUsuarioAdmin({ abierta, idUsuario, alCerrar, alActualizarLista }: Props) {
  useEffect(() => {
    if (!abierta) return;

    document.body.style.overflow = "hidden";
    const manejadorTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") alCerrar();
    };
    window.addEventListener("keydown", manejadorTeclado);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", manejadorTeclado);
    };
  }, [abierta, alCerrar]);

  if (!abierta) return null;

  return (
    <div
      className={estilos.modalFondo}
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar();
      }}
    >
      <div
        className={estilos.modalCaja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-detalle-usuario"
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className={estilos.modalBarra}>
          <h2 id="titulo-modal-detalle-usuario" className={estilos.modalTitulo}>
            Detalle de usuario
          </h2>
          <button type="button" className={estilos.botonCerrar} onClick={alCerrar} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className={estilos.contenido}>
          <VistaDetalleUsuarioAdmin
            idUsuario={idUsuario}
            modoModal
            alActualizarLista={alActualizarLista}
            mostrarConfiguracion
          />
        </div>
      </div>
    </div>
  );
}

