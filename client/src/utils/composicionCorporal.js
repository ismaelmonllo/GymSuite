// Calcular IMC = peso(kg) / altura(m)²; devuelve null si los datos no son válidos
export const calcularIMC = (peso, altura) => {
  const p = Number(peso)
  const a = Number(altura)
  if (!p || !a || a <= 0) return null
  return Math.round((p / (a / 100) ** 2) * 10) / 10
}

// Constantes Durnin-Womersley (1974) por sexo y grupo de edad
// Fórmula: densidad = a - b × log10(Σ4 pliegues); %grasa = (4.95/densidad - 4.5) × 100
const CONSTANTES_DW = {
  masculino: [
    { maxEdad: 16, a: 1.1533, b: 0.0643 },
    { maxEdad: 19, a: 1.1620, b: 0.0630 },
    { maxEdad: 29, a: 1.1631, b: 0.0632 },
    { maxEdad: 39, a: 1.1422, b: 0.0544 },
    { maxEdad: 49, a: 1.1620, b: 0.0700 },
    { maxEdad: Infinity, a: 1.1715, b: 0.0779 },
  ],
  femenino: [
    { maxEdad: 16, a: 1.1369, b: 0.0598 },
    { maxEdad: 19, a: 1.1549, b: 0.0678 },
    { maxEdad: 29, a: 1.1599, b: 0.0717 },
    { maxEdad: 39, a: 1.1423, b: 0.0632 },
    { maxEdad: 49, a: 1.1333, b: 0.0612 },
    { maxEdad: Infinity, a: 1.1339, b: 0.0645 },
  ],
}

// Calcular % grasa con Durnin-Womersley a partir de los 4 pliegues, sexo y fecha de nacimiento
export const calcularPorcentajeGrasa = (pliegues, sexo, fechaNacimiento) => {
  if (!sexo || !CONSTANTES_DW[sexo]) return null

  const suma = ['biceps', 'triceps', 'subescapular', 'cresta_iliaca']
    .reduce((acc, campo) => acc + Number(pliegues[campo] ?? 0), 0)
  if (suma <= 0) return null

  // Calcular edad en años; si no hay fecha de nacimiento usar 30 como estimación
  let edad = 30
  if (fechaNacimiento) {
    const hoyDate = new Date()
    const nac     = new Date(fechaNacimiento)
    edad = hoyDate.getFullYear() - nac.getFullYear()
    const pasoCumple = hoyDate.getMonth() > nac.getMonth() ||
      (hoyDate.getMonth() === nac.getMonth() && hoyDate.getDate() >= nac.getDate())
    if (!pasoCumple) edad--
  }

  const { a, b } = CONSTANTES_DW[sexo].find(fila => edad <= fila.maxEdad)
  const densidad   = a - b * Math.log10(suma)
  const porcentaje = (4.95 / densidad - 4.5) * 100
  return Math.round(Math.max(0, Math.min(100, porcentaje)) * 10) / 10
}
