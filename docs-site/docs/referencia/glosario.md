---
title: Glosario
sidebar_position: 1
description: Términos clave del dominio GymSuite.
tags: [referencia, glosario]
---

Términos del dominio GymSuite en orden alfabético. Si una palabra te sale al leer otra parte de la doc y no la conoces, búscala aquí.

## A

**Antropométrica.** Adjetivo de "antropometría": medidas del cuerpo humano. En GymSuite, una *medición antropométrica* incluye peso, altura, perímetros (cm) y pliegues (mm). Ver [Mediciones cálculo](../backend/mediciones-calculo.md).

**AuthContext.** Proveedor React global con la sesión del usuario (`usuario`, `login`, `logout`, `actualizarToken`, `limpiarSesion`). Único punto público vía el hook `useAuth`. Detalle: [Frontend → Arquitectura](../frontend/arquitectura.md).

## B

**bcrypt.** Algoritmo de hash de contraseñas. GymSuite usa `bcrypt@^5.1.1` con 10 salt rounds. Ver [bcrypt](../seguridad/bcrypt.md).

## C

**Composición corporal.** Cálculo de % grasa a partir de los 4 pliegues + edad + sexo con la fórmula Durnin-Womersley (1974). Detalle: [Mediciones cálculo](../backend/mediciones-calculo.md#porcentaje-de-grasa-durnin-womersley-1974).

**Cron.** Disparador externo HTTP (cron-job.org) que llama a `POST /api/pagos/generar-cron` el día 1 de cada mes. Detalle: [Cron de pagos](../operaciones/cron-pagos.md).

**Cubierto hasta.** Fecha hasta la que el cliente tiene cuota pagada. Calculado en `ClienteDashboard` como último día del mes más alto con pago confirmado. Ver [Pagos lógica](../backend/pagos-logica.md#cubierto-hasta--frontend).

**Cuota.** Sinónimo de *tipo de cuota*. Catálogo de productos: nombre + meses + importe (céntimos, total).

## D

**DAG.** "Directed Acyclic Graph" — estructura de navegación de la doc sin ciclos: cada página apunta a otras pero no se forman bucles. Útil para navegación clara.

**Diátaxis.** Framework de documentación que separa por intención del lector: tutorial, how-to, referencia, explicación. Ver https://diataxis.fr/.

**DNI.** Documento Nacional de Identidad español. **Validador mockeado** en este proyecto: divisor `% 19` en lugar del oficial `% 23`. Ver [ADR-005](../arquitectura/decisiones.md#mocking-dni).

## E

**ESM.** "ECMAScript modules" — sintaxis `import`/`export` (vs CommonJS `require`). Backend de GymSuite usa ESM. Gotcha: dependencias que leen env vars deben instanciarse dentro de la función. Ver [ADR-003](../arquitectura/decisiones.md#esm).

## F

**`forzar_cambio_password`.** Flag en `Usuario` que obliga a cambiar la contraseña en el próximo login. Activa el modal forzoso. Se setea en: alta de usuario, reseteo de contraseña por admin.

## G

**Grupo de pago.** `ObjectId` que une las N filas de `pagos` generadas para una cuota multimensual. Permite confirmar/eliminar el lote completo. Ver [Pagos lógica](../backend/pagos-logica.md).

## I

**IMC.** Índice de Masa Corporal. Fórmula: `peso(kg) / altura(m)²`. Helper: `calcularIMC` en [helpers frontend](../frontend/helpers.md).

**Importe en céntimos.** Decisión de proyecto: todos los importes (`TipoCuota.importe`, `Pago.importe`) son enteros en céntimos para evitar errores de coma flotante al repartir entre N meses. Ver [ADR-002](../arquitectura/decisiones.md#centimos).

## J

**JWT.** "JSON Web Token". GymSuite usa dos: acceso (2h, en cookie JS-accesible) y refresh (7d, en cookie httpOnly). Ver [Tokens](../seguridad/tokens.md).

## M

**Mongoose.** ODM (Object-Document Mapper) para MongoDB en Node. GymSuite lo usa para los 5 schemas en `server/models/`. Ver [Modelos](../backend/modelos.md).

## O

**OTP.** "One-Time Password" — código de 6 dígitos del 2FA por email. Caduca a los 5 minutos. Guardado en colección `otps` con índice TTL. Ver [2FA](../seguridad/2fa.md).

## P

**Perímetro.** Medida de circunferencia en cm. 10 en GymSuite: cuello, hombros, pecho_ins, pecho_exp, cintura, cadera, muslo, gemelo, brazo, antebrazo.

**Pliegue.** Medida de pliegue cutáneo en mm. 4 en GymSuite: bíceps, tríceps, subescapular, cresta_ilíaca. Usados en `calcularPorcentajeGrasa`.

## R

**Refresh token.** JWT de 7 días en cookie httpOnly. Sirve para renovar el JWT de acceso sin reloguear. Ver [Tokens](../seguridad/tokens.md).

**RutaProtegida.** Componente React que envuelve rutas privadas. Si no hay `usuario`, redirige a `/login`. Ver [Rutas protegidas](../frontend/rutas-protegidas.md).

**RutaRol.** Wrapper React con prop `rol`. Si el rol del usuario no coincide, redirige al dashboard de su rol real.

## S

**Salt rounds.** Parámetro de bcrypt — `10` en GymSuite. Define el coste computacional del hash (2^10 iteraciones). Equilibrio seguridad/latencia.

**SPA.** "Single Page Application". El frontend Vite es SPA con react-router-dom — `client/vercel.json` rewritea todas las rutas a `/` para que React Router las gestione.

**STRIDE.** Framework de análisis de amenazas: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. Aplicado en [Modelo de amenazas](../seguridad/modelo-amenazas.md).

## T

**2FA.** "Two-Factor Authentication" — segundo factor por email con OTP de 6 dígitos. Saltable con `DISABLE_2FA=true` (dev) o cookie `2fa_verificado` (30 días).

**Tipo de cuota.** Sinónimo de "cuota". Catálogo: nombre + meses + importe total. Modelo `tipos_cuota`.

**TTL.** "Time To Live" — índice de Mongo que borra documentos automáticamente al pasar un timestamp. Usado en `otps.expira` para auto-limpiar OTPs caducados.

## V

**Vercel.** Plataforma de hosting serverless. GymSuite tiene 3 proyectos: frontend, backend, docs.

**Vite.** Bundler / dev server del frontend. Reemplaza a webpack — más rápido en dev.
