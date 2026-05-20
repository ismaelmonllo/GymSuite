import { describe, it, expect } from 'vitest'
import { validarDNI, validarTelefono, validarImporte, validarObjectId, validarMeses, validarCorreo, validarContrasena } from '../validators/validarCampos.js'

describe('validarDNI', () => {
    it('acepta DNI de prueba válido', () => {
        // El divisor educativo es % 19; calcular letra para un número de prueba
        const letras = 'TRWAGMYFPDXBNJZSQVHL';
        const numero = 12345678;
        const letra = letras[numero % 19];
        expect(validarDNI(`${numero}${letra}`).valido).toBe(true);
    });
    it('rechaza longitud incorrecta', () => {
        expect(validarDNI('1234A').valido).toBe(false);
    });
    it('rechaza sin letra final', () => {
        expect(validarDNI('12345678').valido).toBe(false);
    });
    it('rechaza vacío', () => {
        expect(validarDNI('').valido).toBe(false);
    });
});

describe('validarTelefono', () => {
    it('acepta prefijo educativo 5', () => {
        expect(validarTelefono('512345678').valido).toBe(true);
    });
    it('acepta con +34 y prefijo 5', () => {
        expect(validarTelefono('+34512345678').valido).toBe(true);
    });
    it('rechaza prefijo real 6 (no educativo)', () => {
        expect(validarTelefono('612345678').valido).toBe(false);
    });
    it('rechaza menos de 9 dígitos', () => {
        expect(validarTelefono('51234567').valido).toBe(false);
    });
});

describe('validarImporte', () => {
    it('acepta entero positivo', () => {
        expect(validarImporte(4000).valido).toBe(true);
    });
    it('rechaza decimal', () => {
        expect(validarImporte(40.5).valido).toBe(false);
    });
    it('rechaza cero', () => {
        expect(validarImporte(0).valido).toBe(false);
    });
    it('rechaza negativo', () => {
        expect(validarImporte(-100).valido).toBe(false);
    });
    it('rechaza string', () => {
        expect(validarImporte('4000').valido).toBe(false);
    });
});

describe('validarObjectId', () => {
    it('acepta hex de 24 chars', () => {
        expect(validarObjectId('507f1f77bcf86cd799439011').valido).toBe(true);
    });
    it('rechaza hex de 23 chars', () => {
        expect(validarObjectId('507f1f77bcf86cd79943901').valido).toBe(false);
    });
    it('rechaza con caracteres no hex', () => {
        expect(validarObjectId('507f1f77bcf86cd79943901z').valido).toBe(false);
    });
});

describe('validarMeses', () => {
    it('acepta 1', () => expect(validarMeses(1).valido).toBe(true));
    it('acepta 12', () => expect(validarMeses(12).valido).toBe(true));
    it('acepta 24', () => expect(validarMeses(24).valido).toBe(true));
    it('rechaza 0', () => expect(validarMeses(0).valido).toBe(false));
    it('rechaza 25', () => expect(validarMeses(25).valido).toBe(false));
    it('rechaza decimal', () => expect(validarMeses(1.5).valido).toBe(false));
});

describe('validarCorreo', () => {
    it('acepta correo válido', () => expect(validarCorreo('a@b.com').valido).toBe(true));
    it('rechaza sin @', () => expect(validarCorreo('ab.com').valido).toBe(false));
    it('rechaza sin dominio', () => expect(validarCorreo('a@').valido).toBe(false));
});

describe('validarContrasena', () => {
    it('acepta contraseña compleja', () => {
        expect(validarContrasena('Abcdefg1!xyz').valido).toBe(true);
    });
    it('rechaza menos de 12 chars', () => {
        expect(validarContrasena('Ab1!xxxxxxx').valido).toBe(false);
    });
    it('rechaza sin mayúscula', () => {
        expect(validarContrasena('abcdefg1!xyz').valido).toBe(false);
    });
    it('rechaza sin número', () => {
        expect(validarContrasena('Abcdefgh!xyz').valido).toBe(false);
    });
    it('rechaza sin símbolo', () => {
        expect(validarContrasena('Abcdefg1xyzw').valido).toBe(false);
    });
});
