---
title: Arquitectura del cliente
sidebar_position: 1
description: AuthContext, axios interceptors, rutas protegidas y refresco automático de tokens.
tags: [frontend, arquitectura, react]
---

Arquitectura técnica del SPA: entry point, router, contexto de sesión, cliente HTTP, estilos y helpers. Para vistas específicas ver [Login 2FA](./vistas/login-2fa.md) y los 3 dashboards.

## Entry point — `App.jsx`

```
<AuthProvider>
  <BrowserRouter>
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
    <ModalForzadoSiAplica />
  </BrowserRouter>
</AuthProvider>
```

**Constante:** `RUTAS_ROL` — importada desde `src/constants.js` (no definida localmente).

**Componentes internos:**

| Componente | Propósito |
|------------|-----------|
| `RedireccionInicio` | Para `*` no reconocida: a `/login` si sin usuario, a `RUTAS_ROL[usuario.rol]` si con usuario |
| `ModalForzadoSiAplica` | Si `usuario?.forzar_cambio_password`, monta `<ModalCambiarContrasena forzado />` por encima de toda la app |

## Sesión global — `AuthContext`

**Organización de archivos:**
- `context/AuthContext.jsx` contiene `createContext`, `AuthProvider` y toda la lógica.
- `context/authContext.js` solo re-exporta `AuthContext` desde `./AuthContext` — existe para compatibilidad con imports previos.

### Inicialización

```js
const tokenInicial = leerCookie();
const usuarioInicial = tokenInicial
  ? { ...decodificarToken(tokenInicial), token: tokenInicial }
  : null;
```

Se ejecuta al cargar el módulo (antes del mount). La app arranca ya con sesión si la cookie sigue válida — sin flash de login.

**Helpers:**
- `leerCookie()` — regex `/(?:^|;\s*)token=([^;]+)/`.
- `decodificarToken(token)` — Soporte UTF-8 completo (ñ, tildes): normaliza URL-safe base64, convierte cada byte a `%HH`, aplica `decodeURIComponent` y parsea el JSON. **No verifica firma** (confía en backend).

### Funciones expuestas

| Función | Cuándo se usa |
|---------|---------------|
| `login(datos)` | Tras login + 2FA OK. Guarda cookie `token` (`SameSite=Strict`, 2h) y estado |
| `logout()` | Botón logout. Llama `POST /api/auth/logout` (ignora error) y `limpiarSesion` |
| `limpiarSesion()` | Borra cookie y resetea estado. Envuelta en `useCallback([], [])` para referencia estable. También usada por axios cuando refresh falla |
| `actualizarToken(nuevoToken)` | Tras cambiar contraseña. Sustituye token sin reloguear; el modal forzado se desmonta solo |

### Registro de callback de sesión expirada

```js
useEffect(() => { setSesionExpiradaCallback(limpiarSesion) }, [limpiarSesion]);
```

Inyecta `limpiarSesion` en `api.js` sin que los módulos se importen mutuamente.

### Hook

```js
// hooks/useAuth.js
export function useAuth() { return useContext(AuthContext); }
```

Único punto público para consumir la sesión.

## Cliente HTTP — `services/api.js`

Instancia axios con `withCredentials: true` (cookies cross-origin obligatorias para refresh_token).

### `BASE_URL`

```js
const BASE_URL = import.meta.env.VITE_API_URL ?? '';
```

| Entorno | Valor | Cómo llega al backend |
|---------|-------|-----------------------|
| Dev | `''` | Vite proxy `/api` → `localhost:5000` |
| Prod | `'https://gymsuite-api.vercel.app'` | Directo al dominio del backend |

### Interceptor de request

Lee cookie `token` y la adjunta como `Authorization: Bearer <token>`. Si no hay cookie, deja pasar (rutas públicas).

### Interceptor de response — refresh automático

```mermaid
flowchart TD
  Resp[Response llega] --> Code{status 401 y !_retry?}
  Code -->|no| Pass[Propaga al caller]
  Code -->|sí| Mark[_retry = true]
  Mark --> Ref[axios.post /api/auth/refresh<br/>NO api.post]
  Ref -->|OK| Set[Guardar cookie token nueva]
  Set --> Hdr[Sustituir header en original]
  Hdr --> Retry[api(original) reintenta]
  Retry --> Pass2[response al caller]
  Ref -->|FAIL| Clear[Borrar cookie token]
  Clear --> Cb[onSesionExpirada]
  Cb --> Pass3[Propaga rechazo]
```

**Detalles clave:**
- `original._retry` previene bucle infinito.
- `axios.post` nativo (no `api.post`) para evitar recursión a través del propio interceptor.
- Si refresh OK: sustituye header y reintenta — el componente no nota nada.
- Si refresh falla: `limpiarSesion` (callback) → `RutaProtegida` redirige a `/login`.

