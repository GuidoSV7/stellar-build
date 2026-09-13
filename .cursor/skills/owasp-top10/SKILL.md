---
name: owasp-top10
description: >
  Referencia y checklist de OWASP Top 10:2025 (web) y OWASP API Security Top 10:2023,
  orientada a backend NestJS/TypeScript. Usar cuando se haga revisión de seguridad,
  threat modeling, clasificación de un hallazgo/vulnerabilidad, auditoría de un endpoint
  o controller, o cuando alguien pregunte "¿qué riesgo OWASP es esto?", "revísame por
  OWASP", o pida mitigaciones por categoría. Para reglas concretas de implementación en el
  código combinar con la skill `backend-security-rules`.
---

# OWASP Top 10 — Referencia de revisión (2025 / API 2023)

Dos listas, dos propósitos. Para una **API REST** (como un backend NestJS), la lista de
**API Security** suele ser más precisa; la de **Web** cubre el contexto general. Usa ambas.

> Estado: OWASP Top 10 **web** edición **2025** (anunciada nov-2025, final ene-2026; reemplaza
> a 2021). OWASP **API Security** Top 10 vigente **2023**. Verifica la fuente oficial si dudas:
> https://owasp.org/Top10/2025/ y https://owasp.org/www-project-api-security/.

Cómo usar esta skill al revisar código:
1. Para cada endpoint/flujo, recorre las dos tablas.
2. Marca la categoría que aplica y aplica la mitigación NestJS sugerida.
3. Reporta el hallazgo con su código (`A0x:2025` y/o `APIx:2023`) y la corrección.

---

## OWASP Top 10:2025 (Web) — qué cambió vs 2021

- **A01 sigue #1** (Broken Access Control) y ahora **absorbe SSRF** (antes A10:2021).
- **A02 Security Misconfiguration sube de #5 a #2** (config/cloud/contenedores).
- **A03 Software Supply Chain Failures**: NUEVA (expande "componentes vulnerables/desactualizados").
- A04 Cryptographic Failures baja a #4; A05 Injection baja a #5; A06 Insecure Design baja a #6.
- **A10 Mishandling of Exceptional Conditions**: NUEVA (manejo de errores, fail-open, condiciones anómalas).
- A09 renombrada a **Security Logging and Alerting Failures**.

### Tabla A0x:2025 → riesgo → mitigación NestJS

| # | Categoría | Qué es | Mitigación en NestJS |
|---|---|---|---|
| **A01** | Broken Access Control (incluye SSRF) | Saltarse autorización, IDOR, acceder a recursos/funciones ajenas, SSRF | Guards (`JwtAuthGuard`+`RolesGuard`), validar propiedad del recurso, deny-by-default global, allowlist de URLs salientes |
| **A02** | Security Misconfiguration | Defaults inseguros, debug en prod, cabeceras faltantes, buckets abiertos | `helmet`, CORS restrictivo, quitar `x-powered-by`, deshabilitar endpoints debug, IaC revisado |
| **A03** | Software Supply Chain Failures | Dependencias/build/registro comprometidos | `npm/pnpm audit` en CI, lockfile, Dependabot/renovate, fijar versiones, verificar integridad |
| **A04** | Cryptographic Failures | Datos sensibles sin cifrar, algoritmos débiles, TLS viejo | TLS ≥1.2, hash contraseñas con bcrypt/argon2, cifrar datos sensibles en reposo, secretos en vault |
| **A05** | Injection (SQL, NoSQL, XSS, command, LDAP) | Input no confiable interpretado como código/consulta | Queries parametrizadas (ORM/query builder), `ValidationPipe` estricto, escape de salida |
| **A06** | Insecure Design | Falta de threat modeling / controles por diseño | Diseñar límites y validaciones desde el inicio, patrones de defensa en profundidad |
| **A07** | Authentication Failures | Login débil, sesiones/JWT mal gestionados, brute force | JWT con algoritmo fijo + `iss`/`aud`, expiración corta + refresh, rate limit en login, MFA donde aplique |
| **A08** | Software or Data Integrity Failures | Updates/deserialización/pipeline sin verificar integridad | Verificar firmas, no deserializar input no confiable, proteger CI/CD |
| **A09** | Security Logging & Alerting Failures | No detectar ni alertar ataques | Loguear eventos críticos con severidad, alertar, NO loguear secretos, monitoreo |
| **A10** | Mishandling of Exceptional Conditions | Fail-open, errores mal manejados, estados no previstos | Filtro global de excepciones, fail-closed, sin stack traces al cliente, manejar timeouts |

