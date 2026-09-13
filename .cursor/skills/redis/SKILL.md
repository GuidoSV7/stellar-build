---
name: redis
description: >
  Use this skill whenever the user asks about Redis caching, cache strategy, TTL configuration,
  cache-aside pattern, cache invalidation, rate limit protection, or how to reduce external API
  calls using Redis. Trigger on keywords like: "caché", "cachear", "Redis", "TTL", "rate limit",
  "optimizar llamadas", "cuota de requests", "withCache", "cache invalidation", "stale data",
  "cache hit/miss". This skill is framework-agnostic and language-agnostic — it covers best
  practices for Redis regardless of the stack (Node.js, Python, PHP, etc.).
  Always use this skill when Redis or caching strategy is mentioned, even briefly.
---

# Redis Cache — Buenas Prácticas

Guía de buenas prácticas para usar Redis como capa de caché. Aplica a cualquier stack y cualquier fuente de datos con límites de uso (APIs externas, bases de datos, servicios de terceros).

---

## 1. Concepto central: cache-aside

El patrón más común. La aplicación maneja el caché manualmente:

```
Request → Redis HIT  ──────────────────────────────────→ Respuesta (~1ms)
        → Redis MISS → Fuente de datos → Redis SET → Respuesta (~200ms)
```

**Por qué funciona:** 100 usuarios pidiendo el mismo dato = 1 llamada a la fuente, 99 desde Redis.

---

## 2. Implementación base

### Node.js (ioredis)

```typescript
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 100, 3000),
})

const withCache = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> => {
  try {
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached) as T
  } catch {
    // Redis no disponible → degradar sin romper
  }

  const data = await fetchFn()

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
  } catch {
    // No se pudo guardar → devolver el dato igual
  }

  return data
}
```

### `CacheService` — no cachear vacíos ni errores semánticos

Si el repo expone un `CacheService` con `withCache` / `withCacheAndStale` / `withCacheLocked`, **no deben persistirse** resultados vacíos (`[]`, `null`, `{ data: [] }`, etc.). Un HIT vacío se borra y se vuelve a llamar al upstream.

- Default: vacío → sin `SETEX`.
- Excepción documentada: `allowEmptyPersist: true` solo para catálogos estáticos inmutables.
- Limpieza en prod: endpoint admin de mantenimiento con `SCAN` sobre el prefijo de claves de caché (p. ej. `cache:*`).
- **No cachear errores del upstream en el payload**: si la API externa devuelve un cuerpo de error reconocible (aunque HTTP 200), no `SETEX`. HIT con error → `DEL` + refetch. Centralizar la detección en un util reutilizable.
- Limpieza de entradas erróneas: job o endpoint admin equivalente al de vacíos.

Los `fetchFn` **no deben** hacer `catch { return [] }` en errores de red/HTTP; dejar que la excepción suba para no enmascarar fallos.

### Python (redis-py)

```python
import redis, json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def with_cache(key: str, ttl_seconds: int, fetch_fn):
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    data = fetch_fn()
    r.setex(key, ttl_seconds, json.dumps(data))
    return data
```

---

## 3. Convención de keys

**Formato recomendado:**
```
{namespace}:{recurso}:{parametros_ordenados_alfabeticamente}
```

