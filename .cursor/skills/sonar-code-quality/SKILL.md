---
name: sonar-code-quality
description: >
  Guía para escribir y refactorizar código TypeScript/NestJS que pase SonarQube/SonarLint
  con buena calidad: complejidad cognitiva y ciclomática, complejidad algorítmica (Big-O),
  code smells, Clean Code (consistent/intentional/adaptable/responsible) y Quality Gate
  (Clean as You Code). Usar cuando se escriba o revise una función/método/clase y se quiera
  bajar complejidad, eliminar code smells, evitar duplicación, mejorar mantenibilidad, o
  cuando aparezca un issue de Sonar tipo "Refactor this function to reduce its Cognitive
  Complexity from X to the 15 allowed", o se pida "déjalo limpio para Sonar" / "revísalo
  por complejidad". Para reglas de seguridad ver `backend-security-rules` y `owasp-top10`.
---

# Sonar — Calidad y Complejidad de Código (TypeScript/NestJS)

Objetivo: escribir código que sea **fácil de entender y mantener** y que **pase el Quality
Gate de Sonar** sin pelear con el linter. Cubre dos "complejidades" distintas que se suelen
confundir:

- **Complejidad cognitiva / ciclomática** (lo que mide Sonar): qué tan difícil es *entender* y *testear* el código.
- **Complejidad algorítmica (Big-O)**: qué tan bien *escala* el código en tiempo/memoria.

Las dos importan y se atacan distinto. Esta skill cubre ambas.

---

## 1. Complejidad Cognitiva (la métrica estrella de Sonar)

Mide cuán difícil es para un humano seguir el flujo de control. **Umbral por defecto: 15
por función.** Si lo superas, Sonar bloquea (en CI/PR) con un mensaje como:
`Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed.`

### Cómo se suma (idea práctica)
- **+1** cada vez que rompes el flujo lineal: `if`, `else if`, `for`, `while`, `catch`, `switch`, `&&`/`||` encadenados, operador ternario, `break`/`continue` con label, recursión.
- **+ penalización por anidamiento**: un `if` dentro de un `if` dentro de un `for` cuesta más que tres `if` planos. **El anidamiento es el principal enemigo.**
- No penaliza atajos legibles (un `switch` cuenta como 1, no como N casos).

> Diferencia con **complejidad ciclomática** (McCabe): esa cuenta *caminos* (≈ casos de
> prueba necesarios) y trata todo `if` igual sin importar el anidamiento. Sonar mantiene
> ambas; prioriza **cognitiva** para mantenibilidad. Guía: cognitiva ≤ 15, ciclomática ≤ 10–15.

### Las 4 técnicas que bajan la complejidad cognitiva

**1) Guard clauses / early return — aplana el anidamiento (la #1)**

```typescript
// ❌ Cognitive ~6, anidado y difícil
function getPrice(user, product) {
  if (user) {
    if (user.isActive) {
      if (product) {
        return product.price * (user.isVip ? 0.9 : 1);
      }
    }
  }
  return 0;
}

// ✅ Cognitive ~2, plano y legible
function getPrice(user, product) {
  if (!user?.isActive) return 0;
  if (!product) return 0;
  return product.price * (user.isVip ? 0.9 : 1);
}
```

**2) Extraer funciones — cada helper baja la complejidad del método principal**

```typescript
// ❌ una función gigante que valida + calcula + persiste (Cognitive 20+)
// ✅ divide:
function createOrder(dto) {
  validateItems(dto.items);            // helper
  const total = calculateTotal(dto);   // helper
  return persistOrder(dto, total);     // helper
}
```

**3) Reemplazar condiciones booleanas complejas por funciones con nombre**

```typescript
// ❌ if ((x && y) || (y && z) || (x && z)) { ... }
// ✅ if (hasAtLeastTwo(x, y, z)) { ... }   ← intención explícita, +0 anidamiento
```

**4) Map/objeto de despacho en vez de cadenas `if/else if` o `switch` largos**

```typescript
// ❌ if (t==='add'){...} else if (t==='sub'){...} else if (t==='set'){...}
// ✅
const handlers = { add: addFn, sub: subFn, set: setFn };
return (handlers[t] ?? defaultFn)(payload);
```

