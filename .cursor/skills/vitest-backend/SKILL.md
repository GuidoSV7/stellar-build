---
name: vitest-backend
description: >
  Guía para escribir tests unitarios de backend con Vitest en proyectos NestJS + Drizzle ORM.
  Leer SIEMPRE antes de crear o modificar tests de servicios, controllers o guards.
  Activar también cuando el usuario mencione "test", "spec", "mock", "vitest",
  "testing module", "spy", "coverage" en el contexto del backend o NestJS.
---

# Vitest — Testing de Backend (NestJS + Drizzle ORM)

## Setup

### Dependencias
```bash
npm install -D vitest unplugin-swc @swc/core
```

### vitest.config.ts
```ts
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.module.ts', 'src/main.ts', 'drizzle/'],
    },
  },
})
```

### package.json
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Mock de Drizzle ORM

Con Drizzle se mockea la instancia de DB completa (no un repositorio como en TypeORM).
Cada método retorna `this` para soportar el encadenamiento del query builder.

```ts
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  transaction: vi.fn(),
}
```

> ⚠️ Después de `vi.clearAllMocks()` hay que resetear los `.mockReturnThis()` manualmente
> ya que clearAllMocks los borra. Ver patrón en el beforeEach de abajo.

---

## 1. Tests de Servicios con Drizzle

```ts
// categories.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotFoundException, InternalServerErrorException } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { DRIZZLE } from '../database/database.module'

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}

const resetChaining = () => {
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.offset.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.set.mockReturnThis()
}

describe('CategoriesService', () => {
  let service: CategoriesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile()

    service = module.get<CategoriesService>(CategoriesService)
    vi.clearAllMocks()
    resetChaining() // restaurar encadenamiento después de clearAllMocks
  })

  describe('findAll', () => {
    it('retorna lista de categorías activas', async () => {
      const mockCategories = [
        { id: '1', name: 'Electrónica', state: true },
        { id: '2', name: 'Ropa', state: true },
      ]
      mockDb.orderBy.mockResolvedValueOnce(mockCategories)

      const result = await service.findAll({ limit: 10, offset: 0 })

      expect(mockDb.select).toHaveBeenCalled()
      expect(result).toEqual(mockCategories)
    })

    it('retorna lista vacía si no hay categorías', async () => {
      mockDb.orderBy.mockResolvedValueOnce([])
      const result = await service.findAll({ limit: 10, offset: 0 })
      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('retorna la categoría si existe', async () => {
      const mock = { id: '1', name: 'Electrónica', state: true }
      mockDb.limit.mockResolvedValueOnce([mock])

      const result = await service.findOne('1')
      expect(result).toEqual(mock)
    })

    it('lanza NotFoundException si no existe', async () => {
      mockDb.limit.mockResolvedValueOnce([])
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('inserta y retorna la categoría creada', async () => {
      const dto = { name: 'Nueva', state: true }
      const created = { id: '1', ...dto }
      mockDb.returning.mockResolvedValueOnce([created])

      const result = await service.create(dto)

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nueva' }),
      )
      expect(result).toEqual(created)
    })

    it('lanza InternalServerErrorException si falla la BD', async () => {
      mockDb.returning.mockRejectedValueOnce(new Error('DB error'))
      await expect(service.create({ name: 'Falla' })).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  describe('remove (soft delete)', () => {
    it('desactiva la categoría (state: false)', async () => {
      const existing = { id: '1', name: 'Electrónica', state: true }
      const deleted = { ...existing, state: false }
      mockDb.limit.mockResolvedValueOnce([existing])
      mockDb.returning.mockResolvedValueOnce([deleted])

      const result = await service.remove('1')

      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ state: false }),
      )
      expect(result.category.state).toBe(false)
    })
  })

  describe('restore', () => {
    it('reactiva una categoría eliminada', async () => {
      const deleted = { id: '1', state: false }
      const restored = { ...deleted, state: true }
      mockDb.limit.mockResolvedValueOnce([deleted])
      mockDb.returning.mockResolvedValueOnce([restored])

      const result = await service.restore('1')
      expect(result.category.state).toBe(true)
    })

    it('lanza error si la categoría ya está activa', async () => {
      mockDb.limit.mockResolvedValueOnce([{ id: '1', state: true }])
      await expect(service.restore('1')).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })
})
```

