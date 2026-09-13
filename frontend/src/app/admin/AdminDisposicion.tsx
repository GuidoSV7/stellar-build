// Layout para todo el area `/admin` (barra lateral + contenido).
// Solo entra sesión con rol API `admin`; iconos en `public/iconos`.
"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { cerrarSesion, obtenerSesionBolivianpets } from "../demoAuth";
import { estiloMascaraIcono } from "./_utilidades/estiloMascaraIcono";
import estilos from "./estilos-administracion.module.css";

type OpcionAdmin = {
  ruta: string;
  etiqueta: string;
  iconoSrc: string;
  esPanel?: boolean;
};

const opcionesAdmin: OpcionAdmin[] = [
  { ruta: "/admin", etiqueta: "Panel", iconoSrc: "/iconos/icon-dashboard.svg", esPanel: true },
  // { ruta: "/admin/analytics", etiqueta: "Analítica", iconoSrc: "/iconos/icon-analytics.svg" },
  { ruta: "/admin/transactions", etiqueta: "Transacciones", iconoSrc: "/iconos/icon-transacciones.svg" },
  { ruta: "/admin/customers", etiqueta: "Clientes", iconoSrc: "/iconos/icon-usuarios.svg" },
  { ruta: "/admin/settings", etiqueta: "Configuración", iconoSrc: "/iconos/icon-settings.svg" },
];

export default function AdminDisposicion({ children }: Readonly<{ children: ReactNode }>) {
  const rutaActual = usePathname();
  const router = useRouter();
  const [sesionLista, setSesionLista] = useState(false);

  useEffect(() => {
    const datos = obtenerSesionBolivianpets();
    if (!datos) {
      router.replace("/");
      return;
    }
    if (datos.user.role !== "admin") {
      router.replace("/");
      return;
    }
    setSesionLista(true);
  }, [router]);

  useLayoutEffect(() => {
    if (!sesionLista) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [sesionLista]);

  const cerrarSesionYSalir = () => {
    cerrarSesion();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    router.push("/");
  };

  const esActivo = (opcion: OpcionAdmin) => {
    if (opcion.esPanel) return rutaActual === "/admin";
    return rutaActual?.startsWith(opcion.ruta) ?? false;
  };

  useEffect(() => {
    const activo = document.activeElement;
    if (activo instanceof HTMLElement && activo.closest('[data-purpose="admin-sidebar"]')) {
      activo.blur();
    }
  }, [rutaActual]);

  if (!sesionLista) {
    return (
      <div className={estilos.contenedor} style={{ padding: 28, fontWeight: 700 }}>
        Comprobando sesión…
      </div>
    );
  }

  return (
    <div className={estilos.contenedor}>
      <aside className={estilos.barra} data-purpose="admin-sidebar">
        <div className={estilos.barraCabecera}>
          <div className={estilos.encabezadoMarca}>
            <Image
              className={estilos.logoSolana}
              src="/imagenes/logo1-solana.png"
              alt="Solana"
              width={40}
              height={40}
              priority
            />
            <div className={estilos.marcaTexto}>
              <h2 className={estilos.titulo}>BolivianPets</h2>
              <div className={estilos.subtitulo}>Panel de administración</div>
            </div>
          </div>
        </div>

        <nav
          className={`${estilos.navegacion} ${estilos.barraNavScroll}`}
          aria-label="Secciones de administración"
        >
          {opcionesAdmin.map((opcion) => (
            <Link
              key={opcion.ruta}
              href={opcion.ruta}
              scroll
              className={`${estilos.enlace} ${esActivo(opcion) ? estilos.enlacePrincipal : ""}`}
            >
              <span
                className={estilos.mascaraIconoNav}
                style={estiloMascaraIcono(opcion.iconoSrc)}
                aria-hidden
              />
              <span className={estilos.etiquetaEnlace}>{opcion.etiqueta}</span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className={estilos.botonLogout}
          onClick={cerrarSesionYSalir}
          data-purpose="admin-logout-trigger"
        >
          <span
            className={estilos.mascaraIconoNav}
            style={estiloMascaraIcono("/iconos/icon-cerrar-sesion.svg")}
            aria-hidden
          />
          <span className={estilos.textoLogout}>Cerrar sesión</span>
        </button>
      </aside>

      <main className={estilos.contenido} data-purpose="admin-main">
        {children}
      </main>
    </div>
  );
}
