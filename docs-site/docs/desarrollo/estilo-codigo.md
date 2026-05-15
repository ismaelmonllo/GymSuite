---
title: Estilo de código
sidebar_position: 2
description: Nombres, comentarios y convenciones del proyecto.
tags: [desarrollo, estilo]
---

Convenciones de código de GymSuite. **Coherentes en backend y frontend.**

## Principios

1. **Mantener las cosas lo más simples posible.** No abstracciones prematuras.
2. **Código modular, componentes reutilizables.**
3. **Responsive: móvil y escritorio.** Tailwind breakpoints.
4. **Autenticación con tokens seguros, contraseñas con bcrypt, control de acceso por rol** en rutas (backend) y vistas (frontend).

## Nombres

### Idioma

**Español** para todo lo que no sea reserved keyword del lenguaje o nombre de paquete:

- Variables: `usuario`, `cliente`, `pago` (no `user`, `client`, `payment`).
- Funciones: `crearCliente`, `verificarToken`, `generarOTP`.
- Comentarios: español (ver más abajo).
- Mensajes de error / commits: español.

### Parámetros descriptivos

**Nunca letras sueltas** como `v`, `u`, `c`, `r`, `p` en funciones flecha. Salvo `e` en handlers DOM (`onChange={e => ...}`, `onClick={e => ...}`).

En `.map` / `.filter` / `.find` / `.then` usar el nombre del concepto:

```js
clientes.map(cliente => cliente.nombre)
pagos.filter(pago => !pago.pendiente)
usuarios.find(usuario => usuario._id === id)
api.get('/api/clientes').then(res => setClientes(res.data.clientes))
```

Si colisiona con scope exterior, usar abreviatura clara:

```js
const usuario = useAuth().usuario;
clientes.map(usr => ...)  // abreviatura, no `c` ni `u`
```

### Funciones flecha vs función nombrada

- **Function** para handlers de endpoints (controllers): `export const crearCliente = async (req, res) => { ... }`.
- **Flecha** para callbacks y handlers cortos.
- **Function declaration** para helpers exportados del frontend (`export function useAuth()`).

## Comentarios

### Idioma

**Español.**

### Forma verbal

**Infinitivo:** `Buscar`, `Comparar`, `Generar`, `Validar`. No `Busca`, `Comparando`.

### Dónde poner

1. **Encima de cada función**, una o dos líneas explicando qué hace globalmente.
2. **Dentro de la función**, en cada bloque de lógica que lo merezca.

### Tono

Simple y directo. Sin jerga innecesaria. Cuando aplique, incluir el **por qué**.

### Extensión

**Una o dos líneas.** Comentarios más largos → posiblemente refactorizar la función.

### Ejemplos

```js
// Verificar que el token JWT es válido y asignar el usuario decodificado a la request.
export const verificarToken = (req, res, next) => {
  // Extraer del header Authorization: Bearer <token>
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ mensaje: 'Token no proporcionado' });

  try {
    // jwt.verify lanza si la firma es inválida o el token expiró
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};
```

```js
// Repartir el importe entre N meses sin perder céntimos. El último mes lleva el resto.
const importeBase = Math.floor(importe / meses);
const resto = importe - importeBase * meses;
```

### Anti-patrones

```js
// Crea un nuevo cliente con los datos del body. ← redundante, lo dice el nombre
export const crearCliente = async (req, res) => { ... };

// i ← inútil
const i = 0;

// Suma 1                       ← inútil
contador++;
```

## React

### Componentes

- **PascalCase** en archivos: `LoginPage.jsx`, `ModalUsuario.jsx`.
- **Function components** con `export default`.
- **Props desestructuradas** en la firma:

```jsx
export default function CardLogin({ tab, correo, error, cargando, onChangeTab, onSubmit }) {
  // ...
}
```

### Hooks

- `useState`: descripción del estado, no del setter. `const [usuario, setUsuario] = useState(null)`.
- `useEffect`: comentario encima si la dependencia o la lógica no son obvias.
- `useMemo` / `useCallback`: solo cuando hay un beneficio claro de rendimiento.

### Modales abiertos por dato (no boolean)

```jsx
const [modalPagos, setModalPagos] = useState(null);  // null o cliente
{modalPagos && <ModalPagos cliente={modalPagos} onClose={() => setModalPagos(null)} />}
```

Al cerrar, el componente se desmonta y su estado interno se resetea sin esfuerzo.

## Estilos (Tailwind)

- **Nunca clases de color directas** en componentes. Usar tokens de `styles.js`.
- **Responsive con prefijos** (`sm:`, `md:`, `lg:`).
- **Clases compuestas reutilizables** en `s` de `styles.js`.

Detalle: [Estilos y paleta](../frontend/estilos.md).

## Mongoose

- **Comprobar resultado según el método** ([ADR-004](../arquitectura/decisiones.md#consultas-mongoose)):
  - `find` → `.length === 0`.
  - `findById*` → `!resultado`.
  - `save()` → try/catch.

- **No usar `findAll`** (Sequelize).

- **`populate`** explícito cuando necesitas el documento referenciado:

```js
const cliente = await Usuario.findById(id).populate('tipo_cuota');
```

## Importes en céntimos

**Siempre enteros en BD.** Convertir en frontend con `eurosACentimos` antes de mandar, `centimosAEuros` y `formatearImporte` al pintar. Ver [ADR-002](../arquitectura/decisiones.md#centimos).

## ES modules

```js
import bcrypt from 'bcrypt';
export const crearCliente = async (req, res) => { ... };
```

**Nunca** `require` / `module.exports`. Si dependencia lee `process.env`, instanciar **dentro de la función** ([ADR-003](../arquitectura/decisiones.md#esm)).

## Errores en backend

```js
return res.status(400).json({ errores });               // validación
return res.status(401).json({ mensaje: '...' });        // sin auth
return res.status(403).json({ mensaje: '...' });        // sin permiso
return res.status(404).json({ mensaje: '...' });        // no encontrado
return res.status(409).json({ inactivos: [...] });     // candidatos a reactivar
return res.status(500).json({ mensaje: '...' });        // error servidor (en try/catch)
```

Mensajes en español. Sin filtrar info sensible (login: "Credenciales inválidas" genérico).

## Linting / formato

El proyecto no tiene linter configurado (ESLint/Prettier). Pendiente — ver [Testing](./testing.md).

Reglas implícitas:
- **Indentación 2 espacios.**
- **Comillas simples** en JS (`'cliente'`, no `"cliente"`).
- **Sin punto y coma final opcional** — usar punto y coma siempre.
- **Líneas ~ 100–120 chars máx.**

## Lecturas relacionadas

- [Git workflow](./git-workflow.md)
- [Decisiones (ADR)](../arquitectura/decisiones.md)
- [Frontend → Helpers](../frontend/helpers.md)
- [Backend → Validadores](../backend/validadores.md)
