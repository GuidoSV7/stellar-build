---
name: drizzle-orm
description: Persistencia con Drizzle ORM + PostgreSQL en NestJS. Usar SIEMPRE que se cree, edite o revise código que toca la base de datos con Drizzle - schemas, repositories, queries, paginación, filtros, transacciones, migraciones con drizzle-kit, o configuración del DatabaseModule. También cuando se mencione "drizzle", "pgTable", "drizzle-kit" o queries SQL type-safe. Este skill implementa los ports definidos en el agent nestjs (Clean Architecture): todo el código Drizzle vive en infrastructure/, nunca en services ni controllers.
---

# Drizzle ORM — Capa de Infraestructura (NestJS + PostgreSQL)

**Regla de contención:** todo import de `drizzle-orm` vive en `infrastructure/` (repositories) o en `src/database/`. Si un service o controller importa algo de Drizzle, es una violación de arquitectura (ver `agents/nestjs.md` y `.cursor/skills/nestjs/SKILL.md`).

## Instalación

```bash
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

## `drizzle.config.ts` (raíz del proyecto)

```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

## DatabaseModule — con ConfigService y cierre de pool

```typescript
import { Module, Global, OnApplicationShutdown, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');
export type DrizzleDB = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: config.get<number>('DB_POOL_MAX') ?? 10,
          ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : undefined,
        }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL, ConfigService],
      useFactory: (pool: Pool, config: ConfigService): DrizzleDB =>
        drizzle(pool, { schema, logger: config.get('NODE_ENV') === 'development' }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
```

### Reglas de configuración

- ✅ SIEMPRE `ConfigService.getOrThrow` — falla al boot si falta la env var, no en la primera query.
- ✅ SIEMPRE cerrar el pool en `onApplicationShutdown` — sin esto, watch mode y tests de integración filtran conexiones.
- ✅ Ajustar `ssl` según el proveedor (RDS/Supabase/Neon exigen SSL en producción).
- ❌ NUNCA `process.env.X` directo fuera de `drizzle.config.ts` (drizzle-kit corre fuera del contexto de Nest, ahí sí es válido).
- ✅ Si el proyecto corre detrás de PgBouncer en transaction pooling, documentarlo: en ese modo cada conexión lógica soporta un solo statement en vuelo y conviene serializar queries. En conexión directa a Postgres, queries de solo lectura en paralelo son seguras.

## Schemas

```typescript
// src/categories/infrastructure/category.schema.ts
import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { products } from '../../products/infrastructure/product.schema';

export const categories = pgTable('categories', {
  id:        uuid('id').defaultRandom().primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  state:     boolean('state').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  // Unique parcial: permite recrear un nombre cuyo original fue soft-deleted
  uniqueIndex('categories_name_active_uq').on(t.name).where(sql`${t.state} = true`),
]);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export type CategoryRow    = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
```

### Reglas de schema

- ✅ Tipos SIEMPRE inferidos (`$inferSelect` / `$inferInsert`) — NUNCA interfaces manuales para filas.
- ✅ Con soft-delete + unique constraint: usar **índice único parcial** (`WHERE state = true`). Un unique total bloquea recrear registros soft-deleted — bug clásico.
- ✅ Registrar cada schema nuevo en el barrel `src/database/schema.ts` (`export * from ...`).
- ✅ Nombre de columna SQL siempre snake_case, propiedad TS camelCase. Verificar el nombre real en el schema antes de usarlo en cualquier query.

## Repository — implementación del port

```typescript
// src/categories/infrastructure/drizzle-category.repository.ts
import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../database/database.module';
import { categories } from './category.schema';
import { CategoryRepository } from '../ports/category-repository.port';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';

@Injectable()
export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: NewCategoryRow) {
    try {
      const [row] = await this.db.insert(categories).values(data).returning();
      return row;
    } catch (error) {
      this.translatePgError(error);
    }
  }

  async findOne(id: string) {
    const [row] = await this.db
      .select().from(categories)
      .where(eq(categories.id, id)).limit(1);
    return row ?? null; // el port retorna null; NotFoundException es del service
  }

  async update(id: string, data: Partial<NewCategoryRow>) {
    try {
      const [row] = await this.db
        .update(categories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();
      return row;
    } catch (error) {
      this.translatePgError(error);
    }
  }

  async softDelete(id: string) {
    const [row] = await this.db
      .update(categories)
      .set({ state: false, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return row;
  }

  private translatePgError(error: unknown): never {
    const code = (error as { code?: string })?.code;
    if (code === PG_UNIQUE_VIOLATION) throw new ConflictException('Resource already exists');
    if (code === PG_FK_VIOLATION) throw new ConflictException('Related resource constraint violated');
    throw error; // errores desconocidos suben al exception filter global → 500
  }
}
```

