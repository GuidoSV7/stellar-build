---
name: backend-security-rules
description: >
  Reglas y revisión de seguridad para backend NestJS/TypeScript (API REST con Drizzle ORM).
  Usar cuando se diseñen, escriban o revisen controllers, guards, DTOs, services o
  endpoints; cuando se manejen autorización/roles, validación de datos del cliente,
  precios/órdenes, pagos/recargas, balance/operaciones financieras, cupones,
  logging de seguridad, rate limiting o separación de endpoints público/usuario/admin.
  Disparar también ante cualquier "revísame este endpoint/controller/guard por seguridad"
  o "¿está bien protegido esto?". Para mapear hallazgos a categorías OWASP, combinar con
  la skill `owasp-top10`.
---

# Reglas de Seguridad — Backend NestJS

Guía operativa para escribir y revisar código backend seguro. Pensada para **NestJS +
Drizzle (u otro ORM parametrizado) + class-validator + JWT**. No es un PRD: son reglas accionables con el patrón
correcto, el antipatrón a evitar y el porqué.

## Principios (no negociables)

- **Nunca confiar en el cliente.** Toda validación crítica vive en el backend.
- **Defensa en profundidad.** DTO → Guard → Service → Base de datos.
- **Menor privilegio.** Cada endpoint y cada respuesta devuelven solo lo necesario.
- **Fail closed.** Ante la duda o el error, denegar.
- **Auditoría.** Registrar acciones críticas e intentos de abuso.
- **Una sola fuente de verdad para identidad/roles** (ver Convención base).

---

## Convención base (resuelve inconsistencias comunes)

Antes de aplicar las reglas, fija estas convenciones en todo el proyecto. La mayoría de
bugs de autorización vienen de no tenerlas.

**1. `roles` SIEMPRE es un array de enum, nunca un string.**

```typescript
export enum Role { USER = 'user', SUPPORT = 'support', CAJERO = 'cajero', ADMIN = 'admin', SUPERADMIN = 'superadmin' }

// req.user.roles: Role[]   ← siempre array
```

Helper único para chequear roles (no comparar strings sueltos en cada endpoint):

```typescript
export function hasRole(user: { roles: Role[] }, ...allowed: Role[]): boolean {
  return user.roles?.some((r) => allowed.includes(r)) ?? false;
}
```

> ❌ Antipatrón frecuente: `if (user.roles !== 'admin')` (trata el array como string) o
> `coupon.allowedRoles.includes(user.roles)` (compara un array contra un array, nunca
> matchea). Usa siempre `hasRole(...)` o `array.some(...)`.

**2. El dinero NO es `float`.** Usa enteros en centavos (`amountCents: number`) o columnas
`decimal/numeric` mapeadas a un tipo decimal. Comparar montos con `Math.abs(a-b) > 0.01`
es un parche, no una solución.

**3. Códigos HTTP correctos:** autenticación faltante → `401 Unauthorized`; autorización
denegada (autenticado pero sin permiso) → `403 Forbidden`; datos malformados → `400 Bad
Request`. Nunca uses `BadRequestException` para un fallo de permisos.

**4. Errores por excepción, no por `return { success: false }`.** Un patrón único en todo
el código. Un filtro global de excepciones traduce a la respuesta HTTP y **nunca** filtra
stack traces al cliente.

**5. Nunca devuelvas entidades crudas.** Mapea siempre a un DTO explícito (también en
admin). Devolver la entidad (`return user;`, `...entity`) filtra cualquier columna que
agregues después.

---

## 2.1 Autorización y control de acceso

### REGLA 1 — Proteger todos los endpoints con guards

`JwtAuthGuard` primero (popula `req.user`), `RolesGuard` después.

```typescript
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)        // ✅ orden correcto
@Roles(Role.ADMIN, Role.SUPERADMIN)
@ApiBearerAuth()
export class AdminUsersController {
  @Get()
  findAll(@Query() q: PaginationDto) { return this.usersService.findAllComplete(q); }
}
```

> Default seguro: aplica `JwtAuthGuard` global y marca lo abierto con `@PublicEndpoint()`.
> Así un endpoint nuevo nace protegido aunque olvides el decorador. (Mitiga BFLA / acceso
> a función no autorizada → OWASP API5:2023.)

### REGLA 2 — Validar propiedad del recurso (anti-IDOR/BOLA)

