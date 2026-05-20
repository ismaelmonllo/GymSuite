---
title: 2FA por email
sidebar_position: 4
description: Flujo de verificación en dos pasos y modo desarrollo.
tags: [seguridad, 2fa]
---

GymSuite implementa **2FA por email** con código OTP de 6 dígitos. Activo por defecto; se puede saltar en dev con `DISABLE_2FA=true` o en dispositivos de confianza (cookie `2fa_verificado`).

## Flujo

```mermaid
flowchart TD
  Login[POST /api/auth/login] --> Pass{bcrypt.compare OK?}
  Pass -->|no| Err[401]
  Pass -->|sí| Disable{DISABLE_2FA=true?}
  Disable -->|sí| EmitDirect[emitirTokens + responder 200 token]
  Disable -->|no| Conf{cookie 2fa_verificado?}
  Conf -->|sí| EmitDirect
  Conf -->|no| TabCheck{tab vs rol OK?}
  TabCheck -->|no| Err403[403]
  TabCheck -->|sí| GenOTP[generarOTP 6 dígitos<br/>expira +5min]
  GenOTP --> Upsert[Otp.findOneAndUpdate upsert]
  Upsert --> Mail[sendMail con HTML]
  Mail --> Resp[200 requiere2FA: true]
  Resp --> Modal[Frontend abre Modal2FA]
  Modal --> Verify[POST /verificar-2fa]
  Verify --> Find[Otp.findOne correo]
  Find --> Lock{intentos >= 5?}
  Lock -->|sí| Block[Otp.deleteOne + 429]
  Lock -->|no| Match{código + no expirado?}
  Match -->|no| Inc[Otp.$inc intentos<br/>401]
  Match -->|sí| Del[Otp.deleteOne correo]
  Del --> Cookie[Set-Cookie 2fa_verificado firmada 7d]
  Cookie --> EmitDirect
```

## Estructura del OTP

Colección `otps` (modelo `OtpModel.js`):

| Campo | Tipo | Notas |
|-------|------|-------|
| `correo` | String indexado | Único de hecho (upsert) |
| `codigo` | String | 6 dígitos con `crypto.randomInt(100000, 1000000)` (CSPRNG) |
| `expira` | Date | **Índice TTL**: Mongo borra al pasar el timestamp |
| `intentos` | Number (default `0`) | Contador de fallos; al alcanzar 5 el OTP se invalida y `verificar2FA` responde 429 |

## Generación del código

```js
import { randomInt } from 'crypto';

function generarOTP() {
  return String(randomInt(100000, 1000000));  // 6 dígitos
}
```

> 🚨 **CSPRNG obligatorio**
>
> **Nunca** `Math.random()` para tokens / OTPs. Usar `crypto.randomInt` (CSPRNG) — no predecible.

## Upsert

```js
await Otp.findOneAndUpdate(
  { correo },
  { codigo, expira: new Date(Date.now() + 5 * 60 * 1000) },
  { upsert: true }
);
```

Sobrescribe cualquier OTP previo del mismo correo. No acumula.

## Verificación

```js
const entrada = await Otp.findOne({ correo });
if (!entrada) return res.status(401).json({ mensaje: 'No hay código pendiente' });
if (entrada.intentos >= 5) {
  await Otp.deleteOne({ correo });
  return res.status(429).json({ mensaje: 'Demasiados intentos. Vuelve a iniciar sesión.' });
}
if (Date.now() > entrada.expira.getTime()) {
  await Otp.deleteOne({ correo });
  return res.status(401).json({ mensaje: 'Código expirado' });
}
if (entrada.codigo !== codigo) {
  await Otp.updateOne({ correo }, { $inc: { intentos: 1 } });
  return res.status(401).json({ mensaje: 'Código incorrecto' });
}
await Otp.deleteOne({ correo });  // evitar reuso
```

> 🛡️ **Tope de 5 intentos**
>
> El código son 10⁶ combinaciones; sin tope, brute-forceable en la ventana de 5 min con paralelismo. Cada fallo incrementa `intentos`; al 5º el OTP se borra y el usuario tiene que volver a hacer login (que genera un OTP nuevo con contador a `0`).

> 💡 **Doble verificación de expiración**
>
> El índice TTL puede tardar **segundos** en limpiar. `verificar2FA` también compara `Date.now() > entrada.expira` por seguridad.

## How-to: desactivar 2FA en desarrollo

Setear en `.env`:

```env
DISABLE_2FA=true
```