### `setSesionExpiradaCallback(fn)`

Exportada para que `AuthContext` registre `limpiarSesion` sin ciclo de imports.

## Estilos — `styles.js`

Dos objetos exportados. **No escribir clases de color directas en componentes — siempre referenciar tokens.**

| Objeto | Contenido |
|--------|-----------|
| `color` | Tokens semánticos (bgPagina, bgCard, acento, error…) |
| `nivelBadge` | Mapping nivel cliente → clases tailwind |
| `s` | Clases compuestas reutilizables (input, btnPrimary, modalBackdrop, modalCard…) |

Detalle: [Estilos y paleta](./estilos.md).

## Helpers — `utils/`

Las utilidades viven en `client/src/utils/`. El archivo `utils/index.js` re-exporta todo de `utils/formatos.js`, así los imports existentes (`from '../utils'`) siguen funcionando.

| Helper | Devuelve | Uso |
|--------|----------|-----|
| `centimosAEuros(centimos)` | number | Inputs en euros |
| `eurosACentimos(euros)` | integer | Antes de mandar al backend |
| `formatearImporte(centimos)` | string | `"40 €"` o `"40,50 €"` |
| `formatearFecha(fecha)` | string | `"DD/MM/YYYY"` o `"—"` |

Detalle: [Helpers](./helpers.md).

## Constantes — `constants.js`

```js
export const RUTAS_ROL = { admin: '/admin', entrenador: '/entrenador', cliente: '/cliente' }
```

Importado en `App.jsx` y `LoginPage.jsx`. Antes estaba duplicado en ambos.

## Hooks de negocio — `hooks/`

Hooks que encapsulan fetching + estado de los dashboards.

| Hook | Parámetros | Devuelve | Usado en |
|------|------------|----------|----------|
| `useUsuarios(rolUsuario)` | `'admin'` \| `'entrenador'` | `{ clientes, empleados, setClientes, setEmpleados, cargando, recargar }` | `AdminDashboard`, `EntrenadorDashboard` |
| `usePagosGenerar(onExito)` | callback | `{ confirmar, resultado, cargando, abrir, ejecutar, cerrarResultado }` | Ambos dashboards |
| `useConfirmarPago(setUltimoPago, setErrorOperacion)` | setters | `{ confirmacionPago, confirmandoPago, abrirConfirmacion, ejecutar }` | Ambos dashboards |
| `useCuotas()` | — | array de cuotas | Dashboards + `ModalUsuario` |

## Vite — `vite.config.js`

Proxy para evitar CORS en dev:

```js
server: {
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true },
  },
},
```

En prod no se usa el proxy (Vite no corre); axios apunta directo al backend con `VITE_API_URL`.

## Patrones recurrentes

### Separación presentación/lógica

- **Páginas** (`pages/`): estado, fetches, orquestación de modales.
- **Componentes** (`components/`): presentación pura, props + callbacks.
- **Excepciones**: algunos modales (`ModalGestionCuotas`, `ModalReactivar`) llaman API porque encapsulan flujos completos.

### Modal abierto/cerrado por dato (no boolean)

```js
const [modalPagos, setModalPagos] = useState(null);  // null o cliente
// ...
{modalPagos && (
  <ModalPagos cliente={modalPagos} onClose={() => setModalPagos(null)} />
)}
```

Beneficio: cuando se cierra, el componente se desmonta — su estado interno se resetea sin esfuerzo.

### Refresh local de listas

Tras una acción que modifica un solo elemento (editar, baja/alta), **actualizar la lista local sin refetch completo**:

```js
setClientes(prev => prev.map(cliente =>
  cliente._id === clienteActualizado._id ? clienteActualizado : cliente
));
```

Para altas nuevas, **sí** refetch completo (necesitamos `_id` y `fecha_alta` del backend).

### `useMemo` para listas filtradas

`AdminDashboard` calcula `listaFiltrada` con `useMemo` — filtros no recomputan en cada render.

### `Promise.allSettled` para cargas tolerantes a fallos

`ClienteDashboard` carga perfil, pagos y mediciones en paralelo. Si una falla (ej: 404 sin mediciones) las otras no se ven afectadas.

### `Promise.all` para cargas todo-o-nada

`AdminDashboard.fetchStats()` lanza 7 peticiones — si una falla, error global.

## Lecturas relacionadas

- [Vistas — Login 2FA](./vistas/login-2fa.md)
- [Componentes compartidos](./componentes-compartidos.md)
- [Rutas protegidas](./rutas-protegidas.md)
- [Estilos y paleta](./estilos.md)
- [Helpers](./helpers.md)
