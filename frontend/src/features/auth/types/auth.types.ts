export type RolBolivianpetsApi = "admin" | "merchant";

export type UsuarioBolivianpetsRespuesta = {
  id: string;
  fullName: string;
  email: string;
  role: RolBolivianpetsApi;
  country: string;
  walletAddress: string | null;
  isVerified?: boolean;
  isActive?: boolean;
};

export type RespuestaLoginRegistro = {
  user: UsuarioBolivianpetsRespuesta;
  token: string;
};

export type ModoModal = "ingresar" | "registrar";
