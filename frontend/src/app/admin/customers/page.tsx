"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ErrorApiBolivianpets,
  listarUsuariosAdmin,
  type UsuarioBolivianpetsRespuesta,
} from "../../_lib/apiBolivianpets";
import { cerrarSesion, obtenerTokenSesion } from "../../demoAuth";
import CabeceraDashboard from "../_componentes/dashboard/CabeceraDashboard";
import TablaListaClientes from "../_componentes/clientes/TablaListaClientes";
import TarjetasKpiClientes from "../_componentes/clientes/TarjetasKpiClientes";
import ModalDetalleUsuarioAdmin from "../_componentes/clientes/ModalDetalleUsuarioAdmin";
import estilosLista from "../_componentes/clientes/lista-clientes.module.css";

const LIMITE_POR_PAGINA = 10;

// Solo comercios (merchant): GET /admin/users?role=merchant — sin cuentas admin.
export default function PaginaCustomers() {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioBolivianpetsRespuesta[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [idUsuarioModal, setIdUsuarioModal] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const token = obtenerTokenSesion();
    if (!token) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { usuarios: lista, total } = await listarUsuariosAdmin(token, pagina, LIMITE_POR_PAGINA, {
        role: "merchant",
      });
      setUsuarios(lista);
      setTotalRegistros(total);
    } catch (e) {
      if (e instanceof ErrorApiBolivianpets && e.codigoEstado === 401) {
        cerrarSesion();
        router.replace("/");
        return;
      }
      setError(e instanceof ErrorApiBolivianpets ? e.message : "No se pudo cargar el listado.");
      setUsuarios([]);
      setTotalRegistros(0);
    } finally {
      setCargando(false);
    }
  }, [pagina, router]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const usuariosFiltrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.walletAddress?.toLowerCase().includes(q) ?? false),
    );
  }, [consulta, usuarios]);

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / LIMITE_POR_PAGINA));

  const exportarCsv = () => {
    const lineas = [
      "id,fullName,email,role,country,walletAddress,isActive",
      ...usuariosFiltrados.map(
        (u) =>
          `${u.id},"${u.fullName.replace(/"/g, '""')}",${u.email},${u.role},${u.country},${u.walletAddress ?? ""},${u.isActive !== false}`,
      ),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "bolivianpets-usuarios-admin.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <CabeceraDashboard
        alExportar={exportarCsv}
        titulo="Clientes"
        subtitulo="Comercios (rol merchant). Las cuentas administrador no aparecen en este listado."
      />
      {error ? (
        <p style={{ marginBottom: 16, color: "#b91c1c", fontWeight: 700 }}>{error}</p>
      ) : null}
      <TarjetasKpiClientes totalRegistros={totalRegistros} usuariosPagina={usuarios} />
      <div className={estilosLista.barraHerramientas}>
        <input
          type="search"
          className={estilosLista.campoBusqueda}
          placeholder="Buscar por nombre, correo, ID o cartera…"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          aria-label="Buscar clientes"
        />
        <div className={estilosLista.barraPaginacion}>
          <button
            type="button"
            className={estilosLista.botonPagina}
            disabled={pagina <= 1 || cargando}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className={estilosLista.textoPagina}>
            Página {pagina} de {totalPaginas}
            {cargando ? " · Cargando…" : ""}
          </span>
          <button
            type="button"
            className={estilosLista.botonPagina}
            disabled={pagina >= totalPaginas || cargando}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
      <TablaListaClientes
        usuarios={usuariosFiltrados}
        onVerDetalle={(idUsuario) => setIdUsuarioModal(idUsuario)}
      />

      {idUsuarioModal ? (
        <ModalDetalleUsuarioAdmin
          abierta={true}
          idUsuario={idUsuarioModal}
          alCerrar={() => {
            setIdUsuarioModal(null);
            void cargar();
          }}
          alActualizarLista={() => void cargar()}
        />
      ) : null}
    </>
  );
}
