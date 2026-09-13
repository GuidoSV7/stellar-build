---
name: logging
description: >
  Skill de logging estructurado para el backend (Node.js, con NestJS como
  stack principal). Usar cuando el usuario pida agregar logs a su API/
  servicio, elegir entre el Logger built-in de NestJS y Pino/Winston,
  definir niveles de log (log/info/warn/error/debug), agregar timestamp y
  nombre de servicio a los logs, loguear excepciones de forma centralizada
  (exception filters), medir duración de requests, correlacionar logs de
  un mismo request (correlation id / request id), redactar datos
  sensibles, o mandar logs a un agregador centralizado (Datadog, ELK,
  Loki, CloudWatch).
---

# Logging estructurado — Backend (NestJS)

Guía para implementar logs de backend útiles para debuggear en
producción: qué campos debe tener cada log, qué niveles usar, cómo
loguear excepciones y requests de forma centralizada, y cómo hacerlo en
NestJS específicamente (que es el stack principal). Los mismos principios
aplican a cualquier backend Node.js (Express/Fastify puro) — se indica
dónde cambia la implementación.

## 0. Principio central: logging estructurado, no `console.log`

`console.log` está bien en desarrollo local, pero en producción es
insuficiente: no tiene niveles, no es parseable de forma confiable, y en
Node.js escribe a stdout de forma **síncrona** (puede bloquear el event
loop bajo carga). La práctica estándar en 2026 es que cada log sea un
objeto **JSON estructurado**, no una línea de texto libre:

```
❌ "User 12345 failed to login after 3 attempts"
✅ { "timestamp": "...", "level": "warn", "service": "auth-service",
     "event": "login_failed", "userId": "12345", "attemptCount": 3 }
```
El JSON se puede filtrar, agregar y buscar por campo exacto en cualquier
herramienta de observabilidad, sin depender de regex frágiles. El propio
Logger built-in de NestJS escribe texto plano legible por humanos pero
**no estructurado** — es el motivo principal para reemplazarlo en
producción (ver sección 2).

## 1. Campos obligatorios en cada log

| Campo | Ejemplo | Por qué |
|---|---|---|
| `timestamp` | `2026-07-01T14:30:00.123Z` | ISO 8601, **siempre en UTC**. Sin esto no podés ordenar ni correlacionar eventos entre servicios. |
| `level` | `info` / `warn` / `error` | Severidad — ver tabla de niveles abajo. |
| `service` (o `context`) | `auth-service`, `OrdersModule` | De qué servicio o módulo vino el log. Esencial en microservicios o cuando varios servicios escriben al mismo agregador. |
| `message` | `"User login failed"` | Descripción legible por humanos del evento. |

Campos muy recomendados (no obligatorios, pero cambian todo cuando hay un
incidente):

| Campo | Ejemplo | Por qué |
|---|---|---|
| `requestId` / `correlationId` | `f9ed4675-...` | Permite seguir **un mismo request** a través de todos los logs que generó (controller → service → repository). Sin esto, con tráfico concurrente los logs se entremezclan. |
| `environment` | `production` / `staging` / `development` | Evita mezclar logs de dev con logs reales. |
| `version` | `1.4.2` o el commit SHA | Para saber qué release generó el log al investigar una regresión. |
| `err` (objeto, no string) | `{ type, message, stack }` | Nunca meter el stack trace como parte del `message` — ver sección 6. |
| `durationMs` | `128` | En logs de requests, para detectar lentitud. |
| `userId` | `usr_123` | Cuando aplica, para poder decir "mostrame todo lo que le pasó a este usuario". |

Regla de nombres: usar **una convención consistente en todo el proyecto**
(`userId` en todos lados, no `userId` en un módulo y `user_id` en otro) —
mezclar convenciones rompe las queries agregadas en el log aggregator.

## 2. Niveles de log: NestJS vs. el estándar de la industria

Ojo con esto porque genera confusión: el Logger built-in de NestJS usa
nombres de nivel propios, que **no son exactamente los mismos** que usa
Pino/Winston (el estándar de facto en Node.js):

| Nivel NestJS (`this.logger.X`) | Equivalente estándar (Pino/Winston) | Cuándo usarlo |
|---|---|---|
| `verbose` | `trace` | Detalle extremo, casi nunca activo en producción. |
| `debug` | `debug` | Info útil para developers al investigar un bug puntual. No debería estar activo en producción salvo debugging puntual. |
| `log` | `info` | Operación normal: "usuario creó una cuenta", "orden procesada". Nivel default en producción. |
| `warn` | `warn` | Algo inesperado pero no rompió nada (un reintento, una respuesta lenta). Vale la pena revisarlo pero no es urgente. |
| `error` | `error` | Algo falló y afectó la operación actual. Requiere atención. |
| `fatal` | `fatal` | El proceso no puede seguir (falta una env var crítica, no hay conexión a la DB al arrancar). Normalmente el proceso termina después. |

