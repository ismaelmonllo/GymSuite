import { randomBytes } from 'crypto';

const MINUSCULAS = 'abcdefghijklmnopqrstuvwxyz';
const MAYUSCULAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMEROS = '0123456789';
const SIMBOLOS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const CHARS = MINUSCULAS + MAYUSCULAS + NUMEROS + SIMBOLOS;

// Elegir un carácter aleatorio de un conjunto usando crypto para evitar sesgo
const elegir = (conjunto) => {
    const idx = randomBytes(1)[0] % conjunto.length;
    return conjunto[idx];
};

// Mezclar un array usando Fisher-Yates con bytes aleatorios
const mezclar = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randomBytes(1)[0] % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// Generar contraseña de 12 caracteres que garantiza mínimo 1 minúscula, 1 mayúscula, 1 número y 1 símbolo
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
