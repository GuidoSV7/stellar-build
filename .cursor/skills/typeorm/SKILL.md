---
name: typeorm
description: Persistencia con TypeORM + PostgreSQL en NestJS. Usar SIEMPRE que se cree, edite o revise código de base de datos con TypeORM - entities con decoradores, repositories, QueryBuilder, paginación, filtros, transacciones, migraciones o configuración del DataSource. También cuando se mencione "typeorm", "@Entity", "DataSource", "QueryBuilder" o "migration:generate". Este skill implementa los ports definidos en el agent nestjs (Clean Architecture): todo el código TypeORM vive en infrastructure/, nunca en services ni controllers.
---

# TypeORM — Capa de Infraestructura (NestJS + PostgreSQL)

**Regla de contención:** todo import de `typeorm` / `@nestjs/typeorm` vive en `infrastructure/` o en la configuración de `src/database/`. Services y controllers dependen del port (ver `agents/nestjs.md` y `.cursor/skills/nestjs/SKILL.md`), nunca de `Repository<T>` de TypeORM.

## Instalación

```bash
npm install @nestjs/typeorm typeorm pg
```

## Regla #1 — `synchronize: false` SIEMPRE

```typescript
synchronize: false
```

- ❌ NUNCA `synchronize: true`, ni siquiera en desarrollo condicionado por env. Auto-sync puede dropear columnas/tablas con datos al detectar diferencias — es la causa #1 documentada de pérdida de datos con TypeORM. El flujo es SIEMPRE migraciones, en todos los entornos.
- ❌ NUNCA `synchronize: process.env.NODE_ENV !== 'production'` — el hábito de desarrollo sin migraciones garantiza que la primera migración real de producción salga mal.

## DataSource — un solo origen de configuración

TypeORM CLI corre fuera del contexto de Nest, así que el `DataSource` se define standalone y el módulo lo reutiliza. NUNCA duplicar la config en dos lugares.

```typescript
// src/database/data-source.ts
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.orm-entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  extra: { max: Number(process.env.DB_POOL_MAX ?? 10) },
};

export default new DataSource(dataSourceOptions);
```

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
  ],
})
export class AppModule {}
```

## Scripts de migración (`package.json`)

```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
    "migration:create": "typeorm-ts-node-commonjs migration:create",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/database/data-source.ts"
  }
}
```

- ✅ Flujo: cambiar entity → `npm run migration:generate -- src/database/migrations/DescriptiveName` → **revisar el SQL generado en el PR** → `migration:run` en CI/CD antes del deploy.
- ✅ SIEMPRE implementar `down()` real — es la única red de rollback.
- ✅ En producción las migraciones corren desde `dist/` (JS compilado) — verificar que los globs de `migrations` cubren `.js`.
- ❌ NUNCA `migrationsRun: true` en producción sin control explícito de deploy — las migraciones se aplican como paso de CI/CD, no como side-effect del boot.
- ⚠️ `migration:generate` interpreta renombres como DROP + ADD (pierde datos). Para renombres, `migration:create` y escribir el `ALTER TABLE ... RENAME` a mano.

## ORM-Entity — es infraestructura, no dominio

Sufijo `.orm-entity.ts` para distinguirla de la entity de dominio (Nivel 2 del skill de arquitectura). En módulos Nivel 1, la orm-entity puede ser el tipo que circula; en Nivel 2, es SOLO el mapeo a tabla y el repository traduce hacia/desde la entity de dominio.

```typescript
// src/categories/infrastructure/category.orm-entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
         UpdateDateColumn, Index, OneToMany } from 'typeorm';

@Entity('categories')
@Index('categories_name_active_uq', ['name'], { unique: true, where: '"state" = true' })
export class CategoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', default: true })
  state: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProductOrmEntity, (p) => p.category)
  products: ProductOrmEntity[];
}
```

### Reglas de entity

- ✅ SIEMPRE tipo de columna explícito (`type: 'varchar'`) — la inferencia por reflexión varía entre drivers.
- ✅ Con soft-delete + unique: índice único **parcial** (`where: '"state" = true'`), o el unique bloquea recrear registros soft-deleteados.
- ✅ `name:` snake_case explícito en columnas de fecha/compuestas — no depender de naming strategies implícitas.
- ❌ NUNCA lazy relations (`Promise<T>` en relaciones) — generan N+1 silencioso. Cargar relaciones explícitamente con `relations: [...]` o QueryBuilder.
- ❌ NUNCA `eager: true` global en relaciones — carga oculta en cada find. Explícito siempre.

## Repository — implementación del port

```typescript
// src/categories/infrastructure/typeorm-category.repository.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { CategoryOrmEntity } from './category.orm-entity';
import { CategoryRepository } from '../ports/category-repository.port';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';

