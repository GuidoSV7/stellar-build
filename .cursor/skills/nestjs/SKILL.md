---
name: nestjs
description: Arquitectura de módulos NestJS con Clean Architecture / Ports & Adapters. Usar SIEMPRE al crear un módulo nuevo, al agregar un service o repository, al decidir la estructura de carpetas de un módulo, o cuando se menciona "arquitectura", "capas", "repository pattern", "puertos", "use cases", "dominio", "escalabilidad" o "cambiar de base de datos". Define el contrato ORM-agnóstico que implementan los skills de drizzle-orm y typeorm.
---

# NestJS — Clean Architecture (Ports & Adapters)

Este skill define **arquitectura**, no persistencia. La implementación concreta del ORM vive en `drizzle-orm/SKILL.md` o `typeorm/SKILL.md`. Los services y controllers escritos con este skill NO deben importar nada del ORM.

## Regla central

**Las dependencias apuntan hacia adentro.** Dominio ← Application ← Infraestructura. Nunca al revés.

- Un service/use-case NUNCA importa el cliente del ORM, tipos del ORM, ni el schema/entity del ORM.
- Un controller NUNCA llama al repository directamente — siempre pasa por el service/use-case.
- Un controller NUNCA contiene lógica de negocio (loops, branches de reglas) — solo validación de entrada (DTO + pipes) y delegación.

## Decisión por niveles — NO aplicar todo a todo

Antes de crear un módulo, clasificarlo. Aplicar el nivel mínimo que corresponde. Sobre-arquitecturar un CRUD es un error tan grave como sub-arquitecturar un dominio complejo.

### Nivel 1 — Repository Port (OBLIGATORIO en todo módulo, sin excepción)

Todo acceso a datos pasa por una interface (`port`) inyectada por token. Es barato (2 archivos extra) y garantiza que un cambio de ORM solo toca `infrastructure/`.

### Nivel 2 — Domain Layer (SOLO si se cumple al menos una condición)

Agregar `domain/` (entities puras, value objects) y `application/use-cases/` **únicamente** cuando:

- Hay reglas de negocio no triviales que deben testearse sin base de datos (cálculos, máquinas de estado, invariantes cruzadas).
- Existen o existirán múltiples adapters reales para la misma capacidad (dos proveedores de pago, mismo caso de uso desde REST y desde consumer de eventos) — confirmado, no "por si acaso".
- Hay un cambio de infraestructura conocido y planificado cuyo costo preocupa hoy.

**Test rápido:** si al service le sacás la persistencia y queda solo validación de DTO → Nivel 1. Si queda un motor de reglas → Nivel 2.

❌ NUNCA generar entities de dominio, use-cases y mappers para un CRUD simple. Eso es deuda de indirección sin retorno.

## Estructura — Nivel 1 (default)

```
src/[module-name]/
├── dto/
│   ├── create-[name].dto.ts
│   └── update-[name].dto.ts
├── ports/
│   └── [name]-repository.port.ts    # interface + token DI
├── infrastructure/
│   └── [orm]-[name].repository.ts   # implementa el port (ver skill del ORM)
├── [name].controller.ts
├── [name].service.ts
└── [name].module.ts
```

## Estructura — Nivel 2 (dominio con reglas)

```
src/[module-name]/
├── domain/
│   ├── [name].entity.ts             # Clase pura. CERO imports de NestJS/ORM
│   └── [name]-[concept].vo.ts       # Value objects, invariantes
├── application/
│   ├── use-cases/
│   │   ├── create-[name].use-case.ts
│   │   └── [action]-[name].use-case.ts
│   └── ports/
│       ├── [name]-repository.port.ts
│       └── [external-capability].port.ts   # gateway a servicios externos
├── infrastructure/
│   ├── [orm]-[name].repository.ts   # implementa repository port + mapea fila↔entity
│   └── [provider]-[capability].adapter.ts
├── presentation/
│   ├── [name].controller.ts
│   └── dto/
└── [name].module.ts                 # wiring DI — siempre en la raíz
```

## El Port — contrato ORM-agnóstico

```typescript
// ports/category-repository.port.ts
import { PaginationDto } from 'src/common/dtos/pagination.dto';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRepository {
  create(data: CreateCategoryData): Promise<Category>;
  findAll(pagination: PaginationDto): Promise<Category[]>;
  findOne(id: string): Promise<Category | null>;
  update(id: string, data: Partial<CreateCategoryData>): Promise<Category>;
  softDelete(id: string): Promise<Category>;
}
```

### Reglas del port

- ✅ SIEMPRE token `Symbol()` exportado junto a la interface — nunca inyectar por clase concreta ni string.
- ✅ SIEMPRE `findOne` retorna `T | null` — el port NO lanza excepciones HTTP. `NotFoundException` la lanza el service/use-case. Las excepciones HTTP son responsabilidad de application/presentation, no de persistencia.
- ✅ Los tipos de entrada/salida del port se definen en el módulo (Nivel 2: entities de dominio; Nivel 1: tipos propios o inferidos, pero la FIRMA del port no expone tipos del ORM como `NodePgDatabase` o `Repository<T>`).
- ❌ NUNCA exponer en el port conceptos del ORM: query builders, `SelectQueryBuilder`, operadores `SQL`, transacciones del driver. Si un caso necesita transacción cross-agregado, exponer un método de dominio (`transferBalance(...)`) y que la transacción viva en la implementación.
- ❌ NUNCA un port "genérico" tipo `IRepository<T>` con CRUD abstracto compartido entre módulos — cada agregado define exactamente los métodos que su dominio necesita, ni uno más.

