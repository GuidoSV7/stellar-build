export type RolSesion = "admin" | "merchant";

export type UsuarioSesion = {
  id: string;
  fullName: string;
  email: string;
  role: RolSesion;
  country: string;
  walletAddress: string | null;
  isVerified?: boolean;
  isActive?: boolean;
};

export type DatosSesionBolivianpets = {
  token: string;
  user: UsuarioSesion;
};

const CLAVE_SESION = "bolivianpets_sesion_v1";

function normalizarEmail(email: string) {
  return email.trim().toLowerCase();
}

export function guardarSesionBolivianpets(datos: DatosSesionBolivianpets) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
  } catch {
    /* storage unavailable */
  }
}

export function obtenerSesionBolivianpets(): DatosSesionBolivianpets | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_SESION);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as DatosSesionBolivianpets;
    if (
      !datos?.token ||
      !datos?.user?.email ||
      (datos.user.role !== "admin" && datos.user.role !== "merchant")
    ) {
      return null;
    }
    return datos;
  } catch {
    return null;
  }
}

export function obtenerTokenSesion(): string | null {
  return obtenerSesionBolivianpets()?.token ?? null;
}

export function actualizarUsuarioEnSesion(usuario: UsuarioSesion) {
  const actual = obtenerSesionBolivianpets();
  if (!actual) return;
  guardarSesionBolivianpets({ token: actual.token, user: usuario });
}

export function cerrarSesion() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_SESION);
}

export function obtenerSesion(): { email: string; rol: RolSesion } | null {
  const s = obtenerSesionBolivianpets();
  if (!s) return null;
  return { email: normalizarEmail(s.user.email), rol: s.user.role };
}
