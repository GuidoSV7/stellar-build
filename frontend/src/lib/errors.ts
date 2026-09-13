export type ApiErrorBody = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export class BolivianpetsApiError extends Error {
  codigoEstado: number;
  cuerpo: unknown;

  constructor(mensaje: string, codigoEstado: number, cuerpo: unknown) {
    super(mensaje);
    this.name = "BolivianpetsApiError";
    this.codigoEstado = codigoEstado;
    this.cuerpo = cuerpo;
  }
}

export function asBolivianpetsApiError(error: unknown): BolivianpetsApiError {
  if (error instanceof BolivianpetsApiError) return error;
  if (error instanceof Error) {
    const ext = error as Error & { codigoEstado?: number; cuerpo?: unknown };
    return new BolivianpetsApiError(
      error.message,
      ext.codigoEstado ?? 0,
      ext.cuerpo ?? null,
    );
  }
  return new BolivianpetsApiError(String(error), 0, null);
}
