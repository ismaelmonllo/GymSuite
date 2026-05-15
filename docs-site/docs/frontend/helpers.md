---
title: Helpers del cliente
sidebar_position: 5
description: utils.js, helpers de medición y composición corporal.
tags: [frontend, helpers, utils]
---

Tres archivos de helpers en el frontend:

| Archivo | Propósito |
|---------|-----------|
| `client/src/utils.js` | Globales: conversión céntimos, formato fecha/importe |
| `client/src/utils/medicion.js` | Helpers puros del formulario de mediciones |
| `client/src/utils/composicionCorporal.js` | Cálculos IMC, % grasa |

## `utils.js` — Globales

### `centimosAEuros(centimos)` → number

```js
centimosAEuros(4050)  // 40.5
centimosAEuros(null)  // 0
centimosAEuros('foo') // 0
```

Implementación: `(Number(centimos) || 0) / 100`.

### `eurosACentimos(euros)` → integer

```js
eurosACentimos(40.5)  // 4050
eurosACentimos(0.1)   // 10 (Math.round mitiga el error de coma flotante)
```

Implementación: `Math.round(Number(euros) * 100)`. **Importante**: `0.1 * 100 !== 10` sin redondeo.

### `formatearImporte(centimos)` → string

```js
formatearImporte(4000)  // "40 €"
formatearImporte(4050)  // "40,50 €"
formatearImporte(null)  // "0 €"
```

Coma decimal estilo es-ES. Internamente usa `centimosAEuros` y `toFixed(2).replace('.', ',')`. Si el resultado tiene `.00`, omite los decimales.

### `formatearFecha(fecha)` → string

```js
formatearFecha('2026-05-13T10:30:00Z')  // "13/05/2026"
formatearFecha(null)                    // "—"
```

Acepta `Date` o string ISO. Devuelve `—` si falsy.

## `utils/medicion.js` — Form de mediciones

| Helper | Devuelve | Uso |
|--------|----------|-----|
| `PERIMETROS` | `[{ id, label }]` × 10 | Iterar inputs de perímetros |
| `PLIEGUES` | `[{ id, label }]` × 4 | Iterar inputs de pliegues |
| `CAMPOS_OBLIGATORIOS` | `string[]` | Marca visual (peso, altura, perímetros, pliegues). **Excluye** `fecha` y `porcentaje_grasa` |
| `CAMPOS_NUMERICOS` | `Set<string>` | `prepararBody` los convierte a `Number` |
| `hoy()` | `'YYYY-MM-DD'` | Default `<input type="date">` |
| `prepararBody(datos)` | object | Filtra strings vacíos (`v !== ''`), convierte numéricos |
| `formVacio()` | object | Todos los campos `''`, `fecha = hoy()` |
| `formDesdeMedicion(medicion)` | object | Mapea medición → strings. `fecha` truncada a `YYYY-MM-DD` |

## `utils/composicionCorporal.js` — Cálculos

### `calcularIMC(peso, altura)` → Number \| null

```
peso(kg) / (altura(m))² = peso / (altura/100)²
```

Redondeo a 1 decimal. Devuelve `null` si `peso` o `altura` falsy (incluyendo 0).

| Input | Output |
|-------|--------|
| 70 kg, 175 cm | `22.9` |
| 0, 175 | `null` |
| 70, 0 | `null` |

### `calcularPorcentajeGrasa(pliegues, sexo, fechaNacimiento)` → Number \| null

Durnin-Womersley (1974). Algoritmo completo: [Backend → Mediciones cálculo](../backend/mediciones-calculo.md#porcentaje-de-grasa-durnin-womersley-1974).

```js
calcularPorcentajeGrasa(
  { biceps: 6, triceps: 12, subescapular: 14, cresta_iliaca: 18 },
  'masculino',
  '1995-03-12'
)
// → 19.0
```

Constantes `CONSTANTES_DW` privadas del módulo (no exportadas).

## Patrón "preparar body antes de mandar"

Para mediciones:

```js
import { prepararBody } from './utils/medicion.js';

const body = prepararBody(form);   // filtra '', convierte a Number
await api.post('/api/mediciones', body);
```

Para importes:

```js
import { eurosACentimos } from './utils.js';

const body = { nombre, meses, importe: eurosACentimos(formImporteEuros) };
await api.post('/api/cuotas', body);
```

## Patrón "formatear al pintar"

```jsx
import { formatearImporte, formatearFecha } from './utils.js';

<span>{formatearImporte(pago.importe)}</span>      // "40,50 €"
<span>{formatearFecha(pago.fecha)}</span>          // "13/05/2026"
```

## Lecturas relacionadas

- [Backend → Mediciones cálculo](../backend/mediciones-calculo.md) — fórmulas completas
- [Backend → Pagos lógica](../backend/pagos-logica.md) — reparto céntimos
- [Estilos](./estilos.md)
