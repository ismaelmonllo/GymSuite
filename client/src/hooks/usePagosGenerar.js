import { useState } from 'react'
import api from '../services/api'

/**
 * Gestionar el flujo completo de generación de pagos: confirmación, llamada al API y resultado.
 * @param {() => void} [onExito] Callback ejecutado cuando la generación termina con éxito
 * @returns {{confirmar: boolean, resultado: ({exito: boolean, mensaje: string}|null), cargando: boolean, abrir: () => void, ejecutar: () => Promise<void>, cerrarResultado: () => void}}
 */
export const usePagosGenerar = (onExito) => {
    const [confirmar, setConfirmar]   = useState(false)
    const [resultado, setResultado]   = useState(null)
    const [cargando, setCargando]     = useState(false)

    /**
     * Abrir el modal de confirmación de generación.
     */
    const abrir = () => setConfirmar(true)

    /**
     * Ejecutar la generación de pagos llamando al endpoint y guardando el resultado.
     * @returns {Promise<void>}
     */
    const ejecutar = async () => {
        setConfirmar(false)
        setCargando(true)
        try {
            const res = await api.post('/api/pagos/generar')
            const { generados, clientes_procesados } = res.data
            setResultado(
                generados === 0
                    ? { exito: true, mensaje: 'Todos los clientes ya tienen pagos generados para este mes.' }
                    : { exito: true, mensaje: `Pagos generados correctamente.\n${clientes_procesados} clientes procesados, ${generados} pagos creados.` }
            )
            if (onExito) onExito()
        } catch (err) {
            setResultado({ exito: false, mensaje: err.response?.data?.mensaje ?? 'Error al generar los pagos.' })
        } finally {
            setCargando(false)
        }
    }

    /**
     * Cerrar el modal de resultado.
     */
    const cerrarResultado = () => setResultado(null)

    return { confirmar, resultado, cargando, abrir, ejecutar, cerrarResultado }
}