---

## OWASP API Security Top 10:2023 (la más relevante para tu API)

| # | Categoría | Qué es | Mitigación en NestJS |
|---|---|---|---|
| **API1** | Broken Object Level Authorization (BOLA) | Acceder a objetos de otros por id (`/users/:id`) | Validar propiedad SIEMPRE: `recurso.userId === req.user.id` o rol admin; `OwnershipGuard` |
| **API2** | Broken Authentication | JWT/sesiones/credenciales mal implementadas | JWT robusto, no aceptar token por "estar presente", rate limit login, rotación de secretos |
| **API3** | Broken Object Property Level Authorization | Exponer/aceptar campos de más (excessive data exposure + mass assignment) | DTOs separados por contexto, `whitelist`+`forbidNonWhitelisted`, NUNCA devolver entidad cruda ni `passwordHash` |
| **API4** | Unrestricted Resource Consumption | Sin rate limit/paginación/límite de payload → DoS y coste | `@nestjs/throttler` (Redis), paginación obligatoria, límite de body, timeouts |
| **API5** | Broken Function Level Authorization (BFLA) | Usuario normal llega a funciones admin | `@Roles()`+`RolesGuard`, separar `/admin/*`, deny-by-default |
| **API6** | Unrestricted Access to Sensitive Business Flows | Abuso de flujos de negocio (compras, recargas, cupones) | Recalcular en servidor, idempotencia, límites por usuario, detección de abuso |
| **API7** | Server Side Request Forgery (SSRF) | El backend hace requests a URLs controladas por el atacante | Allowlist de hosts, no construir URL saliente con input del usuario, bloquear IPs internas |
| **API8** | Security Misconfiguration | Igual que A02 web, en contexto API | helmet/CORS/headers, sin debug en prod, errores genéricos |
| **API9** | Improper Inventory Management | Endpoints/versiones viejas o no documentadas expuestas | Inventario de endpoints, retirar versiones deprecadas, separar entornos, documentar (Swagger) |
| **API10** | Unsafe Consumption of APIs | Confiar ciegamente en respuestas de APIs de terceros | Validar/sanitizar respuestas de proveedores externos, verificar firmas, timeouts |

---

## Patrón de revisión por endpoint (aplicar mentalmente)

```
1. AUTENTICACIÓN  → ¿exige JWT válido? (A07/API2)
2. AUTORIZACIÓN
   - función      → ¿rol correcto? (A01/API5 BFLA)
   - objeto       → ¿es dueño del recurso? (A01/API1 BOLA)
   - propiedades  → ¿devuelve/acepta solo los campos permitidos? (A01/API3)
3. INPUT          → ¿DTO + ValidationPipe? ¿queries parametrizadas? (A05)
4. LÓGICA NEGOCIO → ¿recalcula en servidor? ¿idempotente? ¿límites? (API6)
5. RECURSOS       → ¿rate limit + paginación + límite de payload? (A04/API4)
6. SALIDAS EXT    → ¿allowlist de URLs? ¿valida respuesta del proveedor? (A01 SSRF/API7/API10)
7. CONFIG         → ¿helmet/CORS/headers/sin debug? (A02/API8)
8. ERRORES        → ¿fail-closed, sin stack trace al cliente? (A10)
9. LOGGING        → ¿audita lo crítico sin filtrar secretos? (A09)
10. SUPPLY CHAIN  → ¿deps auditadas/fijadas? (A03)
```

---

## Mitos a evitar
- "Es admin, puede ver todo" → ni admin debe ver `passwordHash`/secretos (A01/API3).
- "Tiene `Bearer ...`, está autenticado" → la cabecera no valida el token (A07/API2).
- "Valido en el frontend" → el cliente siempre es manipulable; valida en backend (A05/API6).
- "Rate limit en memoria basta" → no escala con varias instancias; usa storage compartido (A04/API4).
- "Uso `float` para dinero" → errores de redondeo; centavos/decimal (A04/integridad).

---

## Referencias oficiales
- OWASP Top 10:2025 — https://owasp.org/Top10/2025/
- OWASP API Security Top 10:2023 — https://owasp.org/www-project-api-security/
- OWASP Cheat Sheet Series — https://cheatsheetseries.owasp.org/
- OWASP ASVS (verificación) — https://owasp.org/www-project-application-security-verification-standard/