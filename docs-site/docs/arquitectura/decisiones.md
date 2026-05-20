---
title: Decisiones de arquitectura (ADR)
sidebar_position: 5
sidebar_label: Decisiones (ADR)
description: Registro de decisiones que afectan a todo el proyecto.
tags: [arquitectura, adr]
---

Decisiones de arquitectura registradas (Architecture Decision Records). Cada ADR captura **contexto, decisión, consecuencias y alternativas** descartadas. Si una decisión cambia, **no** se borra: se marca como Superseded y se enlaza la nueva.

<a id="bcrypt-510"></a>

## ADR-001 — bcrypt 5.1.0

**Estado:** Aceptada.

**Contexto:** El paquete `bcrypt` (binding nativo de bcrypt en C++) ha tenido versiones inestables. La versión `6.0.0` **no existe en npm** — algún ejemplo online la sugiere y rompe el `npm install` en Vercel con `ERR_INVALID_VERSION`.

**Decisión:** Fijar `bcrypt` en `^5.1.1` (o `^5.1.0`) en `server/package.json`. No actualizar a major sin probar en preview de Vercel primero.

**Consecuencias:**
- Hashing estable, despliegue reproducible.
- Coste: chequeo manual al actualizar dependencias.

**Alternativas descartadas:**
- `bcryptjs` (puro JS): más lento, no estándar industria. Cambiaría todos los imports y rompería hashes existentes (formato distinto).

> 🚨
>
> **Nunca** subir `bcrypt: ^6.0.0` ni `latest`. Verificar tras cualquier `npm update`.

<a id="centimos"></a>

## ADR-002 — Importes en céntimos (enteros)

**Estado:** Aceptada.

**Contexto:** Reparto del importe total de una cuota (ej: 110 €) entre N meses puede dar decimales no representables exactamente en `Number` JS (`0.1 + 0.2 !== 0.3`). Sumas acumuladas divergen del total.

**Decisión:**
- `TipoCuota.importe` y `Pago.importe` en BD como **enteros** (céntimos).
- Validador backend `validarImporte` exige `Number.isInteger` y `> 0`.
- Frontend convierte euros↔céntimos con `eurosACentimos` y `centimosAEuros` (`client/src/utils.js`).
- Reparto: `importeBase = Math.floor(importe / meses)`; el último mes lleva `importeBase + resto` para sumar exacto al céntimo.

**Consecuencias:**
- Suma de pagos del grupo === importe del tipo de cuota, garantizado.
- Frontend obligado a convertir antes de mandar y al recibir.
- Inputs en euros con `step="0.01"` exigen convertir al guardar.

**Alternativas descartadas:**
- `Number` decimal: errores de coma flotante.
- `Decimal128` Mongo: complica BSON y consultas.
- Library `decimal.js`: dependencia extra para problema solucionable.

Detalle: [Backend → Pagos lógica](../backend/pagos-logica.md).

<a id="esm"></a>

## ADR-003 — ES modules en backend

**Estado:** Aceptada.

**Contexto:** Node 20 soporta ESM nativo. Aprovecharlo para coherencia con el frontend (también ESM).

**Decisión:** `server/package.json` con `"type": "module"`. Todo `import`/`export`, no `require`.

**Consecuencias:**
- Coherencia front/back.
- **Gotcha:** los `import` se evalúan **antes** que `dotenv.config()`. Si una dependencia lee `process.env` a nivel de módulo, las env vars serán `undefined`. Solución: instanciarla **dentro de la función** que la usa. Aplicado en `server/utils/mailer.js`.

**Alternativas descartadas:**
- CommonJS: incoherente con el resto del stack.

<a id="consultas-mongoose"></a>

## ADR-004 — Consultas Mongoose: estilo único

**Estado:** Aceptada.

**Contexto:** Cada método de Mongoose tiene un valor de retorno distinto. Mezclar estilos de comprobación produce bugs sutiles.

**Decisión:**

| Método | Devuelve | Comprobar con |
|--------|----------|---------------|
| `Modelo.find({...})` | Array (siempre) | `.length === 0` |
| `findById`, `findByIdAndUpdate`, `findByIdAndDelete` | Documento o `null` | `!resultado` |
| `save()` | Documento (lanza si valida mal) | try/catch, no `if` |

No usar `findAll` (Sequelize, no Mongoose).

**Consecuencias:** consistencia en los controllers; menos bugs por comparar array vs `null`.

<a id="mocking-dni"></a>

## ADR-005 — Mocking del DNI y teléfono

**Estado:** Aceptada (decisión educativa, no de producción).

**Contexto:** Proyecto académico. Tener clientes reales (con DNIs y teléfonos reales) no es viable. Los datos de prueba deben validarse pero **no** corresponder a personas reales.

**Decisión:** Modificar el algoritmo oficial de DNI y los prefijos de teléfono:

