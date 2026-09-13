export type CuerpoErrorApi = {
  message?: string;
  error?: string;
  statusCode?: number;
};

export class ErrorApiBolivianpets extends Error {
  codigoEstado: number;
  cuerpo: unknown;

  constructor(mensaje: string, codigoEstado: number, cuerpo: unknown) {
    super(mensaje);
    this.name = "ErrorApiBolivianpets";
    this.codigoEstado = codigoEstado;
    this.cuerpo = cuerpo;
  }
}

export function asErrorApiBolivianpets(error: unknown): ErrorApiBolivianpets {
  if (error instanceof ErrorApiBolivianpets) return error;
  if (error instanceof Error) {
    const ext = error as Error & { codigoEstado?: number; cuerpo?: unknown };
    return new ErrorApiBolivianpets(
      error.message,
      ext.codigoEstado ?? 0,
      ext.cuerpo ?? null,
    );
  }
  return new ErrorApiBolivianpets(String(error), 0, null);
}
