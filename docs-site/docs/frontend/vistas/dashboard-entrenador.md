---
title: Dashboard del entrenador
sidebar_position: 3
description: Versión reducida del admin — gestión de clientes y mediciones.
tags: [frontend, vista, entrenador]
---

`pages/EntrenadorDashboard.jsx`. Versión reducida del admin: solo gestiona clientes. Sin stats, sin empleados, sin cuotas.

## Diferencias vs admin

| Aspecto | Admin | Entrenador |
|---------|-------|------------|
| Cards de stats | ✅ | ⛔ |
| Botón "Gestionar cuotas" | ✅ | ⛔ |
| Vista "empleados" | ✅ | ⛔ |
| Ver mediciones desde tabla | ⛔ | ✅ (botón en `ListaUsuarios` con `mostrarMediciones`) |
| `abrirPerfilPropio` | `/api/administradores/:id` | `/api/entrenadores/:id` |

## Capacidades

- Listar clientes.
- Crear, editar, dar de baja/alta.
- Generar pagos del mes.
- Confirmar pagos.
- Cambiar cuota de un cliente.
- **Ver historial de mediciones** y abrir `ModalMedicionesHistorial`.

## Modales

Mismo conjunto que admin sin `ModalGestionCuotas` ni `ModalUsuario` con `rolEditable`. Añade `ModalMedicionesHistorial` al click en "Ver mediciones".

## Layout

Mismo grid responsive que admin, sin la columna de stats y sin el toggle "clientes/empleados".

## Lecturas relacionadas

- [Dashboard admin](./dashboard-admin.md)
- [Backend → Endpoints Mediciones](../../backend/endpoints/mediciones.md)
