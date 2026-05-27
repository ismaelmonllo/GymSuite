---
title: Dashboard del admin
sidebar_position: 2
description: Cards de stats, tabla de clientes/empleados, gestión de cuotas, generación manual de pagos.
tags: [frontend, vista, admin]
---

`pages/AdminDashboard.jsx`. Pantalla central del admin.

## Capacidades

- Ver stats agregadas (facturación, pagos, usuarios, altas).
- Listar clientes y empleados (entrenadores + admins).
- Crear, editar, dar de baja/alta.
- Eliminar definitivamente usuarios de baja (botón `Trash2`, solo visible en filas con `activo: false`).
- Gestionar tipos de cuota.
- Generar pagos del mes manualmente.
- Confirmar pagos pendientes desde la tabla.
- Cambiar cuota de un cliente.

## Estado principal

| State | Tipo | Función |
|-------|------|---------|
| `stats` | object | Normalizado por `fetchStats()` |
| `clientes`, `empleados` | array | Listas separadas |
| `ultimoPago` | object | Mapa `{ clienteId: { pendiente, mes, grupo_pago, tipo_cuota } }` |
| `cuotas` | array | Tipos de cuota disponibles |
| `vista` | `'clientes'` \| `'empleados'` | Toggle de la tabla |
| `busqueda`, `campoBusqueda`, `filtroActivo`, `filtroPago`, `ordenar` | — | Controles tabla |
| `modalCuotas`, `modalUsuario`, `modalPagos`, `modalCambioCuota`, `confirmacionBajaAlta`, `confirmacionEliminar`, `confirmandoPago`, `confirmacionPago`, `confirmarGenerarPagos`, `resultadoGenerarPagos`, `generandoPagos`, `errorOperacion` | varios | Estados de modales (patrón dato \| null) |

## Funciones internas

| Función | Qué hace |
|---------|---------|
| `fetchStats()` | 7 peticiones en paralelo a `/api/stats/*`. Suma el total anual desde el array mensual. Devuelve `{ mesPagado, anualTotal, mesPagados, mesPendientes, clientes, trabajadores, altasMes, altasAnio }` formateado |
| `fetchUsuarios()` | `/api/clientes` + `/api/entrenadores` + `/api/administradores` en paralelo. Fusiona empleados |
| `listaFiltrada` (`useMemo`) | Aplica filtros y orden. En vista empleados excluye al propio usuario logueado |
| `toggleActivo(u)` | `PATCH /api/{tipo}/{id}/baja\|alta`. Actualiza lista local sin refetch |
| `eliminarUsuario(u)` | `DELETE /api/{tipo}/{id}`. Borrado físico; quita el documento de la lista local. Solo accesible desde el botón `Trash2` que aparece en usuarios de baja |
| `abrirPerfilPropio()` | Carga el perfil del admin/entrenador logueado y abre `ModalUsuario` |
| `ejecutarGenerarPagos()` | `POST /api/pagos/generar`. Muestra resultado en modal. Si `generados === 0`, mensaje específico. Refresca `ultimoPago` |
| `confirmarPago(u)` | Abre `ModalConfirmarPago` con el pago pendiente del mes |
| `ejecutarConfirmacionPago()` | `POST /api/pagos/registrar` con `grupo_pago`. Refetch del mapa `ultimoPago` |

## Layout

### Desktop

- Header: avatar clickable + GymSuite + `BtnGenerarPagos` + logout.
- Grid `lg:grid-cols-5`: 4 `StatCard` (Facturación, Pagos del mes, Usuarios, Altas) + columna con "Gestionar cuotas" y "+ Añadir".
- Fila de controles: botón "Ver empleados/clientes" + `FiltrosUsuarios`.
- `ListaUsuarios` (tabla).

### Móvil

- `BtnGenerarPagos` full width debajo del header.
- StatCards en grid 2×2.
- Botón "Gestionar cuotas" full width.
- "Ver" + "+ Añadir" en una fila.
- Filtros plegables.
- Lista de cards (no tabla).

## Modales que orquesta

| Modal | Cuándo se abre |
|-------|----------------|
| `ModalGestionCuotas` | Click "Gestionar cuotas" |
| `ModalUsuario` | Click avatar, "+ Añadir", "Ver perfil" |
| `ModalPagos` | Click "Ver pagos" en una fila |
| `ModalCambioCuota` | Click "Cambiar cuota" en una fila |
| `ModalConfirmarPago` | Click ✓ en columna "Último pago" |
| `ModalConfirmacion` | Baja/alta + eliminar usuario + generar pagos |
| `ModalResultado` | Tras generar pagos / errores |

## Lecturas relacionadas

- [Dashboard entrenador](./dashboard-entrenador.md)
- [Dashboard cliente](./dashboard-cliente.md)
- [Componentes compartidos](../componentes-compartidos.md)