---

## 2. Tests de Controllers

```ts
// categories.controller.spec.ts
const mockCategoriesService = {
  create: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  restore: vi.fn(),
}

describe('CategoriesController', () => {
  let controller: CategoriesController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile()

    controller = module.get<CategoriesController>(CategoriesController)
    vi.clearAllMocks()
  })

  it('findAll delega al servicio con paginación', async () => {
    const mockResult = [{ id: '1', name: 'Electrónica' }]
    mockCategoriesService.findAll.mockResolvedValue(mockResult)

    const result = await controller.findAll({ limit: 10, offset: 0 })

    expect(mockCategoriesService.findAll).toHaveBeenCalledWith({ limit: 10, offset: 0 })
    expect(result).toEqual(mockResult)
  })

  it('create pasa el DTO al servicio', async () => {
    const dto = { name: 'Nueva', state: true }
    const created = { id: '1', ...dto }
    mockCategoriesService.create.mockResolvedValue(created)

    const result = await controller.create(dto)

    expect(mockCategoriesService.create).toHaveBeenCalledWith(dto)
    expect(result).toEqual(created)
  })

  it('remove llama al servicio con el id correcto', async () => {
    mockCategoriesService.remove.mockResolvedValue({ message: 'deleted' })
    await controller.remove('1')
    expect(mockCategoriesService.remove).toHaveBeenCalledWith('1')
  })

  it('restore llama al servicio con el id correcto', async () => {
    mockCategoriesService.restore.mockResolvedValue({ message: 'restored' })
    await controller.restore('1')
    expect(mockCategoriesService.restore).toHaveBeenCalledWith('1')
  })
})
```

---

## 3. Tests de Guards

```ts
// jwt-auth.guard.spec.ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

const mockJwtService = { verifyAsync: vi.fn() }
const mockConfigService = { get: vi.fn().mockReturnValue('test-secret') }

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    guard = module.get<JwtAuthGuard>(JwtAuthGuard)
    vi.clearAllMocks()
  })

  const mockContext = (token?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: token ? `Bearer ${token}` : undefined },
        }),
      }),
    }) as unknown as ExecutionContext

  it('permite acceso con token válido', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ sub: '1', email: 'ana@mail.com' })
    expect(await guard.canActivate(mockContext('valid-token'))).toBe(true)
  })

  it('lanza UnauthorizedException sin token', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException)
  })

  it('lanza UnauthorizedException con token inválido', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'))
    await expect(guard.canActivate(mockContext('bad-token'))).rejects.toThrow(
      UnauthorizedException,
    )
  })
})
```

---

## Mocks de servicios comunes

### ConfigService
```ts
{ provide: ConfigService, useValue: {
  get: vi.fn((key: string) => ({ JWT_SECRET: 'test-secret' }[key])),
}}
```

### Paginación con Promise.all (data + count)
```ts
// El servicio hace Promise.all([dataQuery, countQuery])
// Mockear ambas resoluciones en orden
vi.spyOn(Promise, 'all').mockResolvedValueOnce([
  [{ id: '1', name: 'Electrónica' }],  // data
  [{ value: 1 }],                       // count
])
```

---

## Qué cubrir por tipo

| Tipo | Casos obligatorios |
|---|---|
| **Servicio** | Happy path, not found, error de BD, soft delete, restore, paginación con filtros |
| **Controller** | Delegación al servicio, paso correcto de DTOs e IDs |
| **Guard** | Token válido, sin token, token inválido, rol insuficiente |

## Cobertura sugerida

| Tipo | Objetivo |
|---|---|
| Servicios | 90%+ |
| Controllers | 70–80% |
| Guards | 90%+ |
| Módulos / schemas / main.ts | No necesario |

```bash
npm run test:coverage
```