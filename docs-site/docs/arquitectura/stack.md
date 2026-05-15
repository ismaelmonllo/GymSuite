---
title: Stack tecnológico
sidebar_position: 2
description: Versiones exactas de las dependencias clave del proyecto.
tags: [arquitectura, stack]
---

Tabla canónica del stack. Las versiones finales son las del `package.json` real — esta tabla las refleja.

## Frontend (`client/`)

| Tecnología | Versión | Por qué |
|------------|---------|---------|
| React | 19.x | Última estable; soporta concurrent features |
| Vite | 5.x | Dev server rápido; HMR fiable |
| Tailwind CSS | 3.x | Utility-first; coherente con [paleta del proyecto](../frontend/estilos.md) |
| axios | 1.x | Interceptors para refresh automático |
| react-router-dom | 6.x | Rutas anidadas (`RutaProtegida` + `RutaRol`) |
| lucide-react | latest | Iconos coherentes |
| recharts | latest | Gráficas de mediciones (SVG; **no acepta clases Tailwind**) |

## Backend (`server/`)

| Tecnología | Versión | Por qué |
|------------|---------|---------|
| Node | ≥20 | ES modules estables, performance |
| Express | 4.x | Estándar de facto, simple |
| Mongoose | 8.x | ODM Mongo con validaciones |
| bcrypt | **^5.1.1** | Ver advertencia abajo |
| jsonwebtoken | 9.x | JWT firmado HS256 |
| nodemailer | 6.x | Gmail SMTP |
| swagger-jsdoc + swagger-ui-express | latest | OpenAPI desde comentarios |
| dotenv | 16.x | Variables de entorno locales |
| cookie-parser | 1.x | Leer cookies httpOnly del refresh |
| cors | 2.x | CORS con credentials |

> 🚨 **No uses `bcrypt@^6.0.0`**
>
> La versión `6.0.0` **no existe en npm** y rompe el `npm install` de Vercel. Forzar `bcrypt@^5.1.1` en `server/package.json`. Detalle: [Decisiones](./decisiones.md#bcrypt-510).

## Base de datos

- **MongoDB Atlas** (M0/M2 free tier).
- 5 colecciones: `usuarios`, `mediciones`, `pagos`, `tipos_cuota`, `otps`.
- Índice TTL en `otps.expira` (limpieza automática de OTPs).
- Índice único compuesto `{ DNI: 1, rol: 1 }` en `usuarios`.

## Documentación

- **Docusaurus 3.10.x** con `@docusaurus/theme-mermaid`.
- Plugin Mermaid habilitado en `docusaurus.config.js` (`markdown.mermaid: true`).

## Despliegue

| Servicio | Uso |
|----------|-----|
| Vercel | Hosting frontend, backend (serverless) y docs |
| cron-job.org | Cron mensual para generar cuotas |
| Gmail (con app password) | SMTP transaccional |

## Versiones vivas

Para ver las versiones exactas en cualquier momento:

```bash
cat GymSuite/server/package.json | grep -A 20 '"dependencies"'
cat GymSuite/client/package.json | grep -A 20 '"dependencies"'
```

> ℹ️ **Actualización**
>
> Antes de subir versiones mayor (`major`) revisar:
> 1. Changelog del paquete (especialmente bcrypt, mongoose, react).
> 2. Probar en local con `seed.js` + login completo.
> 3. Desplegar a un preview de Vercel antes de prod.
