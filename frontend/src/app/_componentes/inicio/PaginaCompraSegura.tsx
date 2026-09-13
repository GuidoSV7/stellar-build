"use client";

import { useEffect, useState } from "react";
import estilosHome from "../../home.module.css";
import type { ModoModal } from "../autenticacion/tiposAuth";
import CabeceraCompraSegura from "./CabeceraCompraSegura";
import ContenidoLandingBolivianpets from "./ContenidoLandingBolivianpets";
import HeroCompraSegura from "./HeroCompraSegura";
import PieDePaginaCompraSegura from "./PieDePaginaCompraSegura";
import ModalAutenticacionDemo from "../autenticacion/ModalAutenticacionDemo";

// Home público BolivianPets y modal de login/registro contra el API.
export default function PaginaCompraSegura() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>("ingresar");

  const abrirModal = (modo: ModoModal) => {
    setModoModal(modo);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  // Tras cerrar sesión o volver al home, el scroll no debe quedar abajo del documento anterior.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <div className={estilosHome.contenedor}>
      <CabeceraCompraSegura onIniciarSesion={() => abrirModal("ingresar")} />

      <main id="inicio" className={estilosHome.main}>
        <HeroCompraSegura onEmpezarGratis={() => abrirModal("registrar")} />
        <ContenidoLandingBolivianpets onCrearCuentaGratis={() => abrirModal("registrar")} />
      </main>

      <PieDePaginaCompraSegura />

      <ModalAutenticacionDemo
        abierta={modalAbierto}
        modoInicial={modoModal}
        alCerrar={cerrarModal}
      />
    </div>
  );
}

