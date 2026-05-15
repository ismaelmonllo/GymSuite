---
title: Endpoints de Pagos
sidebar_position: 6
description: Operaciones REST sobre pagos mensuales y cron de generación.
tags: [backend, api, pagos]
---

Endpoints bajo `/api/pagos/*`. Controller: `server/controllers/pagosController.js`. Modelo: [Pago](../modelos.md#pagos). Lógica detallada: [Pagos lógica](../pagos-logica.md).

<a id="get-apipagosclienteid"></a>

## `GET /api/pagos/cliente/:id_usuario`

Historial de pagos de un cliente.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Params:** `id_usuario` — ObjectId del cliente.

**200:** array ordenado por `mes: -1` (lexicográfico funciona porque `YYYY-MM`).

**Errores:** 400 ID inválido, 404 sin pagos.

<a id="get-apipagosmis-pagos"></a>

## `GET /api/pagos/mis-pagos`

Pagos propios del cliente autenticado.

**Permisos:** `verificarToken` + `verificarRol('cliente')`.

**200:** array de pagos.

**404:** sin pagos.

<a id="post-apipagosgenerar"></a>

## `POST /api/pagos/generar`

Genera pagos del mes actual para clientes activos con cuota.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Sin body.**

**200/201:**

```json
{
  "mensaje": "...",
  "generados": 12,
  "clientes_procesados": 5
}
```

**Lógica resumida** (detalle en [Pagos lógica](../pagos-logica.md)):

1. Listar clientes `activo: true` con `tipo_cuota` poblado.
2. Saltar clientes que ya tienen pago para el mes actual.
3. Por cada uno: repartir `importe` en `meses` filas, último mes lleva el resto.
4. Insertar todas con `pendiente: true` y mismo `grupo_pago` (ObjectId compartido).

**Cuando `generados === 0`:**

```json
{ "mensaje": "Todos los clientes ya tienen pagos generados para este mes", "generados": 0 }
```

<a id="post-apipagosgenerar-cron"></a>

## `POST /api/pagos/generar-cron`

Idéntico a `/generar` pero autenticado por header (no JWT).

**Permisos:** `verificarCronSecret` — header `x-cron-secret` debe coincidir con `process.env.CRON_SECRET`.

**Headers:**

| Header | Valor |
|--------|-------|
| `x-cron-secret` | `<CRON_SECRET>` |

**Sin body. Misma respuesta que `/generar`.**

**401:** sin header o no coincide.

Detalle: [Operaciones → Cron de pagos](../../operaciones/cron-pagos.md).

<a id="post-apipagosregistrar"></a>

## `POST /api/pagos/registrar`

Confirma todos los pagos de un grupo (cobro recibido).

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Body:**

```json
{ "grupo_pago": "<ObjectId>" }
```

`registrado_por` se toma de `req.usuario.id`.

**200:**

```json
{ "mensaje": "...", "actualizados": 3 }
```

`Pagos.updateMany({ grupo_pago }, { pendiente: false, fecha: new Date(), registrado_por })`.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID inválido |
| 404 | Grupo no encontrado |

> 💡 **Confirmar siempre por grupo**
>
> Una cuota trimestral genera 3 filas con mismo `grupo_pago`. Confirmar mes a mes rompería la consistencia. Siempre por grupo.
