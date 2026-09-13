import axios from "axios";
import {
  applyRequestAuthPolicy,
  mapApiResponseError,
} from "@/lib/api-auth-policy";
import { urlPublicaClienteBolivianpets } from "@/lib/origen-api-bolivianpets";

const api = axios.create({
  baseURL: urlPublicaClienteBolivianpets(),
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  applyRequestAuthPolicy(config);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(mapApiResponseError(error)),
);

export default api;

export function obtenerUrlBaseBolivianpets() {
  return api.defaults.baseURL ?? urlPublicaClienteBolivianpets();
}
