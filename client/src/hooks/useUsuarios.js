import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Cargar clientes y empleados según el rol del usuario autenticado.
 * Admin: clientes + entrenadores + admins; entrenador: solo clientes.
 * @param {'admin'|'entrenador'|string} rolUsuario Rol del usuario autenticado
 * @returns {{clientes: object[], empleados: object[], setClientes: Function, setEmpleados: Function, cargando: boolean, recargar: () => void}}
 */
export const useUsuarios = (rolUsuario) => {
    const [clientes, setClientes]   = useState([])
    const [empleados, setEmpleados] = useState([])
    const [cargando, setCargando]   = useState(true)
    const [contador, setContador]   = useState(0)

    useEffect(() => {
        const cargar = rolUsuario === 'admin'
            ? Promise.all([
                api.get('/api/clientes'),
                api.get('/api/entrenadores'),
                api.get('/api/administradores'),
              ]).then(([resClientes, resEntrenadores, resAdmins]) => ({
                clientes:  resClientes.data.clientes ?? [],
                empleados: [
                    ...(resEntrenadores.data.empleados ?? []),
                    ...(resAdmins.data.empleados       ?? []),
                ],
              }))
            : api.get('/api/clientes')
                .then(res => ({ clientes: res.data.clientes ?? [], empleados: [] }))

        cargar
            .then(({ clientes, empleados }) => { setClientes(clientes); setEmpleados(empleados) })
            .catch(err => console.error('Error cargando usuarios:', err))
            .finally(() => setCargando(false))
    }, [rolUsuario, contador])

    /**
     * Forzar recarga de usuarios desde la API.
     * setCargando(true) aquí, no en el effect, para evitar setState síncrono dentro de useEffect.
     */
    const recargar = () => { setCargando(true); setContador(c => c + 1) }

    return { clientes, empleados, setClientes, setEmpleados, cargando, recargar }
}