@Injectable()
export class TypeormCategoryRepository implements CategoryRepository {
  constructor(
    @InjectRepository(CategoryOrmEntity)
    private readonly repo: Repository<CategoryOrmEntity>,
  ) {}

  async create(data: Partial<CategoryOrmEntity>) {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (error) {
      this.translatePgError(error);
    }
  }

  async findOne(id: string) {
    return this.repo.findOne({ where: { id } }); // null si no existe — el port lo exige
  }

  async update(id: string, data: Partial<CategoryOrmEntity>) {
    try {
      await this.repo.update(id, data);
      return this.repo.findOneOrFail({ where: { id } });
    } catch (error) {
      this.translatePgError(error);
    }
  }

  async softDelete(id: string) {
    await this.repo.update(id, { state: false });
    return this.repo.findOneOrFail({ where: { id } });
  }

  private translatePgError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const code = (error.driverError as { code?: string })?.code;
      if (code === PG_UNIQUE_VIOLATION) throw new ConflictException('Resource already exists');
      if (code === PG_FK_VIOLATION) throw new ConflictException('Related resource constraint violated');
    }
    throw error; // desconocidos suben al exception filter global → 500
  }
}
```

El módulo registra la orm-entity y bindea el port:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([CategoryOrmEntity])],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    { provide: CATEGORY_REPOSITORY, useClass: TypeormCategoryRepository },
  ],
})
export class CategoriesModule {}
```

- ✅ `Repository<T>` de TypeORM se inyecta SOLO dentro de la implementación del port. El service inyecta el token del port.
- ✅ `update()` de TypeORM NO retorna la fila — hacer el fetch posterior si se necesita, o usar QueryBuilder con `.returning('*')` para un solo round-trip.
- ✅ Traducir `QueryFailedError` por código de Postgres — NUNCA catch genérico → 500.

## Paginación con filtros — QueryBuilder

```typescript
async findAllPaginated(limit: number, offset: number, filters?: OrderFilters) {
  const maxLimit = Math.min(limit || 15, 100);
  const safeOffset = Math.max(0, offset ?? 0);

  const qb = this.repo.createQueryBuilder('order')
    .leftJoinAndSelect('order.user', 'user')
    .orderBy('order.createdAt', 'DESC')
    .take(maxLimit)
    .skip(safeOffset);

  if (filters?.search?.trim()) {
    qb.andWhere('(user.email ILIKE :term OR user.userName ILIKE :term)',
      { term: `%${filters.search.trim()}%` });
  }
  if (filters?.status?.trim() && filters.status !== 'all') {
    qb.andWhere('order.status = :status', { status: filters.status.trim() });
  }
  if (filters?.dateFrom) qb.andWhere('order.createdAt >= :from', { from: new Date(filters.dateFrom) });
  if (filters?.dateTo)   qb.andWhere('order.createdAt <= :to',   { to: new Date(filters.dateTo) });

  const [data, total] = await qb.getManyAndCount();
  return { data, total };
}
```

- ✅ `getManyAndCount()` resuelve data+count en una sola operación — usarlo siempre para paginación.
- ✅ Parámetros SIEMPRE con placeholders (`:term`) — NUNCA interpolar strings en `andWhere` (SQL injection).
- ✅ `take`/`skip` con QueryBuilder + joins (manejan la paginación sobre la entidad raíz correctamente); `limit`/`offset` crudos rompen el conteo con joins uno-a-muchos.
- ✅ Tope de `maxLimit` = 100.

## Transacciones

```typescript
async transferBalance(fromId: string, toId: string, amount: number) {
  return this.dataSource.transaction(async (manager) => {
    await manager.increment(WalletOrmEntity, { userId: fromId }, 'balance', -amount);
    await manager.increment(WalletOrmEntity, { userId: toId }, 'balance', amount);
    return {
      from: await manager.findOneByOrFail(WalletOrmEntity, { userId: fromId }),
      to:   await manager.findOneByOrFail(WalletOrmEntity, { userId: toId }),
    };
  });
}
```

- ✅ Dentro de la transacción usar SIEMPRE el `manager` del callback — usar `this.repo` rompe la atomicidad silenciosamente.
- ✅ La transacción vive en el repository; el port expone el método de dominio, no `EntityManager`.

## Errores comunes — rechazar en review

- ❌ `synchronize: true` en cualquier entorno.
- ❌ Import de `typeorm` fuera de `infrastructure/` / `src/database/`.
- ❌ Service inyectando `Repository<T>` directo (saltea el port).
- ❌ String interpolation en QueryBuilder.
- ❌ Lazy/eager relations implícitas.
- ❌ Confiar en el SQL de `migration:generate` sin revisarlo (renombres = DROP+ADD).
- ❌ Migración sin `down()` implementado.
- ❌ Catch genérico → 500 para violaciones de constraint.
- ❌ `console.log` — siempre `Logger` de NestJS.