Si migrás a `nestjs-pino` (recomendado, sección 3), esta diferencia de
nombres se resuelve sola: la librería mapea `logger.log()` a nivel `info`
de Pino automáticamente.

Errores comunes a evitar:
- Loguear **todo** como `error` "para no perderlo" — satura las alertas y
  hace que el error real se pierda entre ruido.
- Un `catch` que solo hace `console.log(err)` — el error existe pero no
  aparece en ningún dashboard ni dispara ninguna alerta.
- Antes de agregar un log, preguntarse: *¿alguien lo va a mirar? ¿dispara
  una alerta o aparece en un dashboard? ¿lo extrañaríamos si faltara
  durante un incidente?* Si la respuesta a las tres es no, bajarlo a
  `debug` o sacarlo directamente.

## 3. Qué logger usar en NestJS

| Opción | Cuándo usarla |
|---|---|
| **Logger built-in de NestJS** | Proyectos chicos, prototipos, o cuando el output ya se parsea como JSON con `new Logger()` configurado en modo `json: true` (Nest 10+ lo soporta). Simple pero limitado: sin redacción nativa, sin correlación automática de requests. |
| **`nestjs-pino`** (recomendada) | Default para producción en 2026. Envuelve Pino (el logger más rápido del ecosistema Node) respetando la interfaz `LoggerService` de Nest, con **correlación de request automática vía `AsyncLocalStorage`**, redacción de campos sensibles, y logging automático de requests HTTP (método, path, status, duración). |
| **`nest-winston`** | Si el equipo ya usa Winston en otros servicios Node.js (no-Nest) y quiere consistencia, o necesita transports muy específicos (Slack on fatal, BigQuery, etc.) que Winston resuelve mejor que Pino out of the box. Algo más lento que Pino. |

## 4. Setup de `nestjs-pino` (recomendado)

