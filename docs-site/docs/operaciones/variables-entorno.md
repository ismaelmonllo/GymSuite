---
title: Variables de entorno
sidebar_position: 2
description: Tabla completa de variables requeridas en dev y prod.
tags: [operaciones, env]
---

Lista canónica de variables de entorno. Backend lee de `.env` (dev) o Vercel Settings (prod). Frontend lee solo `VITE_*` mediante Vite.

## Backend

### MongoDB

| Variable | Tipo | Dev | Prod | Ejemplo (sin secretos reales) |
|----------|------|:---:|:----:|--------------------------------|
| `MONGODB_URI` | string | ✅ | ✅ | `mongodb+srv://usr:pwd@cluster.mongodb.net/gymsuite` |
| `MONGODB_URI_BACKUP` | string | recomendada | recomendada | URI cluster de respaldo |

`conectarDB()` intenta `MONGODB_URI`; si falla, prueba `MONGODB_URI_BACKUP`; si ambas fallan, el error se propaga y `errorHandler` responde 500. La conexión se cachea entre invocaciones serverless de Vercel.

### JWT y sesión

| Variable | Tipo | Dev | Prod | Notas |
|----------|------|:---:|:----:|-------|
| `JWT_SECRET` | string ≥32 chars | ✅ | ✅ | Firma JWT acceso (15m). Generar con `crypto.randomBytes(32).toString('hex')` |
| `JWT_REFRESH_SECRET` | string ≥32 chars | ✅ | ✅ | **Distinto** de `JWT_SECRET`. Firma refresh (7d) |

### Cron

| Variable | Tipo | Dev | Prod | Notas |
|----------|------|:---:|:----:|-------|
| `CRON_SECRET` | string | ✅ | ✅ | Valor para header `x-cron-secret` |

### Email

| Variable | Tipo | Dev | Prod | Notas |
|----------|------|:---:|:----:|-------|
| `EMAIL_USER` | string | ✅ | ✅ | `gymsuite.security@gmail.com` |
| `EMAIL_PASS` | string | ✅ | ✅ | **App password de Google** (16 chars sin espacios). NO la contraseña real |

### Entorno

| Variable | Tipo | Dev | Prod | Notas |
|----------|------|:---:|:----:|-------|
| `NODE_ENV` | string | no | `production` | Activa `sameSite=none, secure=true` en cookies |
| `FRONTEND_URL` | URL | no | ✅ | Origen permitido para CORS. Obligatoria en `NODE_ENV=production`: si falta, la función aborta en cold start (CORS fail-closed) |
| `PORT` | int | `5000` | (ignorado) | Solo dev |
| `DISABLE_2FA` | string | opcional `'true'` | **NO setear** | Salta el OTP en login |
| `BCRYPT_ROUNDS` | int | opcional | opcional | Rondas de bcrypt. Default 12 si no está definido. `authController.js` y `usuarioController.js` leen `Number(process.env.BCRYPT_ROUNDS) \|\| 12` |

## Frontend

| Variable | Tipo | Dev | Prod | Notas |
|----------|------|:---:|:----:|-------|
| `VITE_API_URL` | URL | (vacío) | ✅ | URL backend. Vacío en dev usa proxy Vite |

## `.env` mínimo para dev

```env title="server/.env"
MONGODB_URI=mongodb+srv://usuario:pwd@cluster.mongodb.net/gymsuite
JWT_SECRET=32-chars-min-aleatorio
JWT_REFRESH_SECRET=otro-32-chars-min-aleatorio
CRON_SECRET=otro-valor-aleatorio
EMAIL_USER=gymsuite.security@gmail.com
EMAIL_PASS=app-password-16-chars
PORT=5000
DISABLE_2FA=true
```

```env title="client/.env"
# vacío en dev — el proxy Vite redirige /api a localhost:5000
# VITE_API_URL=
```

## Generar secretos

```bash
# 32 bytes hex = 64 chars
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> 🚨 **No reutilizar entre proyectos**
>
> Cada proyecto debe tener sus propios `JWT_SECRET` y `JWT_REFRESH_SECRET`. Generar con la línea de arriba para cada uno.

## Por qué `EMAIL_PASS` es app password

Gmail bloquea apps de terceros que usan la contraseña real. Las **app passwords** son tokens específicos por app, generadas en https://myaccount.google.com/apppasswords. Requieren 2FA activo en la cuenta Google.

Si revocas la app password, el envío de emails para 2FA / alta / reset deja de funcionar.

## Por qué `NODE_ENV` solo en prod

En dev (`NODE_ENV` sin setar):
- Cookies con `sameSite: 'strict', secure: false` → funcionan en `http://localhost`.

En prod (`NODE_ENV='production'`):
- Cookies con `sameSite: 'none', secure: true` → cross-origin entre dominios Vercel.

Setear `NODE_ENV=production` en dev rompería el login local porque las cookies no se enviarían en HTTP.

## Por qué `DISABLE_2FA=true` solo en dev

Salta el OTP por email para iterar rápido. En producción (`NODE_ENV=production`) hay un guard en `authController.js` que ignora la flag aunque esté seteada — el 2FA siempre se exige. Aun así se recomienda no tenerla en Vercel:

```bash
vercel env ls
```

`DISABLE_2FA` no debe aparecer o debe valer `'false'`.

## Vite y variables públicas

Vite **solo expone** al bundle del cliente variables que empiezan por `VITE_`. Si pones `API_URL=...` sin prefijo, el frontend no la verá. Eso protege secretos sensibles.

`process.env.NODE_ENV` **no existe** en el cliente Vite — usar `import.meta.env.MODE` (`'development'` \| `'production'`) o `import.meta.env.PROD`.

## Lecturas relacionadas

- [Despliegue](./despliegue.md)
- [Cron de pagos](./cron-pagos.md)
- [Seguridad → 2FA](../seguridad/2fa.md)
- [Seguridad → Cookies](../seguridad/cookies.md)
