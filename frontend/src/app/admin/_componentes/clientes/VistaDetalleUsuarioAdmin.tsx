"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ErrorApiBolivianpets,
  actualizarUsuarioAdmin,
  alternarActivoUsuarioAdmin,
  obtenerUsuarioAdminPorId,
  verificarUsuarioAdmin,
  type RolBolivianpetsApi,
  type UsuarioBolivianpetsRespuesta,
} from "../../../_lib/apiBolivianpets";
import { useNotificacion } from "../../../_componentes/ProveedorNotificaciones";
import { cerrarSesion, obtenerTokenSesion } from "../../../demoAuth";
import estilos from "./detalle-cliente.module.css";

type Props = {
  idUsuario: string;
  modoModal?: boolean;
  alActualizarLista?: () => void;
  mostrarConfiguracion?: boolean;
};

function claseActivo(activo: boolean | undefined) {
  if (activo === false) return estilos.estadoSuspendido;
  return estilos.estadoActivo;
}

function etiquetaActivo(activo: boolean | undefined) {
  if (activo === false) return "Inactivo";
  return "Activo";
}

function etiquetaRol(rol: RolBolivianpetsApi) {
  return rol === "admin" ? "Administrador" : "Comercio";
}

function etiquetaVerificado(verificado: boolean | undefined) {
  return verificado ? "Verificado" : "Sin verificar";
}

function textoBotonToggle(activo: boolean | undefined) {
  if (activo === false) return "Activar cuenta";
  return "Desactivar cuenta";
}

