import { useState } from 'react'
import api from '../services/api'

// Gestionar el flujo completo de generación de pagos: confirmación, llamada al API y resultado
export const usePagosGenerar = (onExito) => {
    const [confirmar, setConfirmar]   = useState(false)
    const [resultado, setResultado]   = useState(null)
    const [cargando, setCargando]     = useState(false)

    const abrir = () => setConfirmar(true)

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

    const cerrarResultado = () => setResultado(null)

    return { confirmar, resultado, cargando, abrir, ejecutar, cerrarResultado }
}