> ⚠️ **Trampa de la sobre-fragmentación:** no partas en 20 micro-funciones de 1 línea solo
> para bajar el número. Si un helper solo se usa una vez y oscurece el flujo, perjudica la
> legibilidad. Busca el equilibrio: funciones cohesivas con un propósito claro.

---

## 2. Complejidad Algorítmica (Big-O) — rendimiento y escalabilidad

Sonar no calcula Big-O, pero tiene reglas que detectan patrones costosos, y es lo que de
verdad rompe en producción con muchos datos.

| Patrón | Costo | Arréglalo con |
|---|---|---|
| Bucle dentro de bucle sobre los mismos datos | O(n²) | `Map`/`Set` para lookups O(1) |
| `array.includes()` / `find()` dentro de un loop | O(n²) | Pre-construir un `Set`/`Map` |
| Consultas a BD dentro de un `for` (N+1 queries) | O(n) round-trips | `IN (...)`, `relations`, join o batch |
| `await` secuencial de tareas independientes | suma de latencias | `Promise.all([...])` |
| Re-ordenar/re-calcular dentro del loop | O(n·m) | Calcular una vez fuera del loop |

```typescript
// ❌ O(n²): por cada order busca su user recorriendo el array
orders.map(o => ({ ...o, user: users.find(u => u.id === o.userId) }));

// ✅ O(n): índice una vez, lookup O(1)
const byId = new Map(users.map(u => [u.id, u]));
orders.map(o => ({ ...o, user: byId.get(o.userId) }));
```

```typescript
// ❌ N+1 queries (mata la BD)
for (const id of ids) results.push(await repo.findOne({ where: { id } }));

// ✅ 1 query
const results = await repo.find({ where: { id: In(ids) } });
```

```typescript
// ❌ secuencial: latencias se suman
const a = await getA(); const b = await getB(); const c = await getC();
// ✅ paralelo si son independientes
const [a, b, c] = await Promise.all([getA(), getB(), getC()]);
```

> Regla mental: antes de aceptar un bucle anidado o un `find/includes` dentro de un loop,
> pregúntate "¿esto es O(n²)? ¿puedo indexar con Map/Set?". Y nunca consultes la BD dentro
> de un bucle.

---

## 3. Modelo "Clean Code" de Sonar (cómo clasifica los issues)

Sonar evalúa contra **4 atributos de Clean Code**: **consistent, intentional, adaptable,
responsible**. Cada issue impacta una de **3 cualidades de software**: **security,
reliability, maintainability** (con severidad por cualidad en el modo MQR).

Tipos de hallazgo:
- **Bug** → fiabilidad (reliability).
- **Code smell** → mantenibilidad (genera *technical debt*).
- **Vulnerability / Security hotspot** → seguridad (ver skill `owasp-top10`).
- **Duplications / Coverage** → métricas del Quality Gate.

---

## 4. Quality Gate — "Clean as You Code"

Sonar evalúa sobre todo el **código nuevo o modificado** (Sonar way), no te obliga a
arreglar todo el legacy. El Quality Gate por defecto **Sonar way** falla el build si en el
código nuevo:

- Se introducen issues nuevos (idealmente **0 nuevos issues**).
- Cobertura de tests sobre código nuevo por debajo del umbral (típico **≥ 80%**).
- Duplicación sobre código nuevo por encima del umbral (típico **≤ 3%**).
- Security hotspots sin revisar.
- Ratings de fiabilidad/seguridad/mantenibilidad por debajo de **A** en código nuevo.

> 🤖 **Código generado por IA:** Sonar añadió un Quality Gate dedicado **"Sonar way for AI
> Code"** (AI Code Assurance) recomendado cuando parte del código lo escribe un asistente.
> Si usas IA para generar código, considera activarlo: aplica estándares más estrictos al
> código nuevo. Igual: **revisa y testea** lo generado, no lo mergees a ciegas.

Capas recomendadas: **SonarLint en el IDE** (arregla al escribir) → **análisis de PR**
(bloquea merge sucio) → **análisis de rama** (rama lista para release).

---

## 5. Code smells comunes en TS/NestJS y su fix

