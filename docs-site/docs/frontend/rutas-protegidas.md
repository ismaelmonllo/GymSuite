---
title: Rutas protegidas
sidebar_position: 6
description: Componente RutaProtegida, RutaRol y redirecciones según rol.
tags: [frontend, rutas, autorización]
---

Dos wrappers React Router que protegen rutas: `RutaProtegida` (exige usuario logueado) y `RutaRol` (exige rol específico).

## Esquema

```mermaid
flowchart TD
  Req[Request a /admin] --> RP{RutaProtegida<br/>useAuth.usuario?}
  RP -->|no| Login[Navigate /login]
  RP -->|sí| RR{RutaRol rol="admin"<br/>usuario.rol === "admin"?}
  RR -->|no| Suyo[Navigate /usuario.rol]
  RR -->|sí| Page[AdminDashboard]
```

## `RutaProtegida.jsx`

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RutaProtegida() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

Función: si no hay usuario en el contexto, redirige a `/login`. Si hay, renderiza la ruta hija (`Outlet`).

## `RutaRol.jsx`

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const RUTAS_ROL = { admin: '/admin', entrenador: '/entrenador', cliente: '/cliente' };

export default function RutaRol({ rol }) {
  const { usuario } = useAuth();
  if (usuario.rol !== rol) return <Navigate to={RUTAS_ROL[usuario.rol]} replace />;
  return <Outlet />;
}
```

Función: si el rol del usuario no coincide con el `prop.rol`, redirige al dashboard de su propio rol. Si coincide, renderiza la ruta hija.

## Configuración en `App.jsx`

```jsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<RutaProtegida />}>
    <Route element={<RutaRol rol="admin" />}>
      <Route path="/admin" element={<AdminDashboard />} />
    </Route>
    <Route element={<RutaRol rol="entrenador" />}>
      <Route path="/entrenador" element={<EntrenadorDashboard />} />
    </Route>
    <Route element={<RutaRol rol="cliente" />}>
      <Route path="/cliente" element={<ClienteDashboard />} />
    </Route>
  </Route>
  <Route path="*" element={<RedireccionInicio />} />
</Routes>
```

El anidamiento garantiza:
1. Toda ruta privada pasa primero por `RutaProtegida`.
2. Cada dashboard pasa además por `RutaRol`.

## Comportamiento

| Estado del usuario | Ruta solicitada | Resultado |
|--------------------|-----------------|-----------|
| Sin sesión | `/admin` | → `/login` |
| Sin sesión | `/login` | render `LoginPage` |
| Admin | `/admin` | render `AdminDashboard` |
| Admin | `/cliente` | → `/admin` (su propio dashboard) |
| Cliente | `/admin` | → `/cliente` |
| Cualquiera | `/ruta-inexistente` | `RedireccionInicio`: a `/login` o a su dashboard |

## `RedireccionInicio()`

Para `path="*"`:

```jsx
function RedireccionInicio() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={RUTAS_ROL[usuario.rol] ?? '/login'} replace />;
}
```

## `ModalForzadoSiAplica` — bloqueo global

Vive **fuera** del router (al lado de `<Routes>`):

```jsx
<BrowserRouter>
  <Routes>...</Routes>
  <ModalForzadoSiAplica />
</BrowserRouter>
```

Razón: el modal debe poder cubrir **toda** la app cuando el usuario tiene `forzar_cambio_password=true`, no solo una ruta concreta.

```jsx
function ModalForzadoSiAplica() {
  const { usuario } = useAuth();
  if (usuario?.forzar_cambio_password) return <ModalCambiarContrasena forzado />;
  return null;
}
```

## Defensa en profundidad

El backend ya valida rol en cada endpoint (`verificarRol`). Los wrappers de frontend son defensa en profundidad — si fallaran, el backend seguiría rechazando con 403. **Backend es la fuente de verdad**.

## Lecturas relacionadas

- [Arquitectura del cliente](./arquitectura.md)
- [Arquitectura → Modelo de roles](../arquitectura/modelo-roles.md)
- [Backend → Auth flujo](../backend/auth-flujo.md)
