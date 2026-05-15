---
title: Validadores
sidebar_position: 7
description: validarCampos, validarRegistros — atómicos y compuestos.
tags: [backend, validación]
---

Dos archivos en `server/validators/`. **Atómicos** por campo + **compuestos** por entidad. Ambos devuelven booleano + descriptor de error.

## `validarCampos.js` — Atómicos

Cada función recibe el valor y devuelve `{ valido: boolean, error: string }`. `valido === true ⇒ error === ''`.

| Validador | Regla resumida | Mock |
|-----------|----------------|------|
| `validarNombre(valor)` | Letras (con tildes, ñ, `'-`), 2–100 chars | — |
| `validarDireccion(valor)` | Letras+nums+`,.-/º°`, máx 200 | — |
| `validarCorreo(valor)` | Regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, máx 254 | — |
| `validarContrasena(valor)` | 12–128, 1 minúscula + 1 mayúscula + 1 número + 1 símbolo | — |
| `validarDNI(valor)` | 8 dígitos + letra. **`LETRAS[numero % 19]`** | ✅ educativo (oficial: 23) |
| `validarTelefono(valor)` | Opcional `+34` + 9 dígitos. **Empieza por `5`** | ✅ educativo (oficial: 6/7/8/9) |
| `validarFechaNacimiento(valor)` | Fecha real, no futura, edad 16–120 | — |
| `validarFecha(valor)` | Fecha real, no futura | — |
| `validarMes(valor)` | `YYYY-MM` con mes 01–12 | — |
| `validarRol(valor)` | `admin` \| `entrenador` \| `cliente` | — |
| `validarSexo(valor)` | `masculino` \| `femenino` | — |
| `validarNivel(valor)` | `principiante` \| `intermedio` \| `avanzado` | — |
| `validarImporte(valor)` | Number, **entero positivo (céntimos)** | — |
| `validarMeses(valor)` | Entero 1–24 | — |
| `validarMedicion(valor, campo)` | Number positivo en `RANGOS_MEDICION` (campo concreto) | — |
| `validarTextoGeneral(valor, campo)` | Letras+nums+espacios+`-/`, máx 100 | — |
| `validarBooleano(valor, campo)` | `typeof === 'boolean'` | — |
| `validarObservaciones(valor)` | Opcional; si llega, máx 500 | — |
| `validarObjectId(valor)` | Hex 24 chars (`/^[a-f\d]{24}$/i`) | — |

> 🚨 **Validadores mockeados — recordatorio**
>
> **DNI: divisor `19` en lugar del oficial `23`.**
> **Teléfono: prefijo `5` en lugar de `6/7/8/9`.**
>
> Esto evita coincidir con personas reales en datos de prueba. **Para volver a producción real**, cambiar el divisor a 23 y el prefijo a `6789` en `validarCampos.js`. Ningún otro archivo depende del valor concreto.

## `validarRegistros.js` — Compuestos

Cada función recibe el objeto completo y devuelve `{ valido: boolean, errores: [{ campo, error }] }`.

Acumulan errores con un helper interno:

```
check(errores, campo, resultado)
```

donde `resultado` es el `{ valido, error }` del validador atómico.

### Tabla

| Validador | Obligatorios | Opcionales | Notas |
|-----------|-------------|-------------|-------|
| `validarCrearCliente` | nombre, apellidos, correo, fecha_nacimiento, DNI, sexo, nivel, tipo_cuota (ObjectId) | telefono, direccion | **No** valida contraseña (la genera el backend) |
| `validarCrearTrabajador` | nombre, apellidos, correo, fecha_nacimiento, DNI, rol (admin/entrenador) | telefono, direccion | — |
| `validarEditarUsuario` | (ninguno — todo opcional) | todos | Sirve para clientes y empleados |
| `validarLogin` | correo, contrasena (no vacía) | — | **No** valida formato de contrasena |
| `validarCambioContrasenaPropio` | contrasenaActual, contrasenaNueva (`validarContrasena`), confirmacion (= nueva) | — | — |
| `validarCrearMedicion` | cliente_id, entrenador_id, fecha | peso, altura, %grasa, perímetros, pliegues, observaciones | Constante interna `CAMPOS_MEDICION` con los 17 numéricos |
| `validarEditarMedicion` | — | igual a crear | **Rechaza** `cliente_id` y `entrenador_id` en body |
| `validarCrearPago` | cliente_id, mes, tipo_cuota (**string**, `validarTextoGeneral`), importe (céntimos), pendiente (boolean) | fecha, registrado_por | — |
| `validarConfirmarPago` | fecha, registrado_por | — | — |
| `validarTipoCuota` | nombre, meses, importe | — | — |

### Por qué `validarLogin` no valida formato

Si lo hiciera, romperíamos a usuarios con contraseñas antiguas que ya no cumplan las nuevas reglas (ej: si pasamos de 8 a 12 caracteres mínimos). En login se permite cualquier cadena no vacía y la comparación la hace bcrypt.

## Patrón de uso

```js
import { validarCrearMedicion } from '../validators/validarRegistros.js';

export const crearMedicion = async (req, res) => {
  const entrenador_id = req.usuario.id;
  const { valido, errores } = validarCrearMedicion({ ...req.body, entrenador_id });
  if (!valido) return res.status(400).json({ errores });
  // ... proceder
};
```

## Respuesta de error estándar

```json
{
  "errores": [
    { "campo": "correo", "error": "Correo no válido" },
    { "campo": "DNI", "error": "DNI no válido" }
  ]
}
```

El frontend recorre `errores` y pinta cada uno bajo su input con `CampoFormulario`.
