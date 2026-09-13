export type FilaMetricaNegocio = {
  businessId: string;
  paymentCount: number;
  volumeLamports: string;
};

export type AgregadoMetricasNegocio = {
  totalPagos: number;
  volumenLamports: bigint;
  negociosConActividad: number;
  totalNegocios: number;
};

/** Vacío / undefined = todos los negocios del comercio. */
export function filtrarFilasMetricasPorNegocio<T extends { businessId: string }>(
  filas: T[],
  negocioId: string | undefined,
): T[] {
  const id = negocioId?.trim();
  if (!id) return filas;
  return filas.filter((f) => f.businessId === id);
}

export function agregarFilasMetricasNegocio(
  filas: FilaMetricaNegocio[],
): AgregadoMetricasNegocio {
  let totalPagos = 0;
  let volumenLamports = 0n;
  for (const row of filas) {
    totalPagos += row.paymentCount;
    volumenLamports += BigInt(row.volumeLamports || "0");
  }
  return {
    totalPagos,
    volumenLamports,
    negociosConActividad: filas.filter((x) => x.paymentCount > 0).length,
    totalNegocios: filas.length,
  };
}
