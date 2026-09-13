---
alwaysApply: true
---

# Subagent — Backend (ASP.NET Core)

Detalle operativo del package `backend/`. Entrada: `.cursor/rules/backend-agent.mdc`.

## Stack

- ASP.NET Core `net10.0` — `BolivianPets.slnx` / `src/Api`
- OpenAPI habilitado en Development

## Overlay

Leer `.cursor/skills/bolivianpets-backend/SKILL.md` antes de cambios no triviales.

## Seguridad / calidad

- `.cursor/skills/backend-security-rules/SKILL.md`
- `.cursor/skills/owasp-top10/SKILL.md`
- `.cursor/skills/sonar-code-quality/SKILL.md`

## Stellar

`.cursor/skills/stellar/data/SKILL.md` · `.cursor/skills/stellar/dapp/SKILL.md` cuando el API integre chain.

## Gate

`dotnet build backend/BolivianPets.slnx`
