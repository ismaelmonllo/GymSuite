---
title: Dashboard del cliente
sidebar_position: 4
description: Tres cards (Perfil, Pagos, Mediciones) en modo solo lectura.
tags: [frontend, vista, cliente]
---

`pages/ClienteDashboard.jsx`. Tres cards clickables que abren modales en modo `soloLectura`. El cliente nunca modifica datos — solo consulta.

## Estado

| State | Tipo | Función |
|-------|------|---------|
| `perfil` | object | `tipo_cuota` populado (`GET /api/clientes/perfil`) |
| `pagos` | array | `GET /api/pagos/mis-pagos` |
| `mediciones` | array | Orden desc (`GET /api/mediciones`) |
| `cargando` | boolean | Mientras `Promise.allSettled` está pendiente |
| `modalPerfilAbierto`, `modalPagosAbierto`, `modalMedicionesAbierto`, `modalUltimaMedicion` | boolean / object | Modales |

## Cargas (`Promise.allSettled`)

Las 3 peticiones en paralelo. Si una falla (ej: 404 "sin mediciones"), las otras siguen.

```js
const [resPerfil, resPagos, resMed] = await Promise.allSettled([...]);
if (resPerfil.status === 'fulfilled') setPerfil(resPerfil.value.data.cliente);
// ...
```

## Cálculos derivados

| Cálculo | Cómo |
|---------|------|
| `pagoMesActual` | `pagosMesActual.find(p => !p.pendiente) ?? pagosMesActual[0]` (prevalece confirmado en caso de edge case) |
| `estadoPago` | `'confirmado'` \| `'pendiente'` \| `'no-generado'` |
| `ultimoPagoConfirmado` | Para "Último pago: dd/mm/yyyy" |
| `mesVencimiento` | `mesesPagados.sort().at(-1)` |
| `calcularUltimoDia(mes)` | `new Date(anio, m, 0)` (truco: día 0 = último del mes anterior) |
| `deltaPeso`, `deltaGrasa` | Diferencia entre última y penúltima medición. Helper `calcularDelta(ultimo, anterior)` → `{ signo, valor, arriba } \| null` |

## Layout

| Tamaño | Layout |
|--------|--------|
| Desktop | Grid 2 columnas: Perfil + Pagos arriba, Mediciones full-width centrada (`max-w-sm`) |
| Móvil | 1 columna apilada |

## Cards

| Card | Contenido |
|------|-----------|
| **Perfil** | Nombre + apellidos + badge nivel + correo + teléfono |
| **Pagos** | Badge estado + última fecha confirmada + "Cubierto hasta dd/mm/yyyy" |
| **Mediciones** | Fecha última + peso/altura/grasa con deltas ▲▼ + icono ojo para detalle |

> 💡 **Iconos en Mediciones**
>
> El icono ojo usa `e.stopPropagation()` para no disparar el `onClick` de la card (que abriría el historial completo).

## Colores de delta

| Indicador | Color |
|-----------|-------|
| Peso baja | Verde |
| Peso sube | Naranja |
| Grasa sube | Rojo |

## Modales abiertos

| Modal | Modo |
|-------|------|
| `ModalUsuario` | Lectura |
| `ModalPagos` | Lectura (sin botones de modificación) |
| `ModalMedicionesHistorial` | Lectura, `medicionesIniciales` para evitar fetch redundante |
| `ModalMedicionCompleto` | Modo ver, `mediciones` para navegación cronológica con `StepperFecha` |

## Lecturas relacionadas

- [Backend → Pagos lógica](../../backend/pagos-logica.md) (Cubierto hasta, estado pago)
- [Backend → Mediciones cálculo](../../backend/mediciones-calculo.md)