```bash
npm install nestjs-pino pino-http pino-pretty
```

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        // en desarrollo: legible; en producción: JSON crudo a stdout
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
        redact: ['req.headers.authorization', 'req.body.password', 'req.body.token'],
        customProps: () => ({ service: process.env.SERVICE_NAME || 'my-api' }),
        // autoLogging ya loguea cada request/response con method, url, status y responseTime
      },
    }),
  ],
})
export class AppModule {}
```

```ts
// main.ts — reemplaza el logger interno de Nest (bootstrap incluido) por Pino
import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger)) // sin esto, los logs internos de Nest (bootstrap, etc.) no pasan por Pino
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
```

### Uso dentro de servicios/controllers

Se sigue usando la misma API que ya conocés de Nest — no cambia el
código existente, solo el logger detrás:

```ts
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name) // "context" = nombre del módulo/clase

  async createOrder(dto: CreateOrderDto) {
    this.logger.log({ orderId: dto.id }, 'Order created') // nivel "log" -> "info" en Pino
    // ...
  }
}
```
Salida (producción, JSON en stdout):
```json
{"level":"info","time":"2026-07-01T14:30:00.123Z","service":"my-api","context":"OrdersService","orderId":"ord_456","reqId":"f9ed4675-...","msg":"Order created"}
```
Notar `reqId`: `nestjs-pino` lo agrega **automáticamente** a cada log
emitido durante el ciclo de vida de un request (guards, interceptors,
services, repositories) gracias a `AsyncLocalStorage` — no hace falta
pasar el request ID a mano por cada capa.

## 5. Loguear excepciones de forma centralizada

Combinar un **exception filter global** (para responder al cliente de
forma consistente) con el logger inyectado (para registrar el error con
todo el contexto). Nunca solo mostrar el error al cliente sin loguearlo,
ni loguearlo sin dar una respuesta consistente.

```ts
// filters/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { Request, Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error'

    this.logger.error(
      {
        err: exception instanceof Error ? { message: exception.message, stack: exception.stack } : exception,
        path: request.url,
        method: request.method,
        statusCode: status,
      },
      'Unhandled exception',
    )

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
```

```ts
// app.module.ts
providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }]
```

Si usás `nestjs-pino`, agregar también `LoggerErrorInterceptor` como
interceptor global — sin él, `pino-http` solo ve un objeto `err`
genérico y no el error real lanzado por tu código:
```ts
import { LoggerErrorInterceptor } from 'nestjs-pino'
app.useGlobalInterceptors(new LoggerErrorInterceptor())
```

## 6. Nunca loguear datos sensibles

Nunca debe aparecer en un log: contraseñas, tokens/API keys, números de
tarjeta, OTPs, y en general PII innecesaria.

- Configurar **redacción a nivel del logger** (visto en el setup de la
  sección 4 con `redact`), no confiar en que cada desarrollador recuerde
  no loguear un campo sensible.
- Nunca loguear `req.body` completo "por si acaso" en endpoints de auth o
  pago — loguear solo los campos que realmente hacen falta para debuggear.
- Los stack traces pueden filtrar rutas del sistema de archivos o
  fragmentos de código — evaluar si el nivel de detalle expuesto en el
  campo `err.stack` es aceptable para el destino de esos logs (interno
  vs. compartido con terceros).

## 7. Dónde escriben los logs (y quién los recolecta)

En contenedores (Docker/Kubernetes) la práctica estándar es que la app
escriba JSON a **stdout**, y que la infraestructura (Docker logging
driver, Fluentd, Vector, el agente de Datadog/CloudWatch, un sidecar) se
encargue de enviarlo al agregador centralizado. La app no necesita abrir
conexiones propias a un servicio de logs ni manejar rotación de archivos
a mano, salvo que corra en una VM tradicional sin orquestador (ahí sí,
usar `logrotate` a nivel de sistema o un transport con rotación).

Destinos comunes de agregación:
- **Self-hosted:** ELK Stack (Elasticsearch + Logstash + Kibana), Grafana
  Loki (liviano, buena opción si ya usás Grafana/Prometheus).
- **Managed:** Datadog, Better Stack (Logtail), Axiom, New Relic.
- **Cloud nativo:** CloudWatch Logs (AWS), Cloud Logging (GCP), si el
  backend ya corre en esa plataforma.
- **Error tracking especializado** (complementa, no reemplaza, al
  agregador de logs): Sentry, Bugsnag — se enfocan en excepciones con
  agrupación automática y alertas, mientras el agregador guarda el
  volumen completo de eventos.

## 8. Volumen, niveles por entorno y retención

- **Nivel por entorno:** `debug`/`verbose` en desarrollo, `info`(`log`)
  en producción como piso, con `debug` disponible on-demand vía variable
  de entorno (`LOG_LEVEL=debug`) para investigar un incidente puntual sin
  redeployar.
  ```ts
  // alternativa sin Pino: array de niveles habilitados en NestFactory.create
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })
  ```
- **Sampling:** si un evento de `debug`/`info` ocurre miles de veces por
  minuto (dentro de un loop, un job masivo), loguear un resumen
  (`{ batchSize: 1000, errors: 3 }`) en vez de una línea por iteración.
- **Retención:** los logs de `error`/`fatal` conviene retenerlos más
  tiempo que los de `debug`/`log` (que se pueden purgar en días). Definir
  la política en el agregador, no en la app.
- **Revisión periódica:** cada tanto, revisar si algún log ya no aporta
  valor (nadie lo mira, no dispara ninguna alerta) y sacarlo o bajarlo a
  `debug`.

## 9. Checklist

- [ ] Cada log tiene `timestamp` (ISO 8601, UTC), `level`, `service`/
      `context` y `message`.
- [ ] Se usa `nestjs-pino` (o al menos el Logger built-in en modo JSON)
      en vez de `console.log` en producción.
- [ ] `app.useLogger(app.get(Logger))` está seteado en `main.ts` — si no,
      los logs de bootstrap de Nest no pasan por el logger estructurado.
- [ ] Los niveles se usan con criterio: `error`/`fatal` solo para fallas
      reales, no como cajón de sastre.
- [ ] Cada log durante el ciclo de vida de un request incluye
      `requestId`/`reqId` (automático con `nestjs-pino` vía
      `AsyncLocalStorage`).
- [ ] Existe un exception filter global (`AllExceptionsFilter` o similar)
      que loguea toda excepción no controlada con su stack, path y
      status antes de responder al cliente.
- [ ] Si usás `nestjs-pino`, `LoggerErrorInterceptor` está registrado
      globalmente para exponer el error real (no solo el genérico).
- [ ] Ningún log contiene contraseñas, tokens, tarjetas u otra
      información sensible — hay `redact` configurado a nivel del logger.
- [ ] Los logs se envían a un agregador centralizado (ELK/Loki/Datadog/
      CloudWatch/etc.) vía stdout, no solo quedan en la terminal local.
- [ ] Hay una política de retención (más tiempo para `error`/`fatal`,
      menos para `debug`/`log`) y, si aplica, sampling para eventos de
      alto volumen.