## Service (Nivel 1)

```typescript
@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly repo: CategoryRepository,
  ) {}

  create(dto: CreateCategoryDto) {
    return this.repo.create({ ...dto, state: dto.state ?? true });
  }

  async findOne(id: string) {
    const category = await this.repo.findOne(id);
    if (!category) throw new NotFoundException(`Category with id ${id} not found`);
    return category;
  }

  async restore(id: string) {
    const category = await this.findOne(id);
    if (category.state) throw new ConflictException('Category is not deleted');
    return this.repo.update(id, { state: true });
  }
}
```

## Use Case (Nivel 2)

Un archivo por caso de uso, un solo método público `execute`. El use case orquesta; la entity valida sus propios invariantes.

```typescript
@Injectable()
export class PayOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PAYMENT_GATEWAY) private readonly payments: PaymentGateway,
  ) {}

  async execute(orderId: string): Promise<Order> {
    const order = await this.orders.findOne(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    order.markAsPaid(); // invariante en la entity: lanza DomainError si el estado no lo permite

    await this.payments.charge(order.total, order.customerId);
    return this.orders.save(order);
  }
}
```

## Entity de dominio (Nivel 2)

```typescript
// domain/order.entity.ts — CERO decoradores, CERO imports de framework/ORM
export class Order {
  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly total: number,
    private _status: OrderStatus,
  ) {}

  static fromPersistence(props: OrderProps): Order {
    return new Order(props.id, props.customerId, props.total, props.status);
  }

  markAsPaid(): void {
    if (this._status !== 'pending') {
      throw new InvalidOrderStateError(`Cannot pay order in status ${this._status}`);
    }
    this._status = 'paid';
  }

  get status(): OrderStatus { return this._status; }
}
```

- ❌ La entity NUNCA importa nada de Drizzle/TypeORM. Si `order.entity.ts` importa `$inferSelect` o `@Entity()`, el nivel 2 está roto y no aporta nada.
- ✅ El mapeo fila↔entity es responsabilidad EXCLUSIVA del repository en `infrastructure/`.
- ✅ Errores de dominio (`InvalidOrderStateError`) son clases propias, no excepciones HTTP. Un exception filter o el use case las traduce a HTTP.

## Wiring en el módulo

```typescript
@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    { provide: CATEGORY_REPOSITORY, useClass: DrizzleCategoryRepository },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

- ✅ El bind port→implementación ocurre SOLO acá. Cambiar de ORM = cambiar `useClass` + escribir el repository nuevo. Nada más se toca.
- ✅ Si otro módulo necesita esta capacidad, exportar el SERVICE, nunca el repository ni el token.

## Manejo de errores — mapa obligatorio

| Situación | Excepción | Status |
|---|---|---|
| Recurso no existe | `NotFoundException` | 404 |
| Estado de negocio inválido (restore de algo activo, pagar orden pagada) | `ConflictException` o `BadRequestException` | 409/400 |
| Violación unique/FK de la BD | `ConflictException` (traducida en repository o exception filter) | 409 |
| Error inesperado (BD caída, bug) | `InternalServerErrorException` | 500 |

- ❌ NUNCA usar `InternalServerErrorException` para estados de negocio esperados. Un 500 es "el servidor falló", no "tu request no aplica". Contamina el monitoring de 5xx.
- ❌ NUNCA `try/catch` genérico que convierte todo en 500. Los errores de constraint de BD se traducen a su excepción HTTP correcta (ver skill del ORM para el mapeo de códigos).
- ✅ SIEMPRE `Logger` de NestJS con contexto de clase. NUNCA `console.log`.

## Seguridad

- ✅ TODO endpoint de escritura (`POST`, `PATCH`, `DELETE`) lleva guards explícitos (`JwtAuthGuard` + `RolesGuard` con `@Roles(...)`), salvo decisión documentada de que es público.
- ❌ NUNCA métodos destructivos masivos (`deleteAll*`) en services de producción. Van en seeds/scripts de test, fuera del árbol de `src` productivo.

## Testing

- El beneficio principal del port: implementar `InMemoryCategoryRepository implements CategoryRepository` y testear services/use-cases como unit tests puros, sin BD, sin mocks del ORM.
- Nivel 2: las entities de dominio se testean sin NestJS siquiera — instancia + assert.
- Los `.spec.ts` van junto al archivo que testean.

## Convenciones de nombres

- Carpetas: kebab-case. Módulo siempre plural (`orders`), entity singular (`order.entity.ts`).
- Ports: `[name]-repository.port.ts`, token `[NAME]_REPOSITORY`.
- Use cases: `[verb]-[name].use-case.ts`, clase `VerbNameUseCase`.
- Implementaciones: `[tecnología]-[name].repository.ts` (`drizzle-category.repository.ts`, `typeorm-order.repository.ts`).

## Anti-patrones — rechazar en review

- ❌ Controller inyectando el repository o el cliente del ORM.
- ❌ Service importando tipos del ORM en su firma pública.
- ❌ Nivel 2 completo en módulos CRUD sin reglas de negocio.
- ❌ Port con métodos que nadie usa "por completitud".
- ❌ Entity de dominio acoplada al schema del ORM.
- ❌ Lógica de negocio en el controller o en el repository (el repository solo persiste y mapea).