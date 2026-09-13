---
name: stryker-mutation-testing
description: Mutation testing con StrykerJS para medir la calidad real de los tests (no solo cobertura) en proyectos NestJS/TypeScript con Jest. Usar SIEMPRE que el usuario mencione Stryker, mutation testing, mutantes, mutation score, pida saber si sus tests "sirven de verdad", quiera validar tests escritos por un agente de IA, o pida configurar quality gates más allá de la cobertura. También aplica al interpretar reportes de mutantes sobrevivientes o configurar Stryker en CI.
---

# Stryker — Mutation testing (BACKEND principalmente)

**Ámbito: BACKEND (NestJS + Jest) como objetivo principal.** Aplicable también a lógica pura del frontend, pero el ROI está en la lógica de negocio del backend. No aplicar a componentes React ni a tests E2E.

## Por qué existe esta capa

La cobertura mide qué líneas se EJECUTAN; el mutation score mide si los tests FALLARÍAN ante código incorrecto. Se puede tener 100% de cobertura con tests que no assertan nada — y un agente de IA optimizando "coverage" produce exactamente eso. Stryker introduce bugs deliberados (mutantes: cambia `+` por `-`, `>` por `>=`, `true` por `false`, vacía bloques) y verifica que algún test falle. Mutante muerto = bien. Mutante sobreviviente = punto ciego de la suite.

**Prerequisito**: aplicar solo cuando la suite unitaria ya existe y tiene ~80%+ de cobertura de línea en el código a mutar. Mutar código sin tests solo confirma lo obvio.

## Setup para NestJS + Jest

```bash
npm i -D @stryker-mutator/core @stryker-mutator/jest-runner @stryker-mutator/typescript-checker
```

```jsonc
// stryker.config.json
{
  "packageManager": "npm",
  "testRunner": "jest",
  "jest": {
    "projectType": "custom",
    "configFile": "jest.config.js",
    "enableFindRelatedTests": true
  },
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.module.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.entity.ts",
    "!src/main.ts",
    "!src/**/index.ts"
  ],
  "reporters": ["html", "clear-text", "progress"],
  "htmlReporter": { "fileName": "reports/mutation/index.html" },
  "thresholds": { "high": 80, "low": 65, "break": null },
  "incremental": true,
  "incrementalFile": "reports/stryker-incremental.json"
}
```

Decisiones de esta config, explicadas:
- **`mutate` restrictivo**: mutar solo lógica de negocio. Modules, DTOs, entities y main.ts generan mutantes "equivalentes" o irrelevantes que nadie puede matar y ensucian el score.
- **typescript-checker**: descarta mutantes que no compilan (CompileError) sin correr tests — ahorra mucho tiempo.
- **`coverageAnalysis: perTest` + `enableFindRelatedTests`**: Stryker corre solo los tests que cubren cada mutante, no la suite entera por mutante.
- **`incremental: true`**: reusa resultados previos y muta solo lo cambiado — imprescindible para PRs; el run completo es cosa de nightly.
- **`break: null` al inicio**: primero medir, no romper builds (ver estrategia ratchet abajo).

Correr: `npx stryker run`. Abrir el reporte HTML: muestra cada mutante, su diff y si sobrevivió.

## Cómo interpretar mutantes sobrevivientes (el trabajo real)

Por cada sobreviviente, decidir entre TRES casos:

1. **Falta un test** (el caso común): el mutante revela un comportamiento no verificado. Escribir el test que lo mata — típicamente un caso borde (`>=` vs `>`, límite de un rango, rama de error).
2. **Test débil**: hay un test que ejecuta esa línea pero no asserta el resultado (test de coreografía). Fortalecer la assertion.
3. **Mutante equivalente**: el cambio no altera el comportamiento observable (ej. una optimización interna). No perseguirlo; si se repite en una zona, excluirla de `mutate` con un comentario del porqué.

NUNCA "matar" un mutante escribiendo un test que asserta detalles de implementación solo para ese mutante. El test nuevo debe describir un comportamiento que un usuario del módulo esperaría.

## Estrategia de adopción: ratchet, no aspiración

1. **Semana 1**: correr Stryker en los 2-3 módulos de negocio más críticos. Anotar el score.
2. Arreglar los sobrevivientes de categoría 1 y 2. El score sube solo.
3. **Fijar `break` un par de puntos debajo del score real alcanzado** (ej. score 74 → break 70). El build rompe solo si la calidad RETROCEDE.
4. Subir el break a medida que el score real sube. Nunca fijar un objetivo aspiracional (break 90 con score 60) — solo genera que se desactive la herramienta.

## En CI (el gate contra tests de agente de baja calidad)

- **En PRs**: modo incremental, solo archivos cambiados, con threshold `break` activo. Esto impide que un agente mergee tests decorativos: si sus tests no matan los mutantes de su propio código nuevo, el PR no pasa.
- **Nightly/semanal**: run completo sin incremental para recalibrar la línea base.
- Cachear `reports/stryker-incremental.json` entre runs de CI.
- Presupuesto de tiempo: si el run incremental de PR supera ~10 min, restringir más el glob `mutate` o bajar mutantes con `ignorePatterns`.

## Anti-patrones a rechazar

- Usar mutation score como métrica de vanidad global mutando todo `src/` — el score pierde significado.
- Perseguir 100%: los últimos puntos son mutantes equivalentes; 80-85% en lógica de negocio es excelente.
- Correr Stryker sin `perTest`/`enableFindRelatedTests` (suites de horas → herramienta abandonada).
- Excluir archivos de `mutate` para subir el score sin dejar comentario justificando.
- Tratar un score alto como sustituto de integración/E2E: Stryker valida la suite unitaria, no el sistema.

## Checklist

- [ ] `mutate` cubre solo lógica de negocio, con exclusiones justificadas.
- [ ] typescript-checker activo y coverageAnalysis perTest.
- [ ] Modo incremental en PRs con `break` estilo ratchet; run completo nightly.
- [ ] Cada sobreviviente revisado se clasificó (test faltante / test débil / equivalente).
- [ ] Los tests nuevos escritos para matar mutantes describen comportamiento, no implementación.