// Ficha de usuario con GET /admin/users/:id, PATCH de rol/activo y POST toggle-active.
export default function VistaDetalleUsuarioAdmin({
  idUsuario,
  modoModal = false,
  alActualizarLista,
  mostrarConfiguracion = false,
}: Props) {
  const { mostrarNotificacion } = useNotificacion();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioBolivianpetsRespuesta | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [rolEdit, setRolEdit] = useState<RolBolivianpetsApi>("merchant");
  const [correoEdit, setCorreoEdit] = useState("");
  const [paisEdit, setPaisEdit] = useState("");
  const [carteraEdit, setCarteraEdit] = useState("");
  const [activoEdit, setActivoEdit] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const aplicarUsuario = useCallback((u: UsuarioBolivianpetsRespuesta) => {
    setUsuario(u);
    setRolEdit(u.role);
    setCorreoEdit(u.email ?? "");
    setPaisEdit(u.country ?? "");
    setCarteraEdit(u.walletAddress ?? "");
    setActivoEdit(u.isActive !== false);
  }, []);

  const recargar = useCallback(async () => {
    const token = obtenerTokenSesion();
    if (!token || !idUsuario) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const u = await obtenerUsuarioAdminPorId(token, idUsuario);
      aplicarUsuario(u);
    } catch (e) {
      if (e instanceof ErrorApiBolivianpets && e.codigoEstado === 401) {
        cerrarSesion();
        router.replace("/");
        return;
      }
      const texto = e instanceof ErrorApiBolivianpets ? e.message : "No se pudo cargar el usuario.";
      setErrorCarga(texto);
      mostrarNotificacion(texto);
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, [aplicarUsuario, idUsuario, router, mostrarNotificacion]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const copiarCartera = useCallback(() => {
    if (usuario?.walletAddress) void navigator.clipboard.writeText(usuario.walletAddress);
  }, [usuario?.walletAddress]);

  const guardarCambios = useCallback(async () => {
    const token = obtenerTokenSesion();
    if (!token || !idUsuario) return;
    setGuardando(true);
    try {
      const actualizado = await actualizarUsuarioAdmin(token, idUsuario, {
        role: rolEdit,
        isActive: activoEdit,
        email: correoEdit,
        country: paisEdit,
        walletAddress: carteraEdit,
      });
      aplicarUsuario(actualizado);
      mostrarNotificacion("Cambios guardados.");
      alActualizarLista?.();
    } catch (e) {
      if (e instanceof ErrorApiBolivianpets && e.codigoEstado === 401) {
        cerrarSesion();
        router.replace("/");
        return;
      }
      mostrarNotificacion(e instanceof ErrorApiBolivianpets ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }, [
    activoEdit,
    aplicarUsuario,
    carteraEdit,
    correoEdit,
    idUsuario,
    paisEdit,
    rolEdit,
    router,
    alActualizarLista,
    mostrarNotificacion,
  ]);

  const ejecutarToggle = useCallback(async () => {
    const token = obtenerTokenSesion();
    if (!token || !idUsuario) return;
    setAlternando(true);
    try {
      const respuesta = await alternarActivoUsuarioAdmin(token, idUsuario);
      if (respuesta && typeof respuesta === "object" && "id" in respuesta) {
        aplicarUsuario(respuesta);
      } else {
        await recargar();
      }
      mostrarNotificacion("Estado actualizado correctamente.");
      alActualizarLista?.();
    } catch (e) {
      if (e instanceof ErrorApiBolivianpets && e.codigoEstado === 401) {
        cerrarSesion();
        router.replace("/");
        return;
      }
      mostrarNotificacion(e instanceof ErrorApiBolivianpets ? e.message : "No se pudo alternar el estado.");
    } finally {
      setAlternando(false);
    }
  }, [aplicarUsuario, idUsuario, recargar, router, alActualizarLista, mostrarNotificacion]);

  const ejecutarVerificar = useCallback(async () => {
    const token = obtenerTokenSesion();
    if (!token || !idUsuario) return;
    setVerificando(true);
    try {
      const respuesta = await verificarUsuarioAdmin(token, idUsuario);
      if (respuesta && typeof respuesta === "object" && "id" in respuesta) {
        aplicarUsuario(respuesta);
      } else {
        await recargar();
      }
      mostrarNotificacion("Usuario verificado correctamente.");
      alActualizarLista?.();
    } catch (e) {
      if (e instanceof ErrorApiBolivianpets && e.codigoEstado === 401) {
        cerrarSesion();
        router.replace("/");
        return;
      }
      mostrarNotificacion(e instanceof ErrorApiBolivianpets ? e.message : "No se pudo verificar el usuario.");
    } finally {
      setVerificando(false);
    }
  }, [aplicarUsuario, idUsuario, recargar, router, alActualizarLista, mostrarNotificacion]);

  if (cargando && !usuario) {
    return (
      <div>
        <p style={{ fontWeight: 700 }}>Cargando usuario…</p>
        {!modoModal ? (
          <Link
            href="/admin/customers"
            className={estilos.enlaceVolver}
            style={{ marginTop: 12, display: "inline-block" }}
          >
            ← Volver al listado
          </Link>
        ) : null}
      </div>
    );
  }

  if (errorCarga || !usuario) {
    return (
      <div>
        <p style={{ marginBottom: 16, fontWeight: 700 }}>
          {errorCarga ?? "No encontramos este usuario."}
        </p>
        {!modoModal ? (
          <Link href="/admin/customers" className={estilos.enlaceVolver}>
            ← Volver al listado
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {!modoModal ? (
        <div className={estilos.barraVolver}>
          <Link className={estilos.enlaceVolver} href="/admin/customers">
            ← Volver a clientes
          </Link>
        </div>
      ) : null}

      <section className={estilos.tarjetaFicha} aria-labelledby="titulo-usuario">
        <h1 id="titulo-usuario" className={estilos.tituloFicha}>
          {usuario.fullName}
        </h1>
        <p className={estilos.metaFicha}>
          <span className={`${estilos.pillEstado} ${claseActivo(usuario.isActive)}`}>
            {etiquetaActivo(usuario.isActive)}
          </span>
          {" · "}
          <span className={`${estilos.pillEstado} ${estilos.pillRol}`}>Rol actual: {etiquetaRol(usuario.role)}</span>
          {" · "}
          <span className={`${estilos.pillEstado} ${usuario.isVerified ? estilos.estadoActivo : estilos.estadoPendiente}`}>
            {etiquetaVerificado(usuario.isVerified)}
          </span>
        </p>

        <div className={estilos.gridDatos}>
          <div>
            <p className={estilos.etiquetaCampo}>Correo</p>
            {mostrarConfiguracion ? (
              <input
                id="correo-usuario"
                className={estilos.inputTexto}
                type="email"
                value={correoEdit}
                onChange={(e) => setCorreoEdit(e.target.value)}
                placeholder="correo@dominio.com"
              />
            ) : (
              <p className={estilos.valorCampo}>{usuario.email}</p>
            )}
          </div>
          <div>
            <p className={estilos.etiquetaCampo}>ID</p>
            <p className={estilos.valorCampo}>{usuario.id}</p>
          </div>
          <div>
            <p className={estilos.etiquetaCampo}>País</p>
            {mostrarConfiguracion ? (
              <input
                id="pais-usuario"
                className={estilos.inputTexto}
                value={paisEdit}
                onChange={(e) => setPaisEdit(e.target.value)}
                placeholder="País"
              />
            ) : (
              <p className={estilos.valorCampo}>{usuario.country}</p>
            )}
          </div>
          {mostrarConfiguracion ? (
            <div>
              <p className={estilos.etiquetaCampo}>Rol del usuario</p>
              <select
                id="rol-usuario"
                className={estilos.selectRol}
                value={rolEdit}
                onChange={(e) => setRolEdit(e.target.value as RolBolivianpetsApi)}
              >
                <option value="merchant">merchant</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ) : null}
          <div className={estilos.campoAncho}>
            <p className={estilos.etiquetaCampo}>Cartera Solana</p>
            {mostrarConfiguracion ? (
              <input
                id="cartera-usuario"
                className={estilos.inputTexto}
                value={carteraEdit}
                onChange={(e) => setCarteraEdit(e.target.value)}
                placeholder="Wallet (opcional)"
              />
            ) : usuario.walletAddress ? (
              <div className={estilos.filaCartera}>
                <span className={estilos.carteraCompleta}>{usuario.walletAddress}</span>
                <button type="button" className={estilos.botonCopiar} onClick={copiarCartera}>
                  Copiar
                </button>
              </div>
            ) : (
              <p className={estilos.valorCampo}>Sin vincular</p>
            )}
          </div>
        </div>

        {mostrarConfiguracion ? (
          <div className={estilos.formularioAdmin}>
            <div className={estilos.filaForm}>
              <label className={estilos.checkActivo}>
                <input type="checkbox" checked={activoEdit} onChange={(e) => setActivoEdit(e.target.checked)} />
                Cuenta activa
              </label>
            </div>
            <div className={estilos.filaBotonesAccion}>
              <button
                type="button"
                className={estilos.botonGuardar}
                disabled={guardando}
                onClick={() => void guardarCambios()}
              >
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                className={`${estilos.botonAlternar} ${
                  usuario.isActive === false ? estilos.botonActivar : estilos.botonDesactivar
                }`}
                disabled={alternando}
                onClick={() => void ejecutarToggle()}
              >
                {alternando ? "Procesando…" : textoBotonToggle(usuario.isActive)}
              </button>
              {usuario.isVerified !== true ? (
                <button
                  type="button"
                  className={estilos.botonVerificar}
                  disabled={verificando}
                  onClick={() => void ejecutarVerificar()}
                >
                  {verificando ? "Verificando…" : "Verificar usuario"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
