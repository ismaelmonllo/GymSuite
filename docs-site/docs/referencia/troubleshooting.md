---
title: Troubleshooting
sidebar_position: 4
description: Síntomas frecuentes y cómo resolverlos.
tags: [referencia, troubleshooting]
---

Síntoma → causa probable → solución. Si tu problema no está aquí, comprueba [Logs Vercel](../operaciones/monitoring.md) y los [Códigos de error](./codigos-error.md).

## Auth y sesión

### "No me llega el email de 2FA"

**Causa probable:** `EMAIL_PASS` no es app password de Google, o el email fue a spam.

**Solución:**
1. Verificar `EMAIL_PASS` es app password (16 chars sin espacios), generada en https://myaccount.google.com/apppasswords. **No** la contraseña real del Gmail.
2. La cuenta Google necesita 2FA activado.
3. Revisar carpeta spam del receptor.
4. En dev: `DISABLE_2FA=true` para saltarlo.

### "401 al refrescar la página en prod"

**Causa probable:** Cookie `refresh_token` no llega al backend.

**Solución:**
1. DevTools → Application → Cookies del dominio del backend: ¿se ve `refresh_token` con `Secure: true`, `SameSite: None`?
2. Si no se ve: revisar `NODE_ENV=production` en Vercel.
3. Verificar `withCredentials: true` en axios (ya está en `api.js`).
4. Verificar `FRONTEND_URL` apunta al dominio exacto.

### "El cookie no se borra al hacer logout en prod"

**Causa probable:** Las opciones del `clearCookie` no coinciden con las del `cookie` original.

**Solución:** `res.clearCookie('refresh_token', cookieOpciones)` debe usar las **mismas** opciones (`httpOnly`, `sameSite`, `secure`) que cuando se setó. El navegador identifica las cookies por (nombre + path + sameSite + secure).

### "Veo el modal forzoso de cambio de contraseña y no puedo cerrarlo"

**Causa:** `usuario.forzar_cambio_password === true`. Comportamiento intencional.

**Solución:** Completar el cambio:
1. Contraseña actual = la del email de bienvenida / reset.
2. Contraseña nueva = mín 12 chars, 1 minúscula, 1 mayúscula, 1 número, 1 símbolo.
3. Submit → JWT nuevo sin la flag → modal se desmonta solo.

### "Login funciona pero al recargar me echa"

**Causa probable:** La cookie `token` no se está guardando o se borra al recargar.

**Solución:**
1. DevTools → Application → Cookies del dominio del frontend: ¿se ve `token`?
2. Si no se ve, posible problema de `SameSite` o `max-age`. En `AuthContext.login`:
   ```js
   document.cookie = `token=${jwt}; path=/; max-age=${2*60*60}; SameSite=Strict`;
   ```
3. Si se ve pero no funciona: comprobar que `path=/` y no algo más restrictivo.

## Despliegue Vercel

### "Despliegue Vercel falla con error de bcrypt"

```
npm ERR! code ERR_INVALID_VERSION
npm ERR! Invalid Version: ^6.0.0
```

**Causa:** `bcrypt: ^6.0.0` en `package.json` o `package-lock.json`. **No existe** esa versión.

**Solución:**
1. Editar `server/package.json`: `"bcrypt": "^5.1.1"`.
2. Borrar `package-lock.json` y `node_modules`.
3. `npm install`.
4. Commit y redeploy.