```typescript
@Get('balance-transactions/user/:userId')
@UseGuards(JwtAuthGuard)
async getUserTransactions(@Param('userId') userId: string, @GetUser() user: User) {
  if (userId !== user.id && !hasRole(user, Role.ADMIN, Role.SUPERADMIN)) {
    throw new ForbiddenException('Solo puedes ver tus propias transacciones');  // ✅ 403
  }
  return this.balanceTransactionsService.findByUser(userId);
}
```

> Mejor aún: encapsula esto en un guard/policy reutilizable (`OwnershipGuard`) para no
> repetir el chequeo en cada endpoint y no olvidarlo. (OWASP API1:2023 BOLA.)

### REGLA 3 — Operaciones críticas restringidas por rol

```typescript
@Patch(':id/balance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
async updateBalance(@Body() dto: UpdateBalanceDto, @GetUser() op: User) {
  if (dto.operation === 'set' && !hasRole(op, Role.SUPERADMIN)) {
    this.securityLogger.logSecurityEvent('BALANCE_SET_ATTEMPT_UNAUTHORIZED',
      { operatorId: op.id, roles: op.roles, operation: dto.operation }, 'high');
    throw new ForbiddenException('La operación "set" es solo para superadmin'); // ✅ 403, no 400
  }
  // ...
}
```

---

## 2.2 Validación de datos

### REGLA 4 — Validar TODO dato del cliente en múltiples capas

- **Capa 1 — DTO (class-validator):** estructura y tipos. `@IsInt() @Min() @Max() @IsUUID() @IsNumber()`.
- **Capa 2 — Guard de límites (`AmountLimitGuard`):** rangos de montos/cantidades por endpoint.
- **Capa 3 — Service de validación:** recalcula precios/totales desde BD, valida stock con locks, verifica pagos reales con el proveedor.
- **Capa 4 — Base de datos:** transacción atómica + bloqueo pesimista (`SELECT ... FOR UPDATE`), rollback ante cualquier fallo.

### REGLA 5 — Validar el monto del pago contra el total real de la orden

```typescript
async createOrderPaymentSession(orderId: string, userId: string, totalOverride?: number) {
  const order = await this.ordersRepository.findOne({ where: { id: orderId }, relations: ['user'] });
  if (!order) throw new NotFoundException();
  if (order.user.id !== userId) throw new ForbiddenException();           // propiedad

  if (totalOverride !== undefined && totalOverride !== order.totalCents) { // ✅ enteros, comparación exacta
    this.securityLogger.logSecurityEvent('PAYMENT_PRICE_MANIPULATION_ATTEMPT',
      { userId, orderId, expected: order.totalCents, provided: totalOverride }, 'critical');
    throw new BadRequestException('El monto no coincide con el total de la orden');
  }
  return this.createPaymentSession(order, order.totalCents);              // ✅ usa el total de BD
}
```

### REGLA 6 — DTOs con class-validator (y NO recibir lo que vas a recalcular)

```typescript
export class CreateOrderDto {
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
  // ❌ NO incluir `total`: el servidor lo recalcula (ver REGLA 7).
}

export class OrderItemDto {
  @IsUUID() priceId: string;
  @IsInt() @Min(1) @Max(1000) quantity: number;
  // ❌ NO incluir `price`: se obtiene de BD. Recibirlo invita a confiar en él.
}
```

