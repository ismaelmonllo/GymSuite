---
title: Contraseñas con bcrypt
sidebar_position: 5
description: Versión obligatoria, salt rounds y por qué no bcryptjs.
tags: [seguridad, bcrypt]
---

GymSuite hashea contraseñas con **bcrypt nativo** (paquete `bcrypt`), versión `^5.1.1`. Salt rounds: **10**.

## Versión obligatoria

```json title="server/package.json"
{
  "dependencies": {
    "bcrypt": "^5.1.1"
  }
}
```

> 🚨 **Nunca `bcrypt@^6.0.0`**
>
> La versión `6.0.0` **no existe en npm**. Algún ejemplo online la sugiere y rompe el `npm install` de Vercel con `ERR_INVALID_VERSION`. Si ves esto en el build, revisar `package.json` y `package-lock.json`.
>
> Ver [ADR-001](../arquitectura/decisiones.md#bcrypt-510).

## Por qué `bcrypt` y no `bcryptjs`

| Aspecto | `bcrypt` (nativo) | `bcryptjs` (puro JS) |
|---------|-------------------|----------------------|
| Velocidad | Más rápido | ~3× más lento |
| Estándar industria | ✅ | — |
| Build Vercel | OK (binarios pre-compilados Node 20) | OK |
| Migrar hashes existentes | Compatible con cualquier impl bcrypt | Compatible |

`bcryptjs` es válido pero **innecesario** para nuestro caso. No migrar.

## Salt rounds

```js
const hash = await bcrypt.hash(contrasena, 10);
```

`10` = 2^10 iteraciones internas. Tarda ~50–100 ms por hash en Node 20 reciente. Equilibrio razonable entre seguridad y latencia de login.

| Rounds | Tiempo aproximado | Cuándo |
|--------|-------------------|--------|
| 10 | 50–100 ms | Default. Suficiente |
| 12 | 200–300 ms | Más estricto |
| 14 | 800 ms+ | Solo si los rounds 10 no bastan |

Subir rounds invalida los hashes existentes — los usuarios deben rehashear (típicamente al siguiente login: comparar con bcrypt, si OK, regenerar hash con nuevo rounds).

## Operaciones canónicas

### Hashear (alta, reset, cambio)

```js
import bcrypt from 'bcrypt';

const hash = await bcrypt.hash(contrasena, 10);
await Usuario.create({ ...datos, contrasena: hash });
```

### Verificar (login, cambio propio)

```js
const ok = await bcrypt.compare(contrasenaPlana, usuario.contrasena);
if (!ok) return res.status(401).json({ mensaje: 'Credenciales inválidas' });
```

`bcrypt.compare` es **constant-time** — no filtra por timing si la contraseña es válida o no.

## Política de contraseñas

`validarContrasena` en `validators/validarCampos.js`:

| Regla | Detalle |
|-------|---------|
| Longitud | 12–128 chars |
| Composición | 1 minúscula + 1 mayúscula + 1 número + 1 símbolo (`/[^a-zA-Z0-9]/`) |

### Generación de contraseñas temporales

`server/utils/passwords.js`:

```js
import { randomBytes } from 'crypto';

const MINUSCULAS = 'abcdefghijklmnñopqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
const NUMEROS = '0123456789';
const SIMBOLOS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const CHARS = MINUSCULAS + MAYUSCULAS + NUMEROS + SIMBOLOS;

function elegir(conjunto) {
  return conjunto[randomBytes(1)[0] % conjunto.length];  // CSPRNG
}

function mezclar(arr) {
  // Fisher-Yates con bytes aleatorios
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generarPasswordTemporal() {
  const obligatorios = [
    elegir(MINUSCULAS),
    elegir(MAYUSCULAS),
    elegir(NUMEROS),
    elegir(SIMBOLOS),
  ];
  const libres = Array.from({ length: 8 }, () => elegir(CHARS));
  return mezclar([...obligatorios, ...libres]).join('');
}
```

12 chars garantizando 1 de cada categoría obligatoria. Usada en `crearCliente`, `crearEmpleado`, `resetearPassword`. Tras generar, se hashea con bcrypt y se manda por email.

> ⚠️ **No `Math.random`**
>
> `Math.random()` es predecible. Para contraseñas / OTPs / tokens usar siempre `crypto.randomBytes` o `crypto.randomInt`.

## Flujo de cambio forzoso

1. Usuario creado / contraseña reseteada → `forzar_cambio_password: true` + email con contraseña temporal.
2. Login del usuario → JWT trae la flag.
3. Frontend (`ModalForzadoSiAplica`) monta `ModalCambiarContrasena forzado` por encima de la app.
4. Usuario rellena `contrasenaActual` (la temporal) + `contrasenaNueva` (la suya).
5. `PATCH /api/auth/cambiar-contrasena` → valida, hashea con bcrypt, `forzar_cambio_password: false`, emite nuevo JWT.
6. Frontend `actualizarToken(token)` → el modal se desmonta.

## Migración de hashes

Si alguna vez cambias el algoritmo de hash (ej: a Argon2):

1. Añadir campo `algoritmo_hash` al modelo.
2. En `bcrypt.compare`, si `algoritmo_hash === 'bcrypt'`, comparar con bcrypt; si `'argon2'`, con argon2.
3. Tras `compare` OK con bcrypt, **rehashear** con argon2 y actualizar `algoritmo_hash`.
4. Eventualmente todos los hashes serán argon2.

**No implementado** — bcrypt 10 rounds basta para este proyecto.

## Lecturas relacionadas

- [Tokens JWT y refresh](./tokens.md)
- [Backend → Auth flujo](../backend/auth-flujo.md)
- [Decisiones → bcrypt 5.1.0](../arquitectura/decisiones.md#bcrypt-510)
