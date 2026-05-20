import { useState } from 'react'
import api from '../services/api'

// Gestionar el flujo de confirmación de un pago: modal de confirmación, llamada al API y actualización del mapa de pagos
export const useConfirmarPago = (setUltimoPago, setErrorOperacion) => {
    const [confirmacionPago, setConfirmacionPago] = useState(null)   // { usuario, pago } pendiente de confirmar
    const [confirmandoPago, setConfirmandoPago]   = useState(null)   // _id del cliente en proceso

    const abrirConfirmacion = (usuario, ultimoPago) => {
        const pago = ultimoPago[usuario._id]
        if (!pago?.pendiente) return
        setConfirmacionPago({ usuario, pago })
    }

    const ejecutar = async () => {
        const { usuario, pago } = confirmacionPago
        setConfirmacionPago(null)
        setConfirmandoPago(usuario._id)
        try {
            // El backend devuelve clienteId + ultimoPagoCliente para actualizar solo esa entrada
            const { data } = await api.post('/api/pagos/registrar', { grupo_pago: pago.grupo_pago })
            setUltimoPago(prev => ({ ...prev, [data.clienteId]: data.ultimoPagoCliente }))
        } catch {
            setErrorOperacion(`No se pudo confirmar el pago de ${usuario.nombre} ${usuario.apellidos}.`)
        } finally {
            setConfirmandoPago(null)
        }
    }

    return { confirmacionPago, setConfirmacionPago, confirmandoPago, abrirConfirmacion, ejecutar }
}
