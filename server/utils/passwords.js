import { randomInt } from 'crypto';

const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMEROS = '0123456789';
const SIMBOLOS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const CHARS = MINUSCULAS + MAYUSCULAS + NUMEROS + SIMBOLOS;

/**
 * Elegir un carácter aleatorio de un conjunto usando `crypto.randomInt`
 * (CSPRNG, sin sesgo de módulo).
 * @param {string} conjunto - Cadena de caracteres entre los que elegir.
 * @returns {string} Carácter aleatorio del conjunto.
 */
const elegir = (conjunto) => conjunto[randomInt(0, conjunto.length)];

/**
 * Mezclar un array in-place usando el algoritmo de Fisher-Yates con
 * `crypto.randomInt` para evitar sesgos de módulo.
 * @param {string[]} arr - Array a mezclar (se modifica).
 * @returns {string[]} El mismo array ya mezclado.
 */
const mezclar = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Generar una contraseña temporal de 12 caracteres criptográficamente segura,
 * garantizando al menos 1 minúscula, 1 mayúscula, 1 número y 1 símbolo.
 * Se usa al dar de alta usuarios o tras un reset de contraseña por admin.
 * @returns {string} Contraseña en texto plano (todavía sin hashear).
 */
export const generarPasswordTemporal = () => {
    const chars = [
        elegir(MINUSCULAS),
        elegir(MAYUSCULAS),
        elegir(NUMEROS),
        elegir(SIMBOLOS),
        ...Array.from({ length: 8 }, () => elegir(CHARS)),
    ];
    return mezclar(chars).join('');
};
