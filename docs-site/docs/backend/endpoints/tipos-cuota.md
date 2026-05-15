---
title: Endpoints de Tipos de cuota
sidebar_position: 7
sidebar_label: Tipos de cuota
description: CRUD de tipos de cuota (catálogo de productos del gimnasio).
tags: [backend, api, cuotas]
---

Endpoints bajo `/api/cuotas/*`. Controller: `server/controllers/cuotaController.js`. Modelo: [TipoCuota](../modelos.md#tipos_cuota).

<a id="get-apicuotas"></a>

## `GET /api/cuotas`

Lista todos los tipos de cuota.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**200:**

```json
{
  "cuotas": [
    { "_id": "...", "nombre": "Mensual", "meses": 1, "importe": 4000 },
    { "_id": "...", "nombre": "Trimestral", "meses": 3, "importe": 11000 },
    { "_id": "...", "nombre": "Semestral", "meses": 6, "importe": 20000 },
    { "_id": "...", "nombre": "Anual", "meses": 12, "importe": 36000 }
  ]
}
```

**Importes en céntimos.** En el ejemplo: 40 €, 110 €, 200 €, 360 €.

<a id="post-apicuotas"></a>

## `POST /api/cuotas`

Crea tipo de cuota.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**Body:**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre` | string | sí | texto general |
| `meses` | integer | sí | 1–24 |
| `importe` | integer | sí | céntimos, > 0 |

> ⚠️ **Importe en céntimos**
>
> El frontend convierte euros → céntimos con `eurosACentimos` antes de enviar. Si mandas decimales, `validarImporte` falla con 400.

**201:** `{ cuota }`.

El controller hace **destructuring explícito** `{ nombre, meses, importe }` para no aceptar campos extra del body.

<a id="put-apicuotasid"></a>

## `PUT /api/cuotas/:id`

Edita tipo de cuota.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**Body:** mismos campos.

**200:** `{ cuota }`.

**404:** no encontrada.

> ℹ️ **Pagos ya generados no cambian**
>
> Los pagos existentes que referencian esta cuota guardan el **nombre** (string), no el ObjectId. Editar la cuota no afecta a pagos antiguos. Ver [ADR-009](../../arquitectura/decisiones.md#tipo-cuota-string).

<a id="delete-apicuotasid"></a>

## `DELETE /api/cuotas/:id`

Borra tipo de cuota.

**Permisos:** `verificarToken` + `verificarRol('admin')`.

**200:** `{ cuota: <cuotaEliminada> }`.

**404:** no encontrada.

> ⚠️ **No cascada**
>
> No se borran los pagos que referencian esta cuota (sobreviven con el nombre string intacto). **Sí** debes actualizar los clientes que tengan `tipo_cuota: <id_borrado>` — el frontend asume no-null. Hacerlo manualmente desde Atlas o con un script.
