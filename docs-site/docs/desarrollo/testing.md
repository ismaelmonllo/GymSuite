---
title: Testing
sidebar_position: 4
description: Estado actual del testing y plan.
tags: [desarrollo, testing]
---

> ℹ️ **Estado actual**
>
> **Tests de fase 1 y 2 implementados.** Vitest instalado en `server/`. 40 tests pasando. Fases 3 (integration) y 4 (E2E) aún pendientes.

## Ejecutar tests

```bash
cd GymSuite/server
npm test          # vitest run (una vez)
npm run test:watch  # modo watch
```

## Tests existentes — `server/__tests__/`

### `validadores.test.js` — 34 tests

Cubre las funciones atómicas de `validators/validarCampos.js`:

| Grupo | Qué verifica |
|-------|--------------|
| `validarDNI` | DNI educativo (divisor `% 19`), longitud, sin letra, vacío |
| `validarTelefono` | Prefijo educativo `5`, `+34` opcional, longitud |
| `validarImporte` | Entero positivo, rechaza decimal / cero / negativo / string |
| `validarObjectId` | Hex 24 chars, rechaza 23 chars, rechaza no-hex |
| `validarMeses` | 1–24, rechaza 0, rechaza 25, rechaza decimal |
| `validarCorreo` | Formato básico |
| `validarContrasena` | 12+ chars, min/may/num/símbolo obligatorios |

### `pagos.test.js` — 6 tests

Cubre lógica de fechas y reparto de importes (la lógica de mayor riesgo):

| Grupo | Qué verifica |
|-------|--------------|
| `formatearMes` | Enero/diciembre/septiembre con padding correcto |
| `sumarMeses` | +1 mes, overflow diciembre → enero año siguiente, resta |
| Reparto de importe | `1100/3` suma exacta, sin resto, con resto, múltiples casos |

## Por qué no hay más tests todavía

- Proyecto académico individual con plazo ajustado.
- Iteración rápida; el coste de mantener tests con cada refactor era alto.

## Plan de testing

### Fase 1 — Validadores y helpers puros (alta ROI)

Funciones sin side-effects, fáciles de testear, alto valor.

| Módulo | Tests sugeridos |
|--------|-----------------|
| `validators/validarCampos.js` | Cada validador con inputs válidos + inválidos (DNI, teléfono, importe, fecha, etc.) |
| `validators/validarRegistros.js` | Cada compuesto con datos completos / parciales / inválidos |
| `client/src/utils.js` | `centimosAEuros`, `eurosACentimos`, `formatearImporte`, `formatearFecha` |
| `client/src/utils/composicionCorporal.js` | `calcularIMC`, `calcularPorcentajeGrasa` con valores conocidos |
| `client/src/utils/medicion.js` | `prepararBody`, `formVacio`, `formDesdeMedicion` |
| `server/utils/passwords.js` | `generarPasswordTemporal` cumple política (12 chars, min, may, num, símb) |

**Herramienta:** Vitest (compatible con Vite, sintaxis Jest-like).

### Fase 2 — Lógica de pagos (alto riesgo)

Reparto de céntimos. Bug aquí = pérdida de dinero.

```js
// Ejemplos de test
test('reparto trimestral 11000 céntimos', () => {
  const pagos = generarPagosTest({ importe: 11000, meses: 3 });
  expect(pagos.map(p => p.importe)).toEqual([3666, 3666, 3668]);
  expect(pagos.reduce((s, p) => s + p.importe, 0)).toBe(11000);
});

test('reparto anual 36000 céntimos en 12 meses', () => {
  const pagos = generarPagosTest({ importe: 36000, meses: 12 });
  expect(pagos.every(p => p.importe === 3000)).toBe(true);
});
```

### Fase 3 — Endpoints (integration)

Backend + Mongo de test. Probar:

- Login → recibe token o `requiere2FA`.
- Refresh → nuevo token.
- Crear cliente → 201 con cliente, email enviado (mock mailer).
- Generar pagos → idempotente.
- Permisos → 401/403 en los casos correspondientes.

**Herramienta:** Supertest + Vitest. Mongo de test con `mongodb-memory-server`.

### Fase 4 — E2E

Login + 3 dashboards completos. Playwright o Cypress.

## Estructura sugerida

```
server/
├── __tests__/
│   ├── validators/
│   │   ├── validarCampos.test.js
│   │   └── validarRegistros.test.js
│   ├── utils/
│   │   └── passwords.test.js
│   └── controllers/
│       ├── auth.test.js
│       └── pagos.test.js
client/
├── src/
│   └── __tests__/
│       ├── utils.test.js
│       └── composicionCorporal.test.js
e2e/
├── login.spec.js
├── admin-dashboard.spec.js
└── cliente-dashboard.spec.js
```

## Cómo se ejecutaría (cuando exista)

```bash
# Backend
cd server
npm test                    # Vitest run
npm run test:watch          # modo watch
npm run test:coverage       # coverage report

# Frontend
cd client
npm test
npm run test:coverage

# E2E
cd e2e
npx playwright test
```

## Comprobaciones manuales actuales

Sin tests, usar este checklist tras cambios grandes:

### Login

- [ ] Login admin (pestaña Trabajador) → admin dashboard.
- [ ] Login entrenador → entrenador dashboard.
- [ ] Login cliente → cliente dashboard.
- [ ] Credenciales mal → 401 mostrado.
- [ ] Cliente intenta pestaña Trabajador → 403.

### CRUD clientes

- [ ] Crear cliente → email recibido + alta visible en tabla.
- [ ] Editar nombre → cambio visible.
- [ ] Baja → badge "Baja", acciones de modificación ocultas.
- [ ] Alta → badge "Activo", `fecha_alta` actualizada.
- [ ] Cambiar cuota → pagos pendientes regenerados.

### Pagos

- [ ] Generar pagos mes → contador `generados > 0` la primera vez.
- [ ] Generar de nuevo → contador `generados = 0` (idempotente).
- [ ] Confirmar pago → badge Pendiente → Confirmado.
- [ ] Cubierto hasta correcto para cuota trimestral.

### Mediciones

- [ ] Crear medición → aparece en historial, `porcentaje_grasa` calculado.
- [ ] Editar medición → cambios guardados.
- [ ] StepperFecha navega entre mediciones cronológicamente.

### Auth avanzada

- [ ] Token expira 15m → refresh automático.
- [ ] Refresh expira 7d → logout automático.
- [ ] Cambio forzoso de contraseña → modal bloquea, JWT nuevo cierra.

## Lecturas relacionadas

- [Estilo de código](./estilo-codigo.md)
- [Git workflow](./git-workflow.md)
- [Backend → Validadores](../backend/validadores.md) (qué validar primero)
- [Backend → Pagos lógica](../backend/pagos-logica.md) (lógica crítica)
