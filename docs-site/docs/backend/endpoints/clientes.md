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
| `pagina` | number | entero ≥ 1 | Página (opcional) |
| `limite` | number | 1–100 | Resultados por página (opcional, defecto 20) |

**200 sin paginación** (parámetros `pagina`/`limite` ausentes):

```json
{ "clientes": [ { "_id": "...", "nombre": "...", ... } ] }
```

**200 con paginación:**

```json
{ "clientes": [ ... ], "total": 47, "pagina": 1, "limite": 20 }
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

Edita un cliente. Solo pasan al `$set` los campos de la whitelist `CAMPOS_EDITABLES_CLIENTE`: `nombre`, `apellidos`, `correo`, `telefono`, `direccion`, `fecha_nacimiento`, `DNI`, `sexo`, `nivel`. Cualquier otro campo del body (`activo`, `forzar_cambio_password`, `rol`, `tipo_cuota`, etc.) es ignorado.

**Permisos:** `verificarToken` + `verificarRol('admin', 'entrenador')`.

**Body:** campos de la whitelist, todos opcionales.

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

## `DELETE /api/clientes/:id`

Borrado físico del documento. Para baja lógica conservando los datos, usar `PATCH /:id/baja`.

**Permisos:** `verificarToken` + `verificarRol('admin')` — **solo admin**, ni siquiera entrenadores pueden borrar clientes.

**Params:** `id` — ObjectId del cliente.

**200:**

```json
{ "mensaje": "Usuario eliminado correctamente", "usuario": { ... } }
```

**Errores:**

| Código | Causa |
|--------|-------|
| 400 | ID inválido (no es ObjectId) |
| 404 | No encontrado |

> ⚠️ **Borrado irreversible**
>
> Se ejecuta `findByIdAndDelete`, que elimina el documento por completo. Las mediciones y pagos asociados al cliente quedan huérfanos (referencias rotas). Para preservar el histórico se recomienda usar la baja lógica (`PATCH /:id/baja`) en lugar de este endpoint.

> ℹ️ **Auditoría**
>
> Se registra un evento `eliminar_usuario` en la colección `audit_logs` con el `usuario_id` borrado, la IP y el User-Agent del solicitante.
