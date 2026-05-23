import { useState } from 'react'
import api from '../services/api'

/**
 * Gestionar el flujo de confirmación de un pago: modal de confirmación, llamada al API y actualización del mapa de pagos.
 * @param {React.Dispatch<React.SetStateAction<object>>} setUltimoPago Setter del mapa { clienteId: pago }
 * @param {(mensaje: string) => void} setErrorOperacion Callback para reportar errores al usuario
 * @returns {{confirmacionPago: object|null, setConfirmacionPago: Function, confirmandoPago: string|null, abrirConfirmacion: Function, ejecutar: () => Promise<void>}}
 */
export const useConfirmarPago = (setUltimoPago, setErrorOperacion) => {
    const [confirmacionPago, setConfirmacionPago] = useState(null)   // { usuario, pago } pendiente de confirmar
    const [confirmandoPago, setConfirmandoPago]   = useState(null)   // _id del cliente en proceso

    /**
     * Abrir el modal de confirmación para un usuario y su último pago pendiente.
     * @param {object} usuario Cliente sobre el que se va a confirmar el pago
     * @param {Record<string, object>} ultimoPago Mapa { clienteId: pago }
     */
    const abrirConfirmacion = (usuario, ultimoPago) => {
        const pago = ultimoPago[usuario._id]
        if (!pago?.pendiente) return
        setConfirmacionPago({ usuario, pago })
    }

    /**
     * Ejecutar la confirmación del pago seleccionado y refrescar la entrada del cliente.
     * @returns {Promise<void>}
     */
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
