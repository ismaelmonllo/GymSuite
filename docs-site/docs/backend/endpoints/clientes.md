---
title: Endpoints de Clientes
sidebar_position: 3
description: Operaciones REST sobre clientes (alta, edición, baja, cambio de cuota).
tags: [backend, api, clientes]
---

Endpoints bajo `/api/clientes/*`. Controller: `server/controllers/usuarioController.js`. Modelo: [Usuario](../modelos.md#usuarios).

## `GET /api/clientes`

Lista clientes filtrables.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Query:**

| Parámetro | Tipo | Valor | Descripción |
|-----------|------|-------|-------------|
| `activo` | string | `'true'` \| `'false'` | Filtra por estado |
| `nivel` | string | `principiante` \| `intermedio` \| `avanzado` | — |
| `tipo_cuota` | ObjectId | — | Filtra por cuota |

**200:**

```json
{ "clientes": [ { "_id": "...", "nombre": "...", ... } ] }
```

## `GET /api/clientes/perfil`

Perfil del cliente autenticado.

**Permisos:** `verificarToken` + `verificarRol('cliente')`.

**Sin body. ID se toma de `req.usuario.id`.**

**200:**

```json
{
  "cliente": {
    "_id": "...",
    "nombre": "...",
    "tipo_cuota": { "_id": "...", "nombre": "Mensual", "importe": 4000, "meses": 1 }
  }
}
```

`tipo_cuota` viene `populate`'d.

**404:** usuario no encontrado.

## `GET /api/clientes/:id`

Detalle de un cliente.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Params:** `id` — ObjectId del cliente.

**200:** `{ cliente }`.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID inválido (no es ObjectId) |
| 404 | No encontrado |

> ⚠️ **Bug conocido en `verCliente`**
>
> La guarda actual está invertida: `if (!cliente \|\| cliente.rol === 'cliente') return cliente; else 404`. Devuelve 200 incluso si no existe. Conservar tal cual hasta corrección explícita.

## `POST /api/clientes`

Crea un cliente nuevo.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Body:**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre` | string | sí | letras + tildes, 2–100 |
| `apellidos` | string | sí | igual |
| `correo` | string | sí | regex email, máx 254 |
| `telefono` | string | no | mock prefijo `5` |
| `direccion` | string | no | letras+nums+`,.-/º°`, máx 200 |
| `fecha_nacimiento` | string ISO | sí | edad 16–120 |
| `DNI` | string | sí | 8 dígitos + letra (mock `% 19`) |
| `sexo` | string | sí | `masculino` \| `femenino` |
| `nivel` | string | sí | `principiante` \| `intermedio` \| `avanzado` |
| `tipo_cuota` | ObjectId | sí | — |

> ℹ️ **Sin contraseña al crear**
>
> El backend genera contraseña temporal con `generarPasswordTemporal()` y la envía por email. Marca `forzar_cambio_password=true`.

**201:**

```json
{ "mensaje": "...", "cliente": { ... } }
```

**Errores:**

| Código | Body | Causa |
|--------|------|-------|
| 400 | `{ errores }` | Validación falló |
| 400 | `{ campo, mensaje }` | Duplicado activo o correo en otro rol inactivo |
| 409 | `{ inactivos: [...] }` | Coincide con usuario(s) de baja del mismo rol — candidatos a reactivar |

**409 — Formato de `inactivos`:**

```json
{
  "inactivos": [
    { "_id": "...", "nombre": "...", "apellidos": "...", "fecha_nacimiento": "...", "DNI": "...", "correo": "...", "rol": "cliente" }
  ]
}
```

El frontend abre `ModalReactivar` y permite al usuario dar de alta uno existente.

## `PUT /api/clientes/:id`

Edita un cliente. Ignora `rol`, `contrasena`, `fecha_alta` si vienen.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Body:** mismos campos que crear (todos opcionales).

**200:** `{ mensaje, cliente }`.

**Errores:** 400 validación o duplicado.

## `PATCH /api/clientes/:id/baja`

Baja lógica (`activo=false`).

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**200:** `{ mensaje, usuario }`.

**404:** no encontrado.

## `PATCH /api/clientes/:id/alta`

Reactiva. **Resetea `fecha_alta`** a la fecha actual (reactivación cuenta como periodo nuevo — ver [ADR-010](../../arquitectura/decisiones.md)).

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**200:** `{ mensaje, usuario }`.

## `PATCH /api/clientes/:id/cuota`

Cambia tipo de cuota y **elimina los pagos pendientes** del cliente.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Body:**

```json
{ "nuevaCuota": "<ObjectId>" }
```

**200:** `{ mensaje, cliente }`.

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID de cuota inválido |
| 404 | Cliente no encontrado |

> ⚠️ **Pagos pendientes eliminados**
>
> `Pagos.deleteMany({ cliente_id, pendiente: true })` se ejecuta para que los pagos se regeneren con la nueva cuota. Los pagos **confirmados** se conservan.
