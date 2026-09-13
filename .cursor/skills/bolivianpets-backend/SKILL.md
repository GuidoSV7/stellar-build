---
name: bolivianpets-backend
description: >
  Overlay de producto BolivianPets para el backend ASP.NET Core.
  Leer SIEMPRE al crear o modificar código en backend/.
---

# BolivianPets — Backend overlay

## Package

- Solution: `backend/BolivianPets.slnx`
- API: `backend/src/Api` (`net10.0`, OpenAPI)

## Reglas

- Controllers delgados: validación + delegación a servicios/casos de uso.
- No filtrar secretos ni connection strings; usar configuración / env.
- Errores de negocio → códigos HTTP explícitos; no 500 genéricos para estados esperados.
- Stack NestJS/TypeORM en `.cursor/skills/` **no** es el default de este backend.

## Stellar desde API

Si el endpoint habla con chain o indexa datos Stellar: `.cursor/skills/stellar/data/SKILL.md` y/o `.cursor/skills/stellar/dapp/SKILL.md`.

## Gate

```bash
dotnet build backend/BolivianPets.slnx
```