Ver [ADR-001](../arquitectura/decisiones.md#bcrypt-510).

### "CORS error en prod pero no en dev"

**Causa probable:** `FRONTEND_URL` en Vercel no coincide con el dominio del frontend.

**Solución:**
1. Verificar dominio exacto del frontend (Vercel → Project → Settings → Domains).
2. Setear `FRONTEND_URL` con ese valor exacto (sin trailing `/`).
3. Redeploy backend.

### "`/api/health` devuelve 503 en prod"

**Causa probable:** Atlas no conecta. Posibles:
- `MONGODB_URI` mal escrita en Vercel.
- IP whitelist Atlas no incluye `0.0.0.0/0`.
- Credenciales Atlas mal.
- Cluster M0 dormido (raro).

**Solución:**
1. Verificar `MONGODB_URI` en Vercel.
2. Atlas → Network Access → añadir `0.0.0.0/0` (Vercel IPs dinámicas).
3. Probar URI localmente con `mongosh "$MONGODB_URI"`.

## Pagos

### "Inputs en euros se guardan con decimales raros"

**Causa probable:** Olvidaste `eurosACentimos` antes de mandar al backend.

**Solución:**
```js
const body = { nombre, meses, importe: eurosACentimos(formImporte) };
await api.post('/api/cuotas', body);
```

Sin la conversión, mandas `40.5` (euros) y el backend lo guarda como `40` (porque `validarImporte` exige entero). 4 céntimos perdidos por cuota.

### "El cron no genera pagos"

**Causa probable:** Header `x-cron-secret` mal en cron-job.org.

**Solución:**
1. cron-job.org → tu job → Headers → comprobar `x-cron-secret`.
2. Comparar con `CRON_SECRET` en Vercel (Project → Settings → Environment Variables).
3. Probar manualmente con `curl`:
   ```bash
   curl -X POST https://<backend>/api/pagos/generar-cron -H "x-cron-secret: $CRON_SECRET"
   ```
4. Si responde 401: secrets no coinciden.
5. Si responde 200 con `generados: 0`: ya generó este mes. **No es bug**.

### "Generar pagos da timeout en Vercel"

**Causa probable:** Función supera el límite de 10 s del plan gratuito.

**Solución:**
1. Verificar cuántos clientes activos hay.
2. Si > ~80: paginar `generarPagos` (procesar de 50 en 50).
3. Alternativa: plan Pro de Vercel (timeout 60 s).

### "Las stats anuales dan 0 en algún mes pero sí hubo pagos"

**Causa probable:** Aggregate con `$match { mes }` mal construido (rango incorrecto) o `pendiente: false` filtra todos.

**Solución:**
1. Comprobar que los pagos tienen `pendiente: false` para el mes.
2. `Pagos.aggregate([{ $match: { mes: '2026-04', pendiente: false } }, { $group: { _id: null, total: { $sum: '$importe' } } }])` directamente en Atlas → ¿da el total esperado?

## Mediciones

### "El % grasa no se autocalcula al rellenar pliegues"

**Causa probable:** Falta algún pliegue o sexo no está seteado.

**Solución:**
1. `calcularPorcentajeGrasa` exige los 4 pliegues (o sumar > 0).
2. `sexo` debe ser `'masculino'` o `'femenino'` (lowercase exacto).
3. Sin `fecha_nacimiento`, asume 30 años → sigue funcionando pero menos preciso.

### "Edito una medición y peta con error 400"

**Causa probable:** Estás mandando `cliente_id` o `entrenador_id` en el body.

**Solución:** `validarEditarMedicion` rechaza esos campos explícitamente. `ModalMedicionCompleto` los excluye al construir el body — no los incluyas si llamas al endpoint directo.

### "Validador rechaza un DNI que sí es correcto"

**Causa intencional:** GymSuite usa divisor `% 19` (no oficial `% 23`).

**Solución (si quieres volver a oficial):**
1. Editar `server/validators/validarCampos.js`.
2. `LETRAS[numero % 23]` en lugar de `LETRAS[numero % 19]`.
3. Actualizar todos los datos de prueba (seed.js) con DNIs válidos según el algoritmo real.

Ver [ADR-005](../arquitectura/decisiones.md#mocking-dni).

## Frontend

### "Refresh automático no funciona"

**Causa probable:** Recursión en interceptor o `withCredentials` desactivado.

**Solución:**
1. El refresh debe llamarse con **`axios.post`** (no `api.post`) — si no, recursión infinita.
2. Verificar `axios.create({ ..., withCredentials: true })`.
3. Verificar `original._retry` se setea para evitar bucle.

### "Recharts no muestra los colores que pongo"

**Causa:** Recharts pinta SVG y **no acepta clases Tailwind**.

**Solución:** Usar hex literal en `COLOR_POR_CLAVE`. Ver `ModalGraficaMediciones.jsx`.

### "Fecha en input se muestra un día menos"

**Causa probable:** Parsing UTC sin offset local.

**Solución:** Concatenar `T00:00:00`:
```js
new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES')
```

Sin esto, `'2026-05-13'` se interpreta como UTC midnight y muestra `12/05/2026` en zonas con offset negativo.

## Build / dev

### "`npm install` falla en `docs-site`"

**Solución:**
1. Borrar `node_modules/` y `package-lock.json`.
2. `npm install`.
3. Si sigue fallando: comprobar versión de Node (`>= 20`).

### "Docusaurus build error 'Cannot find module @docusaurus/theme-mermaid'"

**Solución:**
```bash
cd GymSuite/docs-site
npm install --save @docusaurus/theme-mermaid
```

Y verificar `docusaurus.config.js`:
```js
markdown: { mermaid: true },
themes: ['@docusaurus/theme-mermaid'],
```

### "Docusaurus warning sobre broken links"

**Solución:**
1. Buscar el archivo con el link roto.
2. Corregir la ruta (relativa al archivo, no a `docs/`).
3. Para links a anchors, verificar que el heading existe con el slug correcto (lowercase + guiones).

## Lecturas relacionadas

- [Códigos de error](./codigos-error.md) — tabla literal de mensajes
- [Backend → Errores](../backend/errores.md) — formato + buenas prácticas
- [Operaciones → Monitoring](../operaciones/monitoring.md) — logs Vercel
- [Seguridad → Cookies](../seguridad/cookies.md) — debug cookies cross-origin
