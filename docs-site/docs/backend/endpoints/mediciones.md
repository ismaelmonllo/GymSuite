---
title: Endpoints de Mediciones
sidebar_position: 5
description: Operaciones REST sobre mediciones antropométricas.
tags: [backend, api, mediciones]
---

Endpoints bajo `/api/mediciones/*`. Controller: `server/controllers/medicionController.js`. Modelo: [Medicion](../modelos.md#mediciones). Cálculos: [Mediciones cálculo](../mediciones-calculo.md).

<a id="get-apimediciones"></a>

## `GET /api/mediciones`

Mediciones propias del cliente autenticado.

**Permisos:** `verificarToken` + `verificarRol('cliente')`. ID se toma de `req.usuario.id`.

**200:** array de mediciones ordenadas por `fecha: -1`.

**404:** sin mediciones.

<a id="get-apimedicionesclienteid"></a>

## `GET /api/mediciones/cliente/:id_usuario`

Mediciones de un cliente concreto (consulta del entrenador).

**Permisos:** `verificarToken` + `verificarRol('entrenador')`.

**Params:** `id_usuario` — ObjectId del cliente.

**200:** array ordenado por `fecha: -1`.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID inválido |
| 404 | Sin mediciones |

<a id="get-apimedicionesid"></a>

## `GET /api/mediciones/:id`

Detalle de una medición concreta.

**Permisos:** `verificarToken` + `verificarRol('cliente', 'entrenador')`.

**200:** objeto medición.

**Errores:** 400 ID inválido, 404 no encontrada.

<a id="post-apimediciones"></a>

## `POST /api/mediciones`

Crea medición.

**Permisos:** `verificarToken` + `verificarRol('entrenador')`.

**Body:**

| Campo | Tipo | Requerido | Unidad |
|-------|------|-----------|--------|
| `cliente_id` | ObjectId | sí | — |
| `fecha` | string ISO | sí | — |
| `peso` | number | no | kg (20–300) |
| `altura` | number | no | cm (50–250) |
| `porcentaje_grasa` | number | no | % (1–70) |
| `cuello`, `hombros`, `pecho_ins`, `pecho_exp`, `cintura`, `cadera`, `muslo`, `gemelo`, `brazo`, `antebrazo` | number | no | cm (perímetros) |
| `biceps`, `triceps`, `subescapular`, `cresta_iliaca` | number | no | mm (pliegues, 1–100) |
| `observaciones` | string | no | máx 500 chars |

> ⚠️ **No mandes `entrenador_id`**
>
> Se toma de `req.usuario.id`. El controller lo inyecta antes de validar.

**201:** medición creada.

**Errores:** 400 `{ errores }`.

<a id="put-apimedicionesid"></a>

## `PUT /api/mediciones/:id`

Edita medición.

**Permisos:** `verificarToken` + `verificarRol('entrenador')`.

**Body:** mismos campos opcionales. **`validarEditarMedicion` rechaza `cliente_id` y `entrenador_id`** — no se pueden cambiar.

**200:** medición actualizada.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | `{ errores }` (incluye `cliente_id` o `entrenador_id` en body) |
| 404 | No encontrada |

<a id="delete-apimedicionesid"></a>

## `DELETE /api/mediciones/:id`

Borra medición.

**Permisos:** `verificarToken` + `verificarRol('entrenador')`.

**200:**

```json
{ "mensaje": "Medición eliminada correctamente" }
```

**404:** no encontrada.

## Rangos de validación

Definidos en `RANGOS_MEDICION` (interno de `validarCampos.js`):

| Campo | Min | Max | Unidad |
|-------|-----|-----|--------|
| `peso` | 20 | 300 | kg |
| `altura` | 50 | 250 | cm |
| `porcentaje_grasa` | 1 | 70 | % |
| `cuello` | 10 | 80 | cm |
| `hombros` | 50 | 200 | cm |
| `pecho_ins`, `pecho_exp` | 40 | 200 | cm |
| `cintura` | 30 | 200 | cm |
| `cadera` | 40 | 200 | cm |
| `muslo` | 20 | 120 | cm |
| `gemelo` | 10 | 80 | cm |
| `brazo` | 10 | 80 | cm |
| `antebrazo` | 10 | 60 | cm |
| `biceps`, `triceps`, `subescapular`, `cresta_iliaca` | 1 | 100 | mm |
