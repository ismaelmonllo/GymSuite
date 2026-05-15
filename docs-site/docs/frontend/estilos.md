---
title: Estilos y paleta
sidebar_position: 4
description: Paleta de colores, tokens de styles.js y clases Tailwind reutilizables.
tags: [frontend, estilos, tailwind]
---

GymSuite usa **Tailwind CSS** con paleta dark + acento naranja. El archivo `client/src/styles.js` exporta tokens semánticos y clases compuestas — **no escribir clases de color directas en componentes**; siempre referenciar tokens.

## Paleta del proyecto

| Función | Hex | Tailwind class |
|---------|-----|----------------|
| Fondo página | `#1A1A1A` | `bg-neutral-900` |
| Fondo cards / inputs | `#2D2D2D` | `bg-neutral-800` / `bg-neutral-900` |
| Acento naranja primario | `#E5702A` | `bg-orange-600` |
| Acento naranja secundario | `#F09540` | `bg-orange-400` |
| Texto claro | `#FDEBD0` | `text-orange-100` |
| Hover suave | — | `hover:bg-neutral-700` |
| Bordes | — | `border-neutral-600` / `border-neutral-700` |
| Texto apagado | — | `text-neutral-500` |
| Error | — | `text-red-400` |

## `styles.js` — Tokens semánticos

```js title="client/src/styles.js"
export const color = {
  bgPagina:     'bg-neutral-900',
  bgCard:       'bg-neutral-800',
  bgInput:      'bg-neutral-900',
  bgHover:      'hover:bg-neutral-700',
  borde:        'border-neutral-600',
  bordeHeader:  'border-neutral-700',
  acento:       'bg-orange-600',
  acentoHover:  'hover:bg-orange-500',
  bordeAcento:  'border-orange-600',
  textoAcento:  'text-orange-600',
  bordeAcento2: 'border-orange-400',
  textoAcento2: 'text-orange-400',
  texto:        'text-orange-100',
  textoApagado: 'text-neutral-500',
  error:        'text-red-400',
};
```

## `nivelBadge` — Nivel cliente → clases

```js
export const nivelBadge = {
  principiante: 'bg-blue-950 text-blue-400',
  intermedio:   'bg-amber-950 text-amber-400',
  avanzado:     'bg-green-950 text-green-400',
};
```

El componente `Badge.jsx` tiene una tabla más completa con todas las variantes; este export es para usos puntuales.

## `s` — Clases compuestas reutilizables

```js
export const s = {
  input:         'bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-3 text-orange-100 placeholder-neutral-500 focus:outline-none focus:border-orange-600',
  label:         'text-orange-100 text-sm',
  fieldGroup:    'flex flex-col gap-1',
  btnPrimary:    'bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors',
  btnSecundario: 'flex-1 py-3 rounded-lg border border-neutral-600 text-orange-100 hover:bg-neutral-700 transition-colors',
  tabBase:       'flex-1 py-3 text-sm font-medium transition-colors',
  tabActivo:     'bg-orange-600 text-white',
  tabInactivo:   'bg-neutral-800 text-orange-100 hover:bg-neutral-700',
  card:          'bg-neutral-800 border border-neutral-600',
  modalBackdrop: 'absolute inset-0 bg-black/60',
  modalCard:     'relative z-10 w-full max-w-sm mx-4 rounded-xl bg-neutral-800 border border-neutral-600 p-6 flex flex-col gap-4',
};
```

## Patrón de uso

```jsx
import { s } from '../styles.js';

<button className={s.btnPrimary}>Guardar</button>
<input className={s.input} />
```

## Responsive

Tailwind breakpoints estándar:

| Prefijo | Ancho | Uso típico |
|---------|-------|------------|
| (sin) | < 640 px | Móvil base |
| `sm:` | ≥ 640 px | Móvil grande / tablet pequeña |
| `md:` | ≥ 768 px | Tablet |
| `lg:` | ≥ 1024 px | Desktop |
| `xl:` | ≥ 1280 px | Desktop grande |

Patrones del proyecto:
- Cards en móvil → tabla desktop: `sm:hidden` para cards, `hidden sm:block` para tabla.
- Botones full-width móvil: `w-full lg:w-auto`.
- Grid stats 2×2 móvil → 5 columnas desktop: `grid-cols-2 lg:grid-cols-5`.

## Modo color

Dark mode forzado (`docusaurus.config.js: colorMode.defaultMode: 'dark'`).
La app del proyecto también es dark-only. Coherente con la identidad visual.

## Lecturas relacionadas

- [Componentes compartidos](./componentes-compartidos.md)
- [Helpers](./helpers.md) — `formatearImporte` para textos formateados
