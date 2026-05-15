---
title: Endpoints de Estadísticas
sidebar_position: 8
sidebar_label: Stats
description: Endpoints de estadísticas para el dashboard del admin.
tags: [backend, api, stats]
---

Endpoints bajo `/api/stats/*`. Mezcla controllers: `pagosController.js` y `usuarioController.js`. Todos requieren admin salvo `ultimo-pago` que también permite entrenador.

<a id="get-apistatsmes"></a>

## `GET /api/stats/mes`

Facturación confirmada del mes actual.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**Controller:** `pagosController.obtenerStatsMes`.

**200:**

```json
{ "mes": "2026-05", "total": 32000 }
```

`total` en céntimos (320 €).

**Implementación:** `aggregate` con `$match: { mes, pendiente: false }` + `$group: { total: $sum 'importe' }`.

<a id="get-apistatsanual"></a>

## `GET /api/stats/anual`

Facturación de los últimos 12 meses (incluye actual).

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:** array de 12 entradas:

```json
[
  { "mes": "2025-06", "total": 28000 },
  { "mes": "2025-07", "total": 32500 },
  ...
  { "mes": "2026-05", "total": 32000 }
]
```

Rellena con `0` los meses sin datos.

<a id="get-apistatsmes-pagados"></a>

## `GET /api/stats/mes-pagados`

Número de pagos confirmados del mes actual.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:**

```json
{ "mes": "2026-05", "total": 18 }
```

`countDocuments({ mes, pendiente: false })`.

<a id="get-apistatsmes-pendientes"></a>

## `GET /api/stats/mes-pendientes`

Igual con `pendiente: true`.

**200:** `{ mes, total: 7 }`.

<a id="get-apistatstotal-clientes"></a>

## `GET /api/stats/total-clientes`

Clientes activos.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**Controller:** `usuarioController.obtenerTotalClientes`.

**200:** `{ total: 24 }`.

<a id="get-apistatstotal-trabajadores"></a>

## `GET /api/stats/total-trabajadores`

Suma de admins + entrenadores activos.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:** `{ total: 6 }`.

<a id="get-apistatsaltas-mensuales"></a>

## `GET /api/stats/altas-mensuales`

Clientes dados de alta en el mes y en los últimos 12 meses.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**Controller:** `usuarioController.obtenerStatsAltas`.

**200:**

```json
{ "ultimoMes": 3, "ultimoAnio": 24 }
```

Calcula `inicioMes` y `inicioAnio` (hace 12 meses) y cuenta clientes con `fecha_alta >= inicio`.

<a id="get-apistatsultimo-pago"></a>

## `GET /api/stats/ultimo-pago`

Mapa del último pago por cliente (ignorando meses futuros).

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**200:**

```json
{
  "6630a1b2c3d4e5f6a7b8c9d0": {
    "pendiente": false,
    "mes": "2026-05",
    "grupo_pago": "...",
    "tipo_cuota": "Mensual"
  },
  ...
}
```

**Implementación:** `aggregate` con `$match: { mes: { $lte: mesActual } }` → `$sort: { mes: -1 }` → `$group: { _id: '$cliente_id', ...$first }`.

El frontend lo convierte a mapa para acceso O(1) desde la tabla.
