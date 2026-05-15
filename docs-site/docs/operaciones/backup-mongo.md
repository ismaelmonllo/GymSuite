---
title: Backup de MongoDB
sidebar_position: 4
description: Dump, restore y fallback con MONGODB_URI_BACKUP.
tags: [operaciones, mongodb, backup]
---

Backup mínimo: cluster Atlas con backup automático activado + URI de respaldo (`MONGODB_URI_BACKUP`) usable como fallback.

> ℹ️ **Estado actual**
>
> Backup manual con `mongodump` no implementado en script. Atlas M0/M2 incluye **snapshots automáticos** del cluster — usar ese como primer mecanismo.

## Fallback automático

`server/config/db.js`:

```js
try { await mongoose.connect(MONGODB_URI); }
catch {
  try { await mongoose.connect(MONGODB_URI_BACKUP); }
  catch { process.exit(1); }
}
```

Si `MONGODB_URI_BACKUP` apunta a un cluster réplica, GymSuite sigue sirviendo si el primario cae. El cluster réplica debe sincronizarse manualmente (snapshot + restore) o vía Atlas multi-region (plan superior).

## Snapshot Atlas

Atlas Free/Shared: **no incluye** snapshots gestionados (M0). Para activarlos: M2+ (de pago).

Cluster Dedicated: snapshots cada 6h + retención configurable.

### Restore

Desde Atlas UI: Backups → "Restore" → elegir snapshot + destino.

## Backup manual con mongodump

`mongodump` lee del URI y guarda BSON en disco. Útil para snapshot puntual antes de un cambio destructivo.

```bash
# Dump completo a carpeta
mongodump --uri "$MONGODB_URI" --out ./backups/gymsuite-$(date +%Y%m%d-%H%M)

# Dump una colección concreta
mongodump --uri "$MONGODB_URI" --collection pagos --out ./backups/pagos-$(date +%Y%m%d)
```

### Restore

```bash
# Restore completo (drop antes)
mongorestore --uri "$MONGODB_URI" --drop ./backups/gymsuite-YYYYMMDD-HHMM

# Restore una colección
mongorestore --uri "$MONGODB_URI" --collection pagos --drop ./backups/pagos-YYYYMMDD/gymsuite/pagos.bson
```

> 🚨 **`--drop` borra antes de restaurar**
>
> Sin `--drop`, `mongorestore` no machaca docs existentes (los mantiene). Con `--drop`, borra la colección y la recrea desde el dump. Verificar antes de usar en prod.

## Cuándo hacer backup manual

| Situación | Acción |
|-----------|--------|
| Antes de subir migración destructiva | `mongodump` completo |
| Antes de borrar tipo de cuota / cliente masivo | `mongodump` de `pagos` + `usuarios` + `tipos_cuota` |
| Backup periódico (proyecto académico) | Snapshot Atlas semanal manual |

## Esquema de colecciones a respaldar

Las 5 colecciones, en orden de importancia:

| Colección | Crítica | Razón |
|-----------|:-------:|-------|
| `usuarios` | ✅ | Pierde clientes y empleados; rehacer = manual |
| `pagos` | ✅ | Historial financiero |
| `tipos_cuota` | ✅ | Catálogo del gimnasio |
| `mediciones` | ✅ | Historial antropométrico |
| `otps` | ❌ | Caduca en 5 min. No backup |

## Migración entre clusters

```bash
# 1. Dump del cluster origen
mongodump --uri "$URI_ORIGEN" --out ./migracion

# 2. Verificar contenido
ls ./migracion/gymsuite/

# 3. Restore al cluster destino
mongorestore --uri "$URI_DESTINO" --drop ./migracion/gymsuite
```

Útil para clonar prod → preview o migrar de cluster M0 → M10.

## Recovery checklist

Si el cluster principal cae:

1. Comprobar Atlas dashboard del cluster — ¿es problema de red, IP whitelist o down?
2. `GET /api/health` → ¿`mongo: 'desconectado'`?
3. Si caído > 5 min: verificar que `MONGODB_URI_BACKUP` está bien configurada en Vercel.
4. Si el backup también está down: snapshot Atlas → restore → actualizar `MONGODB_URI` en Vercel.

## Lecturas relacionadas

- [Despliegue](./despliegue.md) — IP whitelist Atlas
- [Variables de entorno](./variables-entorno.md)
- [Monitorización](./monitoring.md)