| Smell (regla Sonar) | Problema | Fix |
|---|---|---|
| Cognitive Complexity > 15 | Función difícil de seguir | Guard clauses + extraer helpers |
| Anidamiento profundo (`brain-overload`) | >3-4 niveles | Early return, invertir condición |
| Demasiados parámetros (>4–7) | Firma frágil | Agrupar en un objeto/DTO |
| Código duplicado | Mantenimiento doble | Extraer función/utilidad compartida |
| `any` en TypeScript | Pierde type-safety (bugs) | Tipar; `unknown` + narrowing si hace falta |
| Variable/import sin usar | Ruido | Eliminar |
| `==` en vez de `===` | Coerción inesperada | Usar `===`/`!==` |
| Promesa sin `await`/`catch` | Errores silenciosos | `await` + manejo de error |
| Función muy larga (>50–80 líneas) | Hace demasiado | Dividir por responsabilidad |
| Valores mágicos (números/strings) | Poco claro | Constantes con nombre |
| Bloque `catch` vacío | Traga errores | Loguear/propagar; nunca silenciar |
| Identical sub-expressions / collapsible `if` | Bug latente | Fusionar/simplificar |
| Retornos de tipos distintos | Confuso/buggy | Tipo de retorno consistente |

Ejemplo (parámetros → objeto):

```typescript
// ❌ Sonar: "Function has too many parameters"
function updateBalance(userId, amount, op, opId, opRole, ip, ua) { ... }

// ✅
interface UpdateBalanceCmd { userId: string; amountCents: number; op: 'add'|'sub'|'set'; operator: { id: string; role: Role; ip: string; userAgent: string } }
function updateBalance(cmd: UpdateBalanceCmd) { ... }
```

---

## 6. Cómo correrlo

**SonarLint en el IDE** (lo más útil: feedback en vivo). Instala la extensión y, opcional,
conéctala a tu SonarQube (Connected Mode) para compartir reglas del equipo.

**`sonar-project.properties` (proyecto Node/Nest):**
```properties
sonar.projectKey=mi-backend
sonar.sources=src
sonar.tests=test
sonar.test.inclusions=**/*.spec.ts,**/*.e2e-spec.ts
sonar.exclusions=**/node_modules/**,**/dist/**,**/*.module.ts
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
```

**Análisis local / CI:**
```bash
# generar cobertura primero (Jest)
npm run test -- --coverage
# escanear (requiere un servidor SonarQube y token)
npx sonar-scanner -Dsonar.host.url=$SONAR_URL -Dsonar.token=$SONAR_TOKEN
```

Integra el escaneo en el pipeline para que el **Quality Gate** bloquee PRs que no cumplan.

---

## 7. Checklist antes de hacer commit

- [ ] ¿Alguna función supera **Cognitive Complexity 15**? → aplana con guard clauses / extrae helpers.
- [ ] ¿Anidamiento > 3 niveles? → invierte condiciones y retorna temprano.
- [ ] ¿Bucle dentro de bucle o `find/includes` dentro de un loop? → indexa con `Map`/`Set`.
- [ ] ¿Consultas a BD dentro de un `for` (N+1)? → batch / `In(...)` / relations.
- [ ] ¿`await` secuenciales independientes? → `Promise.all`.
- [ ] ¿Más de ~4–5 parámetros? → agrupa en objeto/DTO.
- [ ] ¿Código duplicado (>3%)? → extrae utilidad común.
- [ ] ¿`any`, variables/imports sin usar, `==`, valores mágicos, `catch` vacío? → corrige.
- [ ] ¿Cobertura de tests del código nuevo ≥ umbral (≈80%)?
- [ ] ¿Pasa el Quality Gate **Sonar way** (0 issues nuevos)?
- [ ] Si es código generado por IA: ¿revisado, testeado y, si aplica, bajo **Sonar way for AI Code**?

---

## Referencias
- Cognitive Complexity (white paper, G. Ann Campbell) — https://www.sonarsource.com/resources/cognitive-complexity/
- 5 tips para reducir complejidad cognitiva — https://www.sonarsource.com/blog/5-clean-code-tips-for-reducing-cognitive-complexity/
- Clean Code & Quality Gates — https://docs.sonarsource.com/sonarqube-server/user-guide/about-new-code
- Reglas TypeScript/JS de Sonar — https://rules.sonarsource.com/typescript/