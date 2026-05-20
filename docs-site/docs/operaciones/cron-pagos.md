---
title: Cron de pagos
sidebar_position: 3
description: Configura cron-job.org para generar cuotas mensuales automáticamente.
tags: [operaciones, cron, pagos]
---

Vercel es serverless: no hay proceso continuo donde correr `node-cron`. Solución: **disparador externo HTTP** mensual.

## Requisitos previos

- Cuenta gratuita en https://cron-job.org.
- Backend desplegado en Vercel con `CRON_SECRET` configurado.
- Endpoint `POST /api/pagos/generar-cron` accesible.

## Pasos

### 1. Crear cuenta en cron-job.org

https://cron-job.org/en/signup/

### 2. Crear cronjob

Settings:

| Campo | Valor |
|-------|-------|
| **Title** | GymSuite — generar pagos mensuales |
| **URL** | `https://<tu-backend>.vercel.app/api/pagos/generar-cron` |
| **Schedule** | "Once a month, on day 1 at 00:00 UTC" (o la hora que prefieras) |
| **Request method** | POST |
| **Request body** | (vacío) |

Custom headers:

| Header | Valor |
|--------|-------|
| `x-cron-secret` | `<valor de CRON_SECRET en Vercel>` |

### 3. Activar el cronjob

Toggle "Enable" en la página del job. Hasta que esté activado no se dispara.

### 4. Probar manualmente

Botón "Run" en la página del job. Verás el resultado:

| Status | Significado |
|--------|-------------|
| 200/201 | OK. Body `{ "mensaje", "generados", "clientes_procesados" }` |
| 401 | `x-cron-secret` no coincide |
| 500 | Error backend |

## Verificar con curl

```bash
curl -X POST https://<tu-backend>.vercel.app/api/pagos/generar-cron \
  -H "x-cron-secret: $CRON_SECRET"
```

Respuesta esperada (primer disparo del mes):

```json
{
  "mensaje": "...",
  "generados": 12,
  "clientes_procesados": 5
}
```

Respuesta esperada (segundo disparo del mismo mes):

```json
{
  "mensaje": "Todos los clientes ya tienen pagos generados para este mes",
  "generados": 0
}
```

> 💡 **Idempotente**
>
> El endpoint filtra clientes con pago del mes existente. Llamarlo varias veces el mismo mes no duplica pagos.

## Endpoint

`POST /api/pagos/generar-cron`. Mismo controller que `/generar`, distinta autorización:

| Endpoint | Autorización |
|----------|--------------|
| `/api/pagos/generar` | `verificarToken` + `verificarRol('admin', 'entrenador')` |
| `/api/pagos/generar-cron` | `verificarCronSecret` (header) |

`verificarCronSecret`:

```js title="server/middleware/auth.js"
const recibido = req.headers['x-cron-secret'];
const esperado = process.env.CRON_SECRET;
if (!recibido || !esperado) return res.status(401).json({ mensaje: 'No autorizado' });
const a = Buffer.from(recibido);
const b = Buffer.from(esperado);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ mensaje: 'No autorizado' });
}
next();
```

## Lanzamiento manual desde admin

Adicionalmente, admin/entrenador pueden disparar `POST /api/pagos/generar` desde un botón en el dashboard. Misma lógica.

## Monitoring

cron-job.org guarda historial de ejecuciones. Tras día 1 verificar:

| Indicador | Esperado |
|-----------|----------|
| Status últimas 5 ejecuciones | 200/201 |
| Tiempo de respuesta | < 10 s (timeout Vercel) |
| Body de respuesta | `{ generados: N }` con N > 0 el día 1, 0 los días siguientes |

Si supera 10s con muchos clientes, considerar:
- Paginar `generarPagos` en N llamadas.
- Migrar a plan Pro de Vercel (timeout 60s) o servidor con `node-cron`.

## Rotar `CRON_SECRET`

1. Generar nuevo valor (`crypto.randomBytes(32).toString('hex')`).
2. Actualizar en Vercel → Settings → Environment Variables → redeploy.
3. Actualizar header en cron-job.org.
4. Probar con "Run" manual.

Rotar periódicamente (cada 3–6 meses). Si se filtra, **rotar inmediatamente** — cualquiera puede disparar la generación.

## Lecturas relacionadas

- [Backend → Pagos lógica](../backend/pagos-logica.md)
- [Backend → Endpoints Pagos](../backend/endpoints/pagos.md#post-apipagosgenerar-cron)
- [Variables de entorno](./variables-entorno.md)
- [Decisiones → Cron externo](../arquitectura/decisiones.md#cron-externo)
