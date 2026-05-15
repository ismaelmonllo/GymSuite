---
title: Componentes compartidos
sidebar_position: 3
description: Modales, stepper, tablas y otros componentes reutilizables.
tags: [frontend, componentes]
---

Componentes reutilizables organizados por dominio. Ver árbol en [Estructura](./arquitectura.md).

## `components/auth/`

| Componente | Props clave | Función |
|------------|-------------|---------|
| `CardLogin` | `tab, correo, error, cargando, callbacks` | Card de login con pestañas. Presentación pura |
| `Modal2FA` | `correo, onVerificar, onCerrar, error, cargando` | Input OTP 6 dígitos. Auto-focus, filtra no-dígitos |
| `RutaProtegida` | — | Wrapper `<Outlet />`. `Navigate to="/login"` si sin usuario |
| `RutaRol` | `rol` | Wrapper `<Outlet />`. Redirige a `/{usuario.rol}` si no coincide |

## `components/dashboard/`

| Componente | Props clave | Función |
|------------|-------------|---------|
| `BtnGenerarPagos` | `onClick, cargando, className` | Botón "Generar pagos". Disabled durante `cargando` |
| `CardDashboard` | `icono, titulo, onClick, children` | Card clickable, accesible por teclado |
| `FiltrosUsuarios` | `busqueda, campo, filtros, ordenar, children` | Buscador + filtros. Móvil con `SlidersHorizontal` plegable |
| `ListaUsuarios` | `lista, ultimoPago, mesActual, callbacks, mostrarMediciones` | Lista responsive: cards móvil / tabla desktop |
| `StatCard` | `icono, titulo, principal, secundario, cargando, valorCompacto` | Tarjeta de estadística con skeleton |

## `components/layout/`

| Componente | Props | Función |
|------------|-------|---------|
| `Header` | `usuario, subtitulo, onLogout, onAvatarClick, children` | Cabecera. Avatar con iniciales si hay usuario; solo "GymSuite" centrado si no |

`iniciales(nombre, apellidos)` toma la primera letra de cada uno en mayúscula.

## `components/ui/`

| Componente | Props | Función |
|------------|-------|---------|
| `Badge` | `variante` | Etiqueta de color por variante (activo, baja, pendiente, confirmado, no-generado, principiante, intermedio, avanzado, admin, entrenador) |
| `CampoFormulario` | `label, error, children` | Envoltorio `label + input + error` |
| `IconButton` | `icono, titulo, onClick, disabled, procesando, colorHover, size` | Botón de icono con spinner si `procesando` |
| `StepperFecha` | `fecha, puedeAnterior, puedeSiguiente, onAnterior, onSiguiente` | Input fecha solo lectura con flechas. Formatea `DD/MM/YYYY` con `T00:00:00` para parsing local |
| `ValidacionContrasena` | `valor` | 5 indicadores en tiempo real (12+, min, may, num, símb) |

## `components/modals/`

Convenciones: todos heredan de `ModalBase` (excepto `Modal2FA` que está en `auth/`). Todos reciben `onClose` o `onCerrar`. La mayoría notifica al padre con `onGuardar` / `onConfirmar` para refresh local sin refetch.

| Modal | Props clave | Función |
|-------|-------------|---------|
| `ModalBase` | `titulo, onClose, ancho, cerrable, children` | Carcasa: overlay + card con cabecera scrollable. `cerrable={false}` desactiva X y overlay |
| `ModalResultado` | `exito, mensaje, onCerrar` | Feedback éxito/error |
| `ModalConfirmacion` | `mensaje, textoConfirmar, peligro, soloConfirmar, onConfirmar, onCancelar` | Sí/No genérico |
| `ModalCambiarContrasena` | `onClose, forzado` | Cambio propio. Modo `forzado` sin X ni cancelar. Tras éxito, `actualizarToken` |
| `ModalUsuario` | `usuario, rolEditable, soloLectura, onClose, onGuardar` | Crear/editar/ver. Si admin edita a otro, botón "Resetear contraseña" |
| `ModalReactivar` | `inactivos, onClose, onReactivado` | Coincidencia con usuario inactivo al crear (409). Card por candidato con "Dar de alta" |
| `ModalPagos` | `cliente, cuotas, soloLectura, bloqueadoEdicion, onClose, onPagoConfirmado, onCuotaCambiada` | Info cuota actual + botones + historial |
| `ModalCambioCuota` | `cliente, cuotas, onClose, onGuardar` | Radio buttons. `PATCH /api/clientes/:id/cuota` |
| `ModalConfirmarPago` | `cliente, pago, cuota, onConfirmar, onCancelar` | Modal corto desde columna "Último pago" |
| `ModalGestionCuotas` | — | CRUD inline de cuotas (solo admin). Convierte euros↔céntimos |
| `ModalMedicionCompleto` | `cliente, medicion, mediciones, modoInicial, onClose` | Detalle medición ver/editar/nueva. `StepperFecha` si `mediciones.length > 1`. Patrón "adjust state during render" |
| `ModalMedicionesHistorial` | `cliente, medicionesIniciales, soloLectura, bloqueadoEdicion, onClose` | Tabla/cards de mediciones con acciones |
| `ModalGraficaMediciones` | — | Recharts. Colores hex literal (no Tailwind). Agrupados por zona anatómica |

## Patrón "modal abierto/cerrado por dato"

```js
const [modalPagos, setModalPagos] = useState(null);
{modalPagos && <ModalPagos cliente={modalPagos} onClose={() => setModalPagos(null)} />}
```

Beneficio: al cerrar, el modal se desmonta y su estado interno se resetea sin esfuerzo.

## Variantes de `Badge`

| Variante | Color |
|----------|-------|
| `activo`, `confirmado`, `avanzado` | Verde |
| `pendiente` | Rojo |
| `baja`, `no-generado`, `admin` | Gris |
| `principiante` | Azul |
| `intermedio` | Ámbar |
| `entrenador` | Naranja |
