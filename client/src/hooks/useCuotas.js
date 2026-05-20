import { useState, useEffect } from 'react'
import api from '../services/api'

// Cargar la lista de tipos de cuota una vez al montar
export const useCuotas = () => {
    const [cuotas, setCuotas] = useState([])

    useEffect(() => {
        api.get('/api/cuotas')
            .then(res => setCuotas(res.data.cuotas ?? []))
            .catch(() => {})
    }, [])

    return cuotas
}