**Reglas:**
- Sin espacios, sin `/`, sin `\`, sin comillas
- Parámetros siempre en el mismo orden (ordenar alfabéticamente)
- Máximo 200 caracteres
- Namespace por dominio para evitar colisiones

**Ejemplos:**
```
cache:users:id=123
cache:products:category=shoes:page=2
cache:weather:city=london:units=metric
cache:standings:league=39:season=2025
cache:fixtures:live
```

**Generador en Node.js:**
```typescript
const buildKey = (resource: string, params: Record<string, unknown> = {}): string => {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(':')
  return `cache:${resource}${sorted ? ':' + sorted : ''}`
}
```

---

## 4. TTL — cuánto tiempo guardar cada dato

La regla general: **el TTL debe ser menor o igual a la frecuencia real de cambio del dato.**

### Por velocidad de cambio

| Tipo de dato | TTL sugerido | Ejemplos |
|---|---|---|
| Inmutable / casi nunca cambia | 7–30 días | Países, timezones, catálogos |
| Cambia raramente | 24 horas | Perfiles, configuraciones |
| Cambia durante el día | 1–6 horas | Rankings, stats acumuladas |
| Cambia frecuentemente | 15–30 minutos | Precios, disponibilidad |
| Casi tiempo real | 15–60 segundos | Datos en vivo, scores, cotizaciones |
| Protección contra burst | 1–5 segundos | Mismo endpoint llamado en paralelo |

### Tabla de referencia para APIs de terceros con cuota

Ajustar TTL según el plan contratado y la tasa de cambio del dato:

| Tipo de endpoint | Plan con cuota baja | Plan con cuota alta |
|---|---|---|
| Catálogos estáticos (países, timezones) | 7–30 días | 7–30 días |
| Entidades de referencia (ligas, categorías) | 24 horas | 24 horas |
| Datos que cambian varias veces al día | 1–6 horas | 1–6 horas |
| Agregados / rankings | 1 hora | 1 hora |
| Eventos programados | 1 hora | 1 hora |
| Datos en vivo / tiempo casi real | 5 min (cuota limitada) | 15–60 seg |

> Con poca cuota diaria, alargar TTL en datos en vivo para no agotar requests; documentar el trade-off en el servicio.

---

## 5. Fallback con dato stale

Cuando la fuente falla, mejor servir un dato viejo que devolver error.

```typescript
const withCacheAndFallback = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> => {
  const cached = await redis.get(key).catch(() => null)
  if (cached) return JSON.parse(cached) as T

  try {
    const data = await fetchFn()
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds).catch(() => {})
    // Copia stale sin TTL como fallback permanente
    await redis.set(`${key}:stale`, JSON.stringify(data)).catch(() => {})
    return data
  } catch {
    const stale = await redis.get(`${key}:stale`).catch(() => null)
    if (stale) {
      console.warn(`Source failed, serving stale data for: ${key}`)
      return JSON.parse(stale) as T
    }
    throw new Error(`No data available for: ${key}`)
  }
}
```

---

## 6. Invalidación

```typescript
// Borrar un key específico
await redis.del('cache:standings:league=39:season=2025')

// ⚠️ NUNCA usar redis.keys('pattern') en producción — bloquea el servidor
// ✅ Usar SCAN — no bloquea, itera en chunks
const deleteByPattern = async (pattern: string) => {
  let cursor = '0'
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = next
    if (keys.length > 0) await redis.del(...keys)
  } while (cursor !== '0')
}

await deleteByPattern('cache:fixtures:868078:*')
```

**Cuándo invalidar:**
- Cuando sabés que el dato cambió (webhook, evento interno)
- Cuando el usuario fuerza un refresh explícito
- Nunca en bucles rápidos — bajá el TTL en lugar de invalidar constantemente

---

## 7. Redis no disponible — degradar sin romper

Redis es caché, no fuente de verdad. Si cae, la app sigue funcionando.

```typescript
// ✅ Redis como optimización opcional
try {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
} catch {
  // Redis caído → ir directo a la fuente sin lanzar error
}
return fetchFn()

// ❌ Redis como dependencia crítica
const cached = await redis.get(key) // si esto falla, todo falla
```

---

## 8. Evitar thundering herd

Cuando el TTL expira y muchos requests llegan al mismo tiempo, todos van a la fuente simultáneamente. Solución: lock con NX.

```typescript
const withLock = async <T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> => {
  const cached = await redis.get(key).catch(() => null)
  if (cached) return JSON.parse(cached) as T

  const lockKey = `${key}:lock`
  const acquired = await redis.set(lockKey, '1', 'NX', 'EX', 10)

  if (!acquired) {
    // Otro proceso está fetcheando → esperar y reintentar
    await new Promise(r => setTimeout(r, 200))
    return withLock(key, ttlSeconds, fetchFn)
  }

  try {
    const data = await fetchFn()
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
    return data
  } finally {
    await redis.del(lockKey)
  }
}
```

---

## 9. Infraestructura

| Entorno | Opción | Costo |
|---|---|---|
| Desarrollo | `docker run -p 6379:6379 redis:alpine` | $0 |
| MVP / Staging | Upstash free tier (10k req/día) | $0 |
| Producción baja escala | Upstash Pay-as-you-go | ~$0–10/mes |
| Producción alta escala | Railway / Render / AWS ElastiCache | $10–50/mes |

---

## 10. Checklist de buenas prácticas

- [ ] Redis falla → app sigue funcionando (nunca es dependencia crítica)
- [ ] Keys con convención clara y parámetros ordenados alfabéticamente
- [ ] TTL definido según velocidad real de cambio del dato
- [ ] Nunca usar `KEYS pattern` en producción — usar `SCAN`
- [ ] Fallback stale cuando la fuente de datos falla
- [ ] Lock (NX) para evitar thundering herd en endpoints de alto tráfico
- [ ] Monitorear memoria de Redis — configurar `maxmemory-policy allkeys-lru`