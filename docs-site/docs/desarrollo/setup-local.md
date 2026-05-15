---
title: Setup local
sidebar_position: 1
description: Clonar, configurar .env, instalar dependencias y levantar el proyecto.
tags: [desarrollo, setup, tutorial]
---

Setup completo de GymSuite en local — más detallado que [Inicio rápido](../inicio-rapido.md). Incluye troubleshooting de los errores típicos del primer arranque.

## Pre-requisitos

| Herramienta | Versión | Verificar |
|-------------|---------|-----------|
| Node | ≥ 20 | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | cualquiera reciente | `git --version` |
| MongoDB Atlas | cuenta + cluster M0 | tener URI |
| Cuenta Gmail con 2FA | + app password generada | tener `EMAIL_USER` y `EMAIL_PASS` |

## 1. Clonar

```bash
git clone https://github.com/isma01mm/GymSuite.git
cd GymSuite
```

## 2. Instalar backend

```bash
cd server
npm install
```

Si falla con `bcrypt`:

```
npm ERR! code ERR_INVALID_VERSION
npm ERR! Invalid Version: ^6.0.0
```

→ Editar `package.json` y fijar `"bcrypt": "^5.1.1"`. Ver [bcrypt](../seguridad/bcrypt.md).

## 3. Crear `server/.env`

```env title="server/.env"
MONGODB_URI=mongodb+srv://usuario:pwd@cluster.mongodb.net/gymsuite
JWT_SECRET=cadena-aleatoria-32-chars-min
JWT_REFRESH_SECRET=otra-cadena-aleatoria-distinta
CRON_SECRET=otro-secret-aleatorio
EMAIL_USER=gymsuite.security@gmail.com
EMAIL_PASS=app-password-16-chars
PORT=5000
DISABLE_2FA=true
```

Generar secretos:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Detalle de cada variable: [Variables de entorno](../operaciones/variables-entorno.md).

## 4. Poblar la base de datos

```bash title="server/"
node seed.js
```

Crea 4 tipos de cuota, 1 admin, varios entrenadores y clientes con contraseñas hasheadas. El log muestra credenciales del admin.

## 5. Levantar backend

```bash title="server/"
npm run dev
```

Salida esperada:

```
Servidor escuchando en http://localhost:5000
Conectado a MongoDB
```

Si ves `process.exit(1)`: revisar `MONGODB_URI`. Atlas exige IP whitelist (`0.0.0.0/0` para dev).

## 6. Instalar frontend

```bash
cd ../client
npm install
```

## 7. Crear `client/.env` (opcional)

```env title="client/.env"
# vacío en dev — el proxy Vite redirige /api a localhost:5000
```

En dev no setear `VITE_API_URL`. Vite proxy lo gestiona.

## 8. Levantar frontend

```bash title="client/"
npm run dev
```

Cliente en `http://localhost:5173` (default Vite).

## 9. Probar login

1. Abrir `http://localhost:5173`.
2. Pestaña **Trabajador**.
3. Credenciales del admin del seed.
4. `DISABLE_2FA=true` → entra directo al dashboard.
5. Verás `ModalCambiarContrasena forzado` — cambiar a una contraseña válida (12+, min, may, num, símb).

## 10. Levantar docs site (opcional)

```bash
cd ../docs-site
npm install
npm start
```

Docs en `http://localhost:3000`.

## Troubleshooting

### `Cannot find module '@docusaurus/theme-mermaid'`

Falta instalar el plugin. En `docs-site/`:

```bash
npm install --save @docusaurus/theme-mermaid
```

### `npm install` cuelga o muy lento

Posibles causas:
- Proxy/firewall.
- Cache corrompida: `npm cache clean --force` y reintentar.

### Backend arranca pero `/api/health` da 503

`readyState !== 1`. Causas:
- `MONGODB_URI` mal escrita.
- Atlas IP whitelist no incluye tu IP. Añadir tu IP o `0.0.0.0/0` (dev).
- Credenciales del usuario Atlas erróneas.

### Login 401 con credenciales correctas

- Verificar `JWT_SECRET` en `.env` (no debe estar vacío).
- Verificar que `seed.js` corrió OK (lista al final con credenciales).

### No llega email de 2FA

`DISABLE_2FA=true` en dev → no se manda. Si lo quieres probar:

1. `DISABLE_2FA=false` (o quitar la línea).
2. Reiniciar backend.
3. Login → recibir OTP en el email de `EMAIL_USER`.
4. Si no llega: revisar carpeta spam, verificar `EMAIL_PASS` (app password Gmail).

### Cookie `refresh_token` no se ve en DevTools

En dev (HTTP localhost):
- `sameSite: 'strict', secure: false` → debe verse.
- Si no se ve: revisar `withCredentials: true` en axios (`api.js`).

### Vite proxy no funciona

```bash
[vite] http proxy error: /api/auth/login
Error: connect ECONNREFUSED 127.0.0.1:5000
```

→ Backend no está arriba. Levantar con `npm run dev` en `server/`.

### `forzar_cambio_password` no me deja salir del modal

Comportamiento intencional. Completar el cambio:
1. Contraseña actual = la que pone el seed log.
2. Contraseña nueva = mínimo 12 chars con min+may+num+símb.
3. Submit → JWT nuevo sin la flag → modal se desmonta.

## Siguiente paso

- Lee la [Arquitectura](../arquitectura/vision-general.md).
- Mira los [Endpoints](../backend/endpoints/overview.md).
- Conoce el [Estilo de código](./estilo-codigo.md) antes de tu primer commit.