`ValidationPipe` global (en `main.ts`), no por ruta:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true,
  transform: true, transformOptions: { enableImplicitConversion: false },
}));
```

---

## 2.3 Órdenes y recargas

### REGLA 7 — Recalcular precios y totales desde la BD (nunca del cliente)

Flujo: validar DTO → obtener precio REAL por `priceId` desde BD → calcular precio por tipo
de cliente → calcular subtotales/total **en el servidor** → reservar stock atómicamente →
crear orden con valores recalculados.

```typescript
for (const item of dto.items) {
  const dbPrice = await this.productPricesRepository.findOne({ where: { id: item.priceId } });
  if (!dbPrice || dbPrice.state !== 'active') throw new BadRequestException('Producto no disponible');
  item.unitPriceCents = await this.pricesService.finalPriceCents(dbPrice, this.customerType(user)); // ✅ de BD
}
const totalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);  // ✅ servidor
```

### REGLA 8 — Verificar pagos reales en recargas (anti-fraude / anti-doble-crédito)

1. Validar monto (rango permitido, decimales) → 2. Crear transacción `PENDING` →
3. Usuario paga con proveedor → 4. **Verificar firma del webhook** y/o consultar la API del
proveedor → 5. **Idempotencia**: bloquear por `providerPaymentId` único →
6. Acreditar bajo `SELECT FOR UPDATE` → 7. Marcar `COMPLETED` + auditar.

```typescript
// Idempotencia real: índice único en BD sobre providerPaymentId, no solo un check en memoria.
// Webhooks: verificar SIEMPRE la firma del proveedor antes de procesar.
if (!this.verifyWebhookSignature(rawBody, headers)) throw new ForbiddenException('Firma inválida');
const verified = await this.provider.getPayment(providerPaymentId); // monto REAL del proveedor
if (verified.amountCents !== tx.amountCents) throw new BadRequestException('Monto no coincide');
```

> No acredites nunca solo con datos que vienen del cliente o del frontend. El crédito ocurre
> exclusivamente en el servidor tras verificación con el proveedor.

---

## 2.4 Operaciones financieras

### REGLA 9 — Validar saldo con bloqueo de fila antes de descontar

```typescript
async payWithBalance(user: User, dto: PayWithBalanceDto) {
  const qr = this.dataSource.createQueryRunner();
  await qr.connect(); await qr.startTransaction();
  try {
    if (dto.totalCents <= 0) throw new BadRequestException('Total inválido');
    const locked = await qr.manager.createQueryBuilder(User, 'u')
      .setLock('pessimistic_write')                       // ✅ SELECT FOR UPDATE
      .where('u.id = :id', { id: user.id }).getOne();
    if ((locked.balanceCents ?? 0) < dto.totalCents) throw new BadRequestException('Saldo insuficiente');
    await qr.manager.update(User, user.id, { balanceCents: locked.balanceCents - dto.totalCents });
    await qr.commitTransaction();
    return { newBalanceCents: locked.balanceCents - dto.totalCents };
  } catch (e) { await qr.rollbackTransaction(); throw e; }
  finally { await qr.release(); }
}
```

### REGLA 10 — Transacciones atómicas para operaciones multi-paso

Crear orden + descontar stock + registrar movimiento = una sola transacción con
`commit/rollback`. Si falla cualquier paso, no queda estado inconsistente. (Para evitar
deadlocks, adquiere locks siempre en el mismo orden.)

---

## 2.5 Logging y auditoría

### REGLA 11–13 — Registrar acciones críticas e intentos de abuso

Eventos: `logSecurityEvent`, `logDataAccessAttempt`, `logAuthenticationFailure`,
`logConfigurationChange`, `logDataDeletion`, `logSuspiciousActivity`,
`logCouponValidationFailure`.

Severidad: `critical` (fraude financiero, manipulación de precios, doble crédito) ·
`high` (acceso no autorizado, cambios de balance/roles) · `medium` (validaciones fallidas
de cupones) · `low` (auditoría puntual).

**Qué registrar:** actor (id, rol), IP, User-Agent, timestamp, detalles, resultado.

> 🔒 **Nunca loguear:** contraseñas, hashes, JWTs/secrets completos, datos de tarjeta, el
> `X-Client-Secret`. Trunca/enmascara. **No** loguees a nivel `low` *todos* los accesos
> exitosos: eso es volumen y costo enorme → eso va a métricas/observabilidad, no al log de
> seguridad. (OWASP A09:2025 Logging & Alerting.)

---

## 2.6 Separación de endpoints por contexto

### REGLA 14 — Endpoints separados (no sanitizar en runtime)

```
/public/*   → @PublicEndpoint(), solo datos públicos (sin costos/márgenes/IDs internos)
/users/*    → JwtAuthGuard, recursos del propio usuario (me, me/orders, ...)
/cashier/*  → JwtAuthGuard + Role.CAJERO, acotado al userId del token
/admin/*    → JwtAuthGuard + RolesGuard + @Roles(ADMIN|SUPERADMIN)
```

Services con métodos separados por contexto y **mapeo explícito** siempre:

```typescript
async findAllPublic(): Promise<PublicProductDto[]> {
  const rows = await this.repo.find({
    where: { state: 'active' },
    select: ['id', 'name', 'description', 'image', 'category', 'state'], // ✅ sin campos internos
  });
  return rows.map(toPublicDto);          // ✅ mapeo explícito
}

async findAllComplete(): Promise<CompleteProductDto[]> {
  const rows = await this.repo.find({ relations: ['supplier', 'prices'] });
  return rows.map(toCompleteDto);        // ✅ también mapeo explícito, NO `return rows`
}
```

> ❌ Antipatrón: un solo endpoint con `?isPublic=true`, o sanitizar con `if (!isAdmin)`.
> Es fácil olvidar un campo nuevo y filtrarlo. Endpoints + DTOs separados = seguridad por
> diseño. (OWASP API3:2023 Broken Object Property Level Authorization / exposición de datos.)

> ⛔ **El DTO de admin NUNCA incluye `passwordHash` ni secretos.** Un hash de contraseña no
> se devuelve en ninguna respuesta de API, ni a superadmin. Tampoco `internalNotes` si no
> hay razón. Mapea solo lo que el caso de uso necesita.

### REGLA 15 — NO exigir `X-Client-Secret` a peticiones del frontend

El frontend autenticado usa **JWT**. El `X-Client-Secret` es solo para servicio→servicio y
**no debe** viajar desde el navegador (cualquiera lo ve en DevTools).

```typescript
canActivate(ctx: ExecutionContext) {
  if (this.isPublic(ctx)) return true;
  const req = ctx.switchToHttp().getRequest();

  // ✅ Si hay JWT, NO lo des por válido por la sola cabecera: deja que JwtAuthGuard lo valide.
  //    Este guard solo decide la VÍA (frontend con JWT vs servicio interno con secret).
  if (req.headers['authorization']?.startsWith('Bearer ')) return true;

  const provided = req.headers['x-client-secret'];
  if (!provided) throw new ForbiddenException('Se requiere JWT o X-Client-Secret');

  // ✅ comparación de tiempo constante (evita timing attacks)
  const a = Buffer.from(provided); const b = Buffer.from(this.clientSecret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new ForbiddenException('X-Client-Secret inválido');
  }
  return true;
}
```

> ⚠️ **Cuidado con el bypass:** si este guard retorna `true` solo por ver `Bearer ...`,
> asegúrate de que `JwtAuthGuard` corra SIEMPRE después y valide el token de verdad. La sola
> presencia de la cabecera NO autentica.

---

## 2.7 Cupones

### REGLA 16 — Validar restricciones Y límite de usos atómico

Valida rol (`hasRole`/`some`, no `includes(array)`), antigüedad de cuenta, compras previas.
Pero además: **límite de usos global y por usuario, con decremento atómico bajo lock**, o
dos usuarios canjean el último uso a la vez (race condition).

```typescript
if (coupon.allowedRoles?.length && !coupon.allowedRoles.some((r) => user.roles.includes(r))) {
  this.securityLogger.logSecurityEvent('COUPON_REDEEM_UNAUTHORIZED_ROLE',
    { userId: user.id, code, roles: user.roles }, 'medium');
  throw new ForbiddenException('Cupón no disponible para tu cuenta');
}
// + validar minAccountAgeDays, minPreviousPurchases
// + dentro de transacción: decrementar usos restantes con SELECT FOR UPDATE / UPDATE ... WHERE remaining > 0
```

---

## 2.8 Rate limiting

### REGLA 17 — Rate limiting distribuido en endpoints sensibles

Usa `@nestjs/throttler` con **storage Redis** (en memoria NO escala: con varias instancias
cada una cuenta por separado y el límite real se multiplica). Configura `trust proxy`
correctamente o falsifican el `X-Forwarded-For` (OWASP A04:2025 considera el consumo de
recursos no restringido).

| Endpoint | Límite sugerido |
|---|---|
| `POST /auth/login` | 5 / IP / 5 min |
| `POST /user/coupons/redeem` | 10 / usuario / hora |
| `PATCH /users/:id/balance` | 20 / usuario / hora |
| `POST /payments/.../create-session` | 5 / usuario / min |
| `POST /orders` | 10 / usuario / min |

---

## 2.9 Hardening de plataforma (faltaba en el PRD original)

- **Cabeceras:** `helmet()`, desactivar `x-powered-by` (`app.disable('x-powered-by')` o `app.getHttpAdapter()`), HSTS.
- **CORS restrictivo:** allowlist de orígenes, no `*` con credenciales.
- **Límite de payload:** `app.use(json({ limit: '100kb' }))` para evitar abuso.
- **JWT hardening:** expiración corta + refresh tokens; **fijar el algoritmo** (`algorithms: ['HS256'|'RS256']`) para evitar `alg:none`/confusión; validar `issuer`/`audience`; secreto fuerte y rotable. (OWASP A07:2025 Authentication Failures.)
- **Contraseñas:** hash con `bcrypt`/`argon2`. Nunca en texto plano, nunca en respuestas, nunca en logs.
- **Inyección:** usa siempre el query builder o API parametrizada del ORM (p. ej. Drizzle). Si usas SQL raw, parámetros posicionales; jamás concatenar input. (OWASP A05:2025 Injection.)
- **SSRF en llamadas a proveedores externos:** valida/allowlist las URLs de destino; no construyas la URL del proveedor con input del usuario. (OWASP A01:2025 ahora absorbe SSRF.)
- **Secretos:** en variables de entorno / secret manager, nunca hardcodeados; rotación.
- **Supply chain:** `npm audit`/`pnpm audit` en CI, lockfile commiteado, Dependabot/renovate. (OWASP A03:2025 Software Supply Chain Failures — categoría nueva.)
- **Manejo de errores:** filtro global de excepciones que devuelve mensajes genéricos y NUNCA stack traces ni detalles internos al cliente. (OWASP A10:2025 Mishandling of Exceptional Conditions — categoría nueva.)

---

## Checklist de revisión (usar en cada PR)

**Antes de crear un endpoint**
- [ ] ¿Contexto claro (public / user / cashier / admin) y bajo su prefijo?
- [ ] ¿`JwtAuthGuard` global + `@PublicEndpoint()` para abrir, no al revés?
- [ ] ¿Roles con `@Roles()` + `RolesGuard` y helper `hasRole`, sin comparar strings sueltos?
- [ ] ¿Se valida propiedad del recurso (anti-IDOR/BOLA)?
- [ ] ¿Rate limiting (distribuido) si es sensible?
- [ ] ¿DTO con class-validator y `ValidationPipe` global estricto?
- [ ] ¿El DTO NO recibe `total`/`price` que el servidor recalcula?
- [ ] ¿Precios y totales recalculados desde BD?
- [ ] ¿Dinero en centavos/decimal, no `float`?
- [ ] ¿Operaciones críticas con transacción + `SELECT FOR UPDATE`?
- [ ] ¿Saldo validado antes de descontar?
- [ ] ¿Pagos verificados con proveedor (+ firma de webhook + idempotencia)?
- [ ] ¿Acciones críticas auditadas con severidad correcta y SIN datos sensibles en el log?
- [ ] ¿Respuesta mapeada a DTO explícito (sin `passwordHash`, sin entidades crudas)?
- [ ] ¿Códigos HTTP correctos (401/403/400)?

**Antes de desplegar**
- [ ] `ClientSecretGuard` permite JWT sin exigir `X-Client-Secret`, con comparación de tiempo constante.
- [ ] `helmet`, CORS restrictivo, `x-powered-by` desactivado, límite de payload.
- [ ] JWT con algoritmo fijo, expiración corta, `iss`/`aud` validados.
- [ ] Sin secretos hardcodeados; `.env`/secret manager configurado.
- [ ] Filtro global de excepciones (sin stack traces al cliente).
- [ ] `npm audit` limpio / dependencias al día.

---

## Mapeo rápido a OWASP (ver skill `owasp-top10`)

| Regla | OWASP API 2023 | OWASP Web 2025 |
|---|---|---|
| 1, 3 (función) | API5 BFLA | A01 |
| 2, 5, 14 (propiedad) | API1 BOLA / API3 BOPLA | A01 |
| 4, 6, 7 (injection/validación) | — | A05 |
| 8 (pagos) | API6 flujos de negocio | A01/A04 |
| 11–13 (logging) | — | A09 |
| 15 (secret/JWT) | API2 / API8 | A02/A07 |
| 17 (rate limit) | API4 | A04 (recursos) |
| 2.9 supply chain | API10 | A03 |
| 2.9 errores | — | A10 |