### Reglas del repository

- ✅ `.returning()` SIEMPRE retorna array — desestructurar `const [row] = ...`.
- ✅ Traducir códigos de Postgres (`23505` unique, `23503` FK) a excepciones HTTP semánticas — NUNCA catch genérico → 500.
- ✅ `findOne` retorna `null`, no lanza — el contrato del port lo exige.
- ✅ `updatedAt: new Date()` en cada update.
- ❌ NUNCA lógica de negocio acá — solo persistencia, mapeo y traducción de errores.

## Paginación con filtros

El DTO con filtros extiende `PaginationDto` (regla del skill de arquitectura). La query:

```typescript
import { and, count, desc, ilike, eq, gte, lte, or, SQL } from 'drizzle-orm';

async findAllPaginated(limit: number, offset: number, filters?: OrderFilters) {
  const maxLimit = Math.min(limit || 15, 100);
  const safeOffset = Math.max(0, offset ?? 0);

  const conditions: SQL[] = [];

  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(or(ilike(users.email, term), ilike(users.userName, term))!);
  }
  if (filters?.status?.trim() && filters.status !== 'all') {
    conditions.push(eq(orders.status, filters.status.trim()));
  }
  if (filters?.dateFrom) conditions.push(gte(orders.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo)   conditions.push(lte(orders.createdAt, new Date(filters.dateTo)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, [{ value: total }]] = await Promise.all([
    this.db.select().from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(maxLimit).offset(safeOffset),
    this.db.select({ value: count() }).from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where),
  ]);

  return { data, total: Number(total) };
}
```

### Reglas de paginación

- ✅ SIEMPRE `{ data, total }` con `total` reflejando el conteo filtrado. Sin anotación manual de retorno — inferir.
- ✅ SIEMPRE `maxLimit` (tope 100) y `safeOffset`.
- ✅ `ilike` para búsquedas case-insensitive; `or(...)` cuando el search aplica a varias columnas (dos `push` separados generan AND, que es casi nunca lo buscado).
- ✅ `Promise.all` para data+count es correcto y deseable con `Pool` directo a Postgres — son dos SELECT independientes en conexiones distintas. Excepción: PgBouncer en transaction pooling con pool saturado → serializar y documentar por qué.
- ❌ NUNCA `any` ni anotaciones de retorno manuales — TypeScript infiere desde Drizzle.

## Transacciones

```typescript
async transferBalance(fromId: string, toId: string, amount: number) {
  return this.db.transaction(async (tx) => {
    const [from] = await tx.update(wallets)
      .set({ balance: sql`${wallets.balance} - ${amount}` })
      .where(eq(wallets.userId, fromId)).returning();

    const [to] = await tx.update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}` })
      .where(eq(wallets.userId, toId)).returning();

    return { from, to };
  });
}
```

- ✅ Dentro de una transacción usar SIEMPRE `tx`, nunca `this.db` — mezclar rompe la atomicidad silenciosamente.
- ✅ La transacción vive en el repository; el port expone el método de dominio (`transferBalance`), no la transacción.

## Migraciones

```bash
npx drizzle-kit generate   # genera SQL versionado desde los schemas
npx drizzle-kit migrate    # aplica migraciones pendientes
npx drizzle-kit studio     # explorador visual
```

- ✅ Producción: SIEMPRE `generate` → review del SQL en PR → `migrate` en CI/CD.
- ❌ NUNCA `drizzle-kit push` contra staging/producción — es solo para prototipado local. `push` no genera historial y puede aplicar cambios destructivos sin revisión.
- ✅ Revisar el SQL generado antes de mergear: drizzle-kit puede generar `DROP` + `CREATE` para renombres que deberían ser `ALTER`.

## Errores comunes — rechazar en review

- ❌ Import de `drizzle-orm` fuera de `infrastructure/` o `src/database/`.
- ❌ Catch genérico convirtiendo violaciones de constraint en 500.
- ❌ Olvidar `.returning()` cuando se necesita el resultado de insert/update.
- ❌ Unique total sobre columnas de tablas con soft-delete (usar índice parcial).
- ❌ `console.log` — siempre `Logger` de NestJS.
- ❌ Usar `this.db` dentro de un callback de `transaction`.
- ❌ Nombres de columna sin verificar contra el schema.