import Link from "next/link";

import {
  type TransaccionDemo,
  etiquetasTipoTransaccion,
  formatearFechaHoraDemo,
  obtenerNombreCliente,
} from "../../_datos/datosCuentasAdminDemo";
import estilos from "./tabla-transacciones-admin.module.css";

type Props = {
  filas: TransaccionDemo[];
  /** En el registro global mostramos a que cliente pertenece cada fila. */
  mostrarColumnaCliente?: boolean;
  titulo?: string;
  subtitulo?: string;
};

function clasePorEstado(estado: TransaccionDemo["estado"]) {
  switch (estado) {
    case "completado":
      return estilos.estadoCompletado;
    case "bloqueado":
      return estilos.estadoBloqueado;
    case "pendiente":
      return estilos.estadoPendiente;
    case "disputa":
      return estilos.estadoDisputa;
    default:
      return estilos.estadoPendiente;
  }
}

function etiquetaEstado(estado: TransaccionDemo["estado"]) {
  const mapa: Record<TransaccionDemo["estado"], string> = {
    completado: "Completado",
    bloqueado: "Bloqueado",
    pendiente: "Pendiente",
    disputa: "Disputa",
  };
  return mapa[estado];
}

// Tabla de movimientos (demo) alineada a la logica escrow / Solana del producto.
export default function TablaTransaccionesAdmin({
  filas,
  mostrarColumnaCliente = false,
  titulo = "Transacciones",
  subtitulo,
}: Props) {
  return (
    <section className={estilos.tarjetaTabla}>
      <div className={estilos.cabeceraSeccion}>
        <h2 className={estilos.tituloSeccion}>{titulo}</h2>
        {subtitulo ? <p className={estilos.subtituloSeccion}>{subtitulo}</p> : null}
      </div>
      {filas.length === 0 ? (
        <p className={estilos.vacio}>No hay transacciones para mostrar.</p>
      ) : (
        <div className={estilos.envoltorioTabla}>
          <table className={estilos.tabla}>
            <thead>
              <tr>
                <th>ID</th>
                {mostrarColumnaCliente ? <th>Cliente</th> : null}
                <th>Tipo</th>
                <th>Monto</th>
                <th>Activo</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td className={estilos.idTx}>{fila.id}</td>
                  {mostrarColumnaCliente ? (
                    <td className={estilos.celdaMuted}>
                      <Link className={estilos.enlaceCliente} href={`/admin/customers/${fila.idCliente}`}>
                        {obtenerNombreCliente(fila.idCliente)}
                      </Link>
                    </td>
                  ) : null}
                  <td className={estilos.celdaMuted}>{etiquetasTipoTransaccion[fila.tipo]}</td>
                  <td className={estilos.monto}>{fila.monto}</td>
                  <td>{fila.activo}</td>
                  <td>
                    <span className={`${estilos.pillEstado} ${clasePorEstado(fila.estado)}`}>
                      {etiquetaEstado(fila.estado)}
                    </span>
                  </td>
                  <td className={estilos.celdaMuted}>{formatearFechaHoraDemo(fila.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
