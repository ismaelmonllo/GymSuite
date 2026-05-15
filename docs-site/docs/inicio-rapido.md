---
title: Inicio rápido
sidebar_position: 2
sidebar_label: Inicio rápido
description: Levanta GymSuite en local en menos de 10 minutos.
tags: [tutorial, setup]
---

Al final de este tutorial tendrás:
- Backend Express corriendo en `http://localhost:5000`
- Frontend Vite en `http://localhost:5173`
- MongoDB Atlas conectada
- Una cuenta admin de prueba lista para login

> ℹ️ **Tiempo estimado**
>
> ≈ 10 minutos con Node 20+, npm y MongoDB Atlas listos.

## 1. Pre-requisitos

| Herramienta | Versión mínima | Verificar |
|-------------|----------------|-----------|
| Node | 20.x | `node -v` |
| npm | 10.x | `npm -v` |
| MongoDB Atlas | cuenta gratuita | URI conexión |
| Cuenta Gmail (opcional) | con 2FA + app password | para emails |

## 2. Clonar e instalar dependencias

```bash
git clone https://github.com/isma01mm/GymSuite.git
cd GymSuite
```

Backend:

```bash
cd server
npm install
```

Frontend (en otra terminal):

```bash
cd client
npm install
```

## 3. Configurar variables de entorno

Crea `server/.env` a partir de la plantilla:

```bash title="server/.env"
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/gymsuite
JWT_SECRET=cadena-larga-aleatoria-distinta-de-refresh
JWT_REFRESH_SECRET=otra-cadena-larga-aleatoria
CRON_SECRET=cadena-para-cron-externo
EMAIL_USER=tu-cuenta@gmail.com
EMAIL_PASS=app-password-16-chars
PORT=5000
DISABLE_2FA=true
```

> 💡 **Salta el 2FA en dev**
>
> `DISABLE_2FA=true` evita que cada login te mande un email con código. **Nunca** lo dejes así en producción.

> ⚠️ **Genera secretos largos**
>
> `JWT_SECRET` y `JWT_REFRESH_SECRET` deben ser **distintos entre sí** y de al menos 32 caracteres. Genera con:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

## 4. Poblar la base de datos

```bash title="server/"
node seed.js
```

Crea cuotas (40 €, 110 €, 200 €, 360 €), un admin, entrenadores y clientes con contraseñas hasheadas. El log muestra credenciales del admin de prueba.

## 5. Levantar backend

```bash title="server/"
npm run dev
```

Salida esperada:

```
Servidor escuchando en http://localhost:5000
Conectado a MongoDB
```

## 6. Levantar frontend

```bash title="client/"
npm run dev
```

Abre `http://localhost:5173`. Verás la pantalla de login.

## 7. Probar el login

1. Pestaña **Trabajador**.
2. Email y contraseña del admin de seed.
3. Como `DISABLE_2FA=true`, entra directo al dashboard.

> 💡 **Forzado de cambio de contraseña**
>
> Las cuentas creadas con `seed.js` y por `crearCliente`/`crearEmpleado` arrancan con `forzar_cambio_password: true`. Verás un modal de cambio obligatorio en el primer login.

## Verificar que todo funciona

| Comprobación | URL | Resultado esperado |
|--------------|-----|---------------------|
| Health backend | `http://localhost:5000/api/health` | `{ "estado": "ok", "mongo": "conectado" }` |
| Swagger UI | `http://localhost:5000/api/docs` | Spec OpenAPI navegable |
| Login frontend | `http://localhost:5173/login` | Card de login |
| Dashboard admin | tras login | Cards de stats + tabla |

## Siguiente paso

- Entender la arquitectura: [Visión general](./arquitectura/vision-general.md).
- Ver todos los endpoints: [Backend → API](./backend/endpoints/overview.md).
- Configurar el cron de pagos: [Operaciones → Cron de pagos](./operaciones/cron-pagos.md).