`login` comprueba `process.env.DISABLE_2FA === 'true' && process.env.NODE_ENV !== 'production'` y emite token directo sin OTP. El guard de producción hace que la flag sea inofensiva si se cuela en Vercel por error.

> ℹ️ **Guard de producción activo**
>
> Aunque `DISABLE_2FA=true` esté seteado en Vercel, si `NODE_ENV=production` el check **nunca** se cumple — el 2FA siempre se exige. Aun así, mantener la variable limpia en prod es buena práctica:
>
> ```bash
> vercel env ls
> ```
>
> No debe aparecer `DISABLE_2FA` o debe valer `'false'`.

## How-to: invalidar la confianza del dispositivo

La cookie `2fa_verificado` da 7 días sin OTP en ese navegador. Vías para invalidarla:

1. **Logout** — `POST /api/auth/logout` borra `2fa_verificado` y `refresh_token` en la misma respuesta.
2. **Copia a otro navegador** — el valor está firmado con HMAC sobre `id_usuario + hash(User-Agent)`. Si la UA cambia, `verificar2FACookie` falla y se ignora la cookie (sin ataque exitoso aunque el atacante la robe, mientras no replique también la UA).
3. **El usuario** — limpia cookies del dominio en DevTools.

## Anatomía de la cookie firmada

Formato: `<usuarioId>.<uaHash16>.<firma32>`

```js
const firmar2FA = (usuarioId, userAgent) => {
  const uaHash = crypto.createHash('sha256').update(userAgent ?? '').digest('hex').slice(0, 16);
  const datos = `${usuarioId}.${uaHash}`;
  const firma = crypto
    .createHmac('sha256', process.env.JWT_REFRESH_SECRET)
    .update(datos)
    .digest('hex')
    .slice(0, 32);
  return `${datos}.${firma}`;
};

const verificar2FACookie = (cookie, usuarioId, userAgent) => {
  if (!cookie || cookie.split('.').length !== 3) return false;
  const esperada = firmar2FA(usuarioId, userAgent);
  const a = Buffer.from(cookie);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
```

- **Secret usado:** `JWT_REFRESH_SECRET` (no se introduce env var nueva). Reusar es seguro porque el contexto (HMAC sobre string) no colisiona con la firma JWT (`jwt.sign`/`verify` sobre payload).
- **`timingSafeEqual` con longitudes iguales:** la función lanza si reciben buffers de tamaños distintos. Antes se compara longitud para devolver `false` sin levantar excepción.

## Envío del email — `mailer.js`

```js title="server/utils/mailer.js"
export const sendMail = async ({ to, subject, html }) => {
  // El transporter se crea DENTRO de la función
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,   // contraseña de aplicación, no la del Gmail
    },
  });
  await transporter.sendMail({
    from: `"GymSuite" <${process.env.EMAIL_USER}>`,
    to, subject, html,
  });
};
```

> ⚠️ **Transporter dentro de la función**
>
> **No** instanciar el `transporter` a nivel de módulo: los `import` de ES modules se evalúan antes que `dotenv.config()`, así que `EMAIL_USER` sería `undefined`. Detalle: [ADR-003](../arquitectura/decisiones.md#esm).

### `EMAIL_PASS` debe ser contraseña de aplicación

No la contraseña real de la cuenta Gmail. Generar en https://myaccount.google.com/apppasswords (requiere 2FA activado en la cuenta Google).

## Por qué OTP en Mongo y no en memoria

Vercel es **serverless**: cada invocación arranca una función nueva. No hay memoria compartida entre invocaciones — guardar el OTP en memoria significaría que cada request a `verificar-2fa` no encuentra el OTP del `login`. Mongo + TTL resuelve esto.

## Gotchas

- **OTP borrado tras verificar**: si la respuesta de `verificar-2fa` falla en tránsito, el usuario debe repetir login (y se le manda nuevo OTP). Aceptado.
- **Cliente en lista negra de Gmail**: si Gmail clasifica los emails como spam, el usuario no los recibe. Verificar SPF/DKIM o usar un servicio dedicado (SendGrid, Mailgun) para prod real.
- **Email no llega**: revisar carpeta spam, `EMAIL_PASS` (app password Gmail, 16 chars sin espacios), 2FA activado en la cuenta Google.

## Lecturas relacionadas

- [Backend → Auth flujo](../backend/auth-flujo.md)
- [Backend → Endpoints Auth](../backend/endpoints/auth.md#post-apiauthverificar-2fa)
- [Frontend → Login 2FA](../frontend/vistas/login-2fa.md)
- [Operaciones → Variables de entorno](../operaciones/variables-entorno.md)
