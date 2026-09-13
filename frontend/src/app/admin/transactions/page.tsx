"use client";

import CabeceraDashboard from "../_componentes/dashboard/CabeceraDashboard";
import TablaTransaccionesAdmin from "../_componentes/transacciones/TablaTransaccionesAdmin";
import TarjetasKpiTransacciones from "../_componentes/transacciones/TarjetasKpiTransacciones";
import { transaccionesOrdenadasReciente } from "../_datos/datosCuentasAdminDemo";

// Registro global de transacciones (demo) enlazado a clientes por id interno.
export default function PaginaTransactions() {
  const filas = transaccionesOrdenadasReciente();

  const exportarCsv = () => {
    const lineas = [
      "id,id_cliente,tipo,monto,activo,estado,fecha",
      ...filas.map(
        (t) =>
          `${t.id},${t.idCliente},${t.tipo},${t.monto},${t.activo},${t.estado},${t.fecha}`,
      ),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "compra-segura-transacciones.csv";
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <CabeceraDashboard
        alExportar={exportarCsv}
        titulo="Transacciones"
        subtitulo="Historial de pagos y estados de escrow en la red Solana (datos de demostracion)."
      />
      <TarjetasKpiTransacciones />
      <TablaTransaccionesAdmin
        filas={filas}
        mostrarColumnaCliente
        titulo="Registro de movimientos"
        subtitulo="Cada fila es un movimiento tipo pasarela; el cliente enlaza con la ficha en Clientes."
      />
    </>
  );
}