| Validador | Oficial | Mock proyecto |
|-----------|---------|---------------|
| DNI letra | `LETRAS[numero % 23]` | `LETRAS[numero % 19]` |
| Teléfono móvil | empieza por `6/7/8/9` | empieza por `5` |

Implementación: `server/validators/validarCampos.js`.

**Consecuencias:**
- Permite generar datos sintéticos sin coincidir con DNIs reales.
- **Riesgo:** si vuelves al algoritmo oficial sin migrar los datos seed, las pruebas se rompen.

**Vuelta a producción:** cambiar divisor a 23 y prefijo a 6/7/8/9 en ese validador; ningún otro código depende del valor concreto.

<a id="cookies-politica"></a>

## ADR-006 — Cookies con dos políticas distintas

**Estado:** Aceptada.

**Contexto:** El frontend y el backend viven en dominios distintos de Vercel. Las cookies cross-origin requieren `sameSite: 'none' + secure: true` en prod. La cookie `token` (JWT de acceso) la setea el frontend con `SameSite=Strict` porque solo el frontend la usa para inyectar en headers.

**Decisión:**

| Cookie | Set por | HttpOnly | SameSite |
|--------|---------|----------|----------|
| `token` | Frontend | ❌ | `Strict` |
| `refresh_token` | Backend | ✅ | `none` (prod) / `strict` (dev) |
| `2fa_verificado` | Backend | ✅ | `none` (prod) / `strict` (dev) |

**Consecuencias:** auth funciona cross-origin con cookies de backend; el JWT de acceso es accesible por JS (vector XSS aceptado, ver ADR-007).

Detalle: [Seguridad → Cookies](../seguridad/cookies.md).

<a id="jwt-js"></a>

## ADR-007 — JWT accesible por JS

**Estado:** Aceptada (con trade-off explícito).

**Contexto:** El JWT de acceso se podría guardar en `httpOnly` y leerlo en el backend desde la cookie. Pero entonces el frontend no podría inyectarlo como header `Authorization` (estándar) — habría que cambiar todos los controllers a leer cookies.

**Decisión:** JWT en cookie JS-accesible (`document.cookie`). Refresh token (más sensible) sí en `httpOnly`.

**Consecuencias:**
- Vector XSS: si hay un XSS, el JWT puede robarse. Mitigaciones: CSP, sanitización, sin librerías sospechosas.
- Refresh sigue protegido. Robar el JWT da 15m de acceso máximo.

**Alternativa más segura:** doble cookie (acceso + refresh, ambas httpOnly) y backend lee la de acceso. Coste: refactor de todos los controllers. Aceptamos el trade-off por simplicidad académica.

<a id="cron-externo"></a>

## ADR-008 — Cron externo (no `node-cron`)

**Estado:** Aceptada.

**Contexto:** Vercel ejecuta serverless functions — no hay proceso continuo donde correr `node-cron`. La función arranca con cada request, no por temporizador.

**Decisión:** Usar cron-job.org (gratis) para llamar a `POST /api/pagos/generar-cron` el día 1 de cada mes con header `x-cron-secret`.

**Consecuencias:** depende de servicio externo; rotar `CRON_SECRET` periódicamente.

**Alternativas descartadas:**
- Vercel Cron (de pago en plan Pro).
- Migrar a servidor con `node-cron`: pierde gratuidad y auto-deploy.

Detalle: [Operaciones → Cron de pagos](../operaciones/cron-pagos.md).

<a id="tipo-cuota-string"></a>

## ADR-009 — `Pago.tipo_cuota` como string (no ObjectId)

**Estado:** Aceptada.

**Contexto:** Si `tipo_cuota` fuera ObjectId apuntando a `tipos_cuota._id`, borrar un tipo de cuota dejaría los pagos huérfanos.

**Decisión:** `Pago.tipo_cuota` guarda el **nombre** del tipo de cuota (string). Sobrevive al borrado.

**Consecuencias:**
- Si renombras un tipo de cuota, los pagos antiguos siguen con el nombre viejo.
- No `populate` posible; consultas por nombre.

## ADR-010 — Cliente unificado (no múltiples roles)

**Estado:** Aceptada.

**Contexto:** Colección `usuarios` unificada con campo `rol` vs tres colecciones separadas.

**Decisión:** Una sola colección. Campos específicos (`nivel`, `tipo_cuota`) solo en clientes; opcionales para el resto.

**Consecuencias:**
- Email único global (un correo no puede ser admin y cliente a la vez).
- DNI único por rol — una misma persona puede tener cuentas como cliente y entrenador con el mismo DNI.
- Rutas separadas (`/api/clientes`, `/api/entrenadores`, `/api/administradores`) para reusar lógica y permitir divergencia futura.

## Lecturas relacionadas

- [Backend → Modelos](../backend/modelos.md)
- [Backend → Pagos lógica](../backend/pagos-logica.md)
- [Seguridad → Cookies](../seguridad/cookies.md)
- [Operaciones → Cron de pagos](../operaciones/cron-pagos.md)
