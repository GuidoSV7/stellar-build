---
name: bolivianpets-frontend
description: >
  Overlay de producto BolivianPets para el frontend (Next.js + Stellar).
  Leer SIEMPRE además de nextjs al crear o modificar código en frontend/.
---

# BolivianPets — Frontend overlay

## Package

- Path: `frontend/` (alias `@/*` → `./src/*`)
- Workspace: abrir monorepo en `stellar-build/`

## Dominios

Mapa: `frontend/src/features/README.md`.

Nuevo código → `src/features/<dominio>/`. No crear UI nueva en `app/**/_componentes` ni HTTP nuevo en `app/_lib/`.

## Chain

Stellar (no Solana). Cliente / wallet / contratos desde FE: `.cursor/skills/stellar/dapp/SKILL.md`.

## Gates

```bash
cd frontend && npm run build
cd frontend && npm test   # si el diff toca tests o lógica cubierta
```

## Skills compañeras

- `.cursor/skills/nextjs/SKILL.md` (siempre)
- `.cursor/skills/zod-4/SKILL.md`, `tailwind-4`, `seo`, `nextjs-seo`, `vitest-frontend-testing`, `playwright-e2e-next` según tarea
