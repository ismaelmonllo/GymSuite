---
title: Errores del backend
sidebar_position: 8
description: Códigos HTTP y formato de respuesta de error estándar.
tags: [backend, errores]
---

Formato canónico de errores del backend de GymSuite. Aplica a todos los endpoints.

## Formatos de payload

### Error simple (1 mensaje)

```json
{ "mensaje": "Credenciales inválidas" }
```

Usado en: 401, 403, 404, 500.

### Error de validación (lista)

```json
{
  "errores": [
    { "campo": "correo", "error": "Correo no válido" },
    { "campo": "DNI", "error": "DNI no válido" }
  ]
}
```

Devuelto por todos los validadores compuestos de `validarRegistros.js`. Usado en 400.

### Error de duplicado al crear (campo concreto)

```json
{ "campo": "correo", "mensaje": "Ya existe un usuario con ese correo" }
```

Usado en 400 cuando un campo único colisiona con un usuario **activo**.

### Coincidencia con usuario inactivo (reactivar)

```json
{
  "inactivos": [
    {
      "_id": "...",
      "nombre": "...",
      "apellidos": "...",
      "fecha_nacimiento": "...",
      "DNI": "...",
      "correo": "...",
      "rol": "cliente"
    }
  ]
}
```

Usado en 409. El frontend abre `ModalReactivar`.

## Tabla de códigos HTTP

| Código | Significado en el proyecto | Body típico |
|--------|----------------------------|-------------|
| 200 | OK | datos pedidos |
| 201 | Recurso creado | `{ mensaje, <recurso> }` |
| 400 | Validación o ID malformado | `{ errores }` \| `{ campo, mensaje }` |
| 401 | Sin token, token inválido, credenciales mal, OTP mal/expirado, refresh fallido, header cron mal | `{ mensaje }` |
| 403 | Token válido pero rol insuficiente / cuenta no coincide con `tab` / target es cliente en `editarEmpleado` | `{ mensaje }` |
| 404 | Recurso no encontrado | `{ mensaje }` |
| 409 | Duplicado con usuario inactivo (candidato a reactivar) | `{ inactivos: [...] }` |
| 500 | Error inesperado (excepción no controlada) | `{ mensaje }` |
| 503 | Backend up pero Mongo no conectado (`/api/health`) | `{ estado, mongo }` |

## Cuándo se devuelve qué (por endpoint)

| Endpoint | Errores específicos |
|----------|---------------------|
| `POST /api/auth/login` | 400 datos, 401 credenciales, 403 tab, 404 user |
| `POST /api/auth/verificar-2fa` | 400 datos, 401 OTP, 404 user |
| `POST /api/auth/refresh` | 401 sin cookie / inválida |
| `PATCH /api/auth/cambiar-contrasena` | 400 validación, 401 actual mal |
| `PATCH /api/auth/resetear-password/:id` | 400 ID, 404 user |
| `POST /api/clientes` | 400 validación / duplicado activo, 409 inactivos |
| `PATCH /api/clientes/:id/cuota` | 400 ID cuota, 404 cliente |
| `POST /api/mediciones` | 400 validación |
| `PUT /api/mediciones/:id` | 400 validación (incluye `cliente_id`/`entrenador_id` en body), 404 |
| `POST /api/pagos/registrar` | 400 ID, 404 grupo |
| `POST /api/pagos/generar-cron` | 401 sin header / no coincide |
| `GET /api/stats/*` | 403 si no admin |

## Buenas prácticas al lanzar error

1. **Comprobar el tipo de retorno Mongoose adecuado** ([ADR-004](../arquitectura/decisiones.md#consultas-mongoose)):
   - `find` → `.length === 0` para 404.
   - `findById*` → `!resultado` para 404.
   - `save()` → try/catch para 500.

2. **Mensajes en español** para coherencia con el resto del proyecto.

3. **Errores de validación siempre como `{ errores }`** (no como `{ mensaje }`) — el frontend depende del formato.

4. **No filtrar info sensible**:
   - Login: "Credenciales inválidas" (no "Usuario no existe" vs "Password mal").
   - Reset: no decir si el email existe.

## Manejo en frontend

### Interceptor de response (`api.js`)

Solo trata 401 (refresh automático). Cualquier otro código se propaga al `.catch` del caller.

### En los componentes

Patrón típico:

```js
try {
  const { data } = await api.post('/api/algo', body);
  // éxito
} catch (err) {
  const status = err.response?.status;
  if (status === 400 && err.response.data.errores) {
    setErrores(err.response.data.errores);
  } else if (status === 409 && err.response.data.inactivos) {
    setInactivos(err.response.data.inactivos);
  } else {
    setError(err.response?.data?.mensaje ?? 'Error inesperado');
  }
}
```

## Lecturas relacionadas

- [Validadores](./validadores.md)
- [Códigos de error](../referencia/codigos-error.md) — tabla unificada con mensajes literales
- [Troubleshooting](../referencia/troubleshooting.md)
