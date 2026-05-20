import { describe, it, expect } from 'vitest'
import { formatearMes, sumarMeses } from '../utils/fechas.js'

// Lógica de reparto de importe entre meses (replicada del controller para test aislado)
const repartirImporte = (importe, meses) => {
    const base = Math.floor(importe / meses)
    const resto = importe - base * meses
    return Array.from({ length: meses }, (_, i) =>
        i === meses - 1 ? base + resto : base
    )
}

describe('formatearMes', () => {
    it('formatea enero de 2025', () => {
        expect(formatearMes(new Date(2025, 0, 15))).toBe('2025-01')
    })
    it('formatea diciembre con padding', () => {
        expect(formatearMes(new Date(2024, 11, 1))).toBe('2024-12')
    })
    it('formatea septiembre con padding de mes', () => {
        expect(formatearMes(new Date(2024, 8, 1))).toBe('2024-09')
    })
})

describe('sumarMeses', () => {
    it('suma 1 mes a enero → febrero', () => {
        const resultado = sumarMeses(new Date(2025, 0, 15), 1)
        expect(resultado.getMonth()).toBe(1)
        expect(resultado.getFullYear()).toBe(2025)
    })
    it('overflow: diciembre + 1 → enero del año siguiente', () => {
        const resultado = sumarMeses(new Date(2024, 11, 1), 1)
        expect(resultado.getMonth()).toBe(0)
        expect(resultado.getFullYear()).toBe(2025)
    })
    it('resta 11 meses desde enero → febrero del año anterior', () => {
        const resultado = sumarMeses(new Date(2025, 0, 1), -11)
        expect(resultado.getMonth()).toBe(1)
        expect(resultado.getFullYear()).toBe(2024)
    })
})

describe('reparto de importe al céntimo', () => {
    it('1100 entre 3 meses: 366+366+368', () => {
        const partes = repartirImporte(1100, 3)
        expect(partes).toHaveLength(3)
        expect(partes.reduce((a, b) => a + b, 0)).toBe(1100)
        expect(partes[0]).toBe(366)
        expect(partes[1]).toBe(366)
        expect(partes[2]).toBe(368) // último lleva el resto
    })
    it('4000 entre 1 mes: 4000', () => {
        const partes = repartirImporte(4000, 1)
        expect(partes).toEqual([4000])
    })
    it('36000 entre 12 meses: exacto sin resto', () => {
        const partes = repartirImporte(36000, 12)
        expect(partes.every(p => p === 3000)).toBe(true)
        expect(partes.reduce((a, b) => a + b, 0)).toBe(36000)
    })
    it('la suma siempre iguala el total', () => {
        const casos = [[11000, 3], [7777, 4], [9999, 7], [100, 3]]
        for (const [importe, meses] of casos) {
            const partes = repartirImporte(importe, meses)
            expect(partes.reduce((a, b) => a + b, 0)).toBe(importe)
        }
    })
})
