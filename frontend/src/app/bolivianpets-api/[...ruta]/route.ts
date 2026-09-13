import { NextRequest, NextResponse } from "next/server";
import { Agent, fetch as fetchUndici } from "undici";
import {
  armarDestinoProxyApi,
  debeOmitirVerificacionTls,
  origenApiInterno,
} from "@/lib/origen-api-bolivianpets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENCABEZADOS_HOP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type Ctx = { params: Promise<{ ruta: string[] }> };

async function reenviar(req: NextRequest, segmentos: string[]) {
  const destino = armarDestinoProxyApi(
    origenApiInterno(),
    segmentos,
    req.nextUrl.search,
  );
  const encabezados = new Headers();
  req.headers.forEach((valor, clave) => {
    if (!ENCABEZADOS_HOP.has(clave.toLowerCase())) {
      encabezados.set(clave, valor);
    }
  });

  const init: Parameters<typeof fetchUndici>[1] = {
    method: req.method,
    headers: encabezados,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Buffer.from(await req.arrayBuffer());
  }
  if (debeOmitirVerificacionTls(destino)) {
    init.dispatcher = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  try {
    const res = await fetchUndici(destino, init);
    const salida = new Headers();
    res.headers.forEach((valor, clave) => {
      if (!ENCABEZADOS_HOP.has(clave.toLowerCase())) {
        salida.set(clave, valor);
      }
    });
    return new NextResponse(Buffer.from(await res.arrayBuffer()), {
      status: res.status,
      headers: salida,
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "error desconocido";
    return NextResponse.json(
      { message: "Proxy BolivianPets no pudo alcanzar el API", detalle },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return reenviar(req, (await ctx.params).ruta ?? []);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return reenviar(req, (await ctx.params).ruta ?? []);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return reenviar(req, (await ctx.params).ruta ?? []);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return reenviar(req, (await ctx.params).ruta ?? []);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return reenviar(req, (await ctx.params).ruta ?? []);
}
export async function OPTIONS(req: NextRequest, ctx: Ctx) {
  return reenviar(req, (await ctx.params).ruta ?? []);
}
