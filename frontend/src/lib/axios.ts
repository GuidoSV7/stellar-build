import axios from "axios";
import {
  applyRequestAuthPolicy,
  mapApiResponseError,
} from "@/lib/api-auth-policy";
import { bolivianpetsPublicClientUrl } from "@/lib/bolivianpets-api-origin";

const api = axios.create({
  baseURL: bolivianpetsPublicClientUrl(),
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

export function getBolivianpetsBaseUrl() {
  return api.defaults.baseURL ?? bolivianpetsPublicClientUrl();
}
