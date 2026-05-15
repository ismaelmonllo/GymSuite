---
title: Monitorización
sidebar_position: 5
description: Logs Vercel, endpoints de health y métricas.
tags: [operaciones, monitoring]
---

Monitorización mínima sin servicios externos pagos: logs de Vercel + `/api/health` + dashboard cron-job.org.

## `/api/health`

Endpoint público que reporta estado del backend y conexión Mongo.

```bash
curl https://<tu-backend>.vercel.app/api/health
```

**200 OK:**

```json
{ "estado": "ok", "mongo": "conectado", "readyState": 1 }
```

**503 Service Unavailable** (mongo no conectado):

```json
{ "estado": "degradado", "mongo": "desconectado", "readyState": 0 }
```

### Estados de `readyState` (Mongoose)

| Valor | Significado |
|-------|-------------|
| 0 | desconectado |
| 1 | conectado |
| 2 | conectando |
| 3 | desconectando |

## Logs de Vercel

Vercel dashboard → proyecto → Deployments → último → **Functions** (logs invocaciones serverless).

| Filtro | Para qué |
|--------|----------|
| Status: 500 | Errores no controlados |
| Duration > 5000ms | Funciones lentas (cerca del timeout) |
| Path: `/api/auth/login` | Diagnosticar problemas de login |
| Path: `/api/pagos/generar*` | Verificar cron mensual |

> 💡 **Logs en realtime**
>
> `vercel logs --follow <project>` desde la CLI muestra logs en streaming. Útil para reproducir bugs en prod.

## cron-job.org dashboard

Tras cada disparo mensual, verificar:

| Indicador | OK |
|-----------|----|
| Última ejecución | día 1 del mes |
| Status | 200/201 |
| Duración | < 5s típica, < 10s techo |
| Body | `{ generados: N }` |

Configura email de alerta en cron-job.org → Settings → Notifications → "Notify on failure".

## Métricas a vigilar

| Métrica | Cómo medir | Umbral |
|---------|------------|--------|
| Latencia login | Logs Vercel — duration de `/api/auth/login` | < 500 ms (bcrypt domina) |
| Latencia consulta | Duration de `GET /api/clientes` | < 200 ms |
| Tiempo de generar pagos | Logs de `/generar*` | < 5 s con < 100 clientes |
| Fallos auth | Cantidad de 401/403 vs 200 | < 5% |
| Cold start | Duration peticiones tras inactividad | < 2 s |

## Alertas básicas

| Servicio | Alerta |
|----------|--------|
| Vercel | Email automático si una function falla repetidamente |
| cron-job.org | Email si el job falla |
| Atlas | Email si el cluster cae / supera quotas |
| Gmail | Notificación si la app password se revoca |

## Diagnóstico rápido

### "El login no funciona en prod"

1. `curl https://<backend>/api/health` → ¿200 con `mongo: conectado`?
2. Si 503 → Atlas down o IP whitelist mal.
3. Si 200 → revisar logs Vercel del path `/api/auth/login`.
4. Si no llega 2FA → revisar `EMAIL_PASS` (¿se revocó la app password?).

### "El cron no genera pagos"

1. cron-job.org dashboard → última ejecución, ¿200?
2. Si 401 → `x-cron-secret` no coincide con `CRON_SECRET` en Vercel.
3. Si 500 → logs Vercel del path `/api/pagos/generar-cron`.

### "Una página específica tarda mucho"

1. Network tab DevTools → ver qué request es lenta.
2. Logs Vercel de ese endpoint → ¿duration alta?
3. Si tarda > 5s → posible problema de Atlas (índices, query mal optimizada).

## Próximos pasos (no implementado)

Para producción real, considerar:

- **Sentry**: error tracking con stack traces.
- **Logtail / Better Stack**: logs centralizados.
- **UptimeRobot** o **Better Uptime**: ping a `/api/health` cada N minutos.
- **Atlas Performance Advisor**: sugiere índices automáticamente.

## Lecturas relacionadas

- [Despliegue](./despliegue.md)
- [Backup MongoDB](./backup-mongo.md)
- [Backend → Errores](../backend/errores.md)
