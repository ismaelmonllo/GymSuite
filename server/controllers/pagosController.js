import mongoose from 'mongoose';
import Pagos from '../models/Pagos.js';
import Usuario from '../models/UsuarioModel.js';

// Devolver el historial de pagos de un cliente concreto para que el entrenador o admin lo consulte
// id_usuario viene de los parámetros de la ruta; ordenado del mes más reciente al más antiguo
export const obtenerPagos = async (req, res) =>  {

    try {

        const { id_usuario } = req.params;

        // Buscar pagos del cliente y ordenar del más reciente al más antiguo por mes
        // Se ordena por mes (string "YYYY-MM") porque fecha solo existe en pagos confirmados
        const pagos = await Pagos.find({ cliente_id: id_usuario}).sort({ mes: -1 });

        if (pagos.length === 0) return res.status(404).json({ mensaje: 'No se encontraron pagos registrados'});
        return res.status(200).json(pagos);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Devolver el historial de pagos del cliente que está logueado para que lo consulte desde su perfil
// id_usuario se extrae del token JWT, no del body ni de los parámetros
export const obtenerMisPagos = async (req, res) =>  {

    try {

        const id_usuario = req.usuario.id;

        // Buscar pagos del cliente y ordenar del más reciente al más antiguo por mes
        // Se ordena por mes (string "YYYY-MM") porque fecha solo existe en pagos confirmados
        const pagos = await Pagos.find({ cliente_id: id_usuario}).sort({ mes: -1 });

        if (pagos.length === 0) return res.status(404).json({ mensaje: 'No se encontraron pagos registrados'});
        return res.status(200).json(pagos);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Convertir fecha a string "YYYY-MM"
const formatearMes = (fecha) => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

// Sumar N meses a una fecha (devuelve nueva Date al día 1)
const sumarMeses = (fecha, n) => new Date(fecha.getFullYear(), fecha.getMonth() + n, 1);

// Generar los pagos del mes para todos los clientes activos con cuota asignada
// Se llama desde el cron mensual o manualmente desde el panel de admin
// Solo genera si el cliente no tiene ya un pago para ese mes (evita duplicados)
// Cada lote de N pagos de un mismo cliente comparte grupo_pago para poder gestionarlos juntos
export const generarPagos = async (req, res) => {

    try {

        const ahora = new Date();
        const mesActual = formatearMes(ahora);

        // Obtener clientes activos con su tipo de cuota populado
        const clientes = await Usuario.find({ rol: 'cliente', activo: true }).populate('tipo_cuota');

        // Filtrar clientes sin cuota asignada
        const clientesConCuota = clientes.filter(c => c.tipo_cuota);

        // Obtener en una sola consulta los cliente_id que ya tienen pago este mes
        // distinct devuelve un array con los valores únicos del campo, sin documentos completos
        const pagosExistentes = await Pagos.find({ mes: mesActual }).distinct('cliente_id');

        // Convertir a Set de strings para poder buscar en O(1) al iterar los clientes
        // Se convierte a string porque comparar ObjectIds con === siempre da false (son objetos distintos en memoria)
        const yaGenerados = new Set(pagosExistentes.map(id => id.toString()));

        // Construir los nuevos pagos para clientes sin pago este mes
        const nuevos = [];
        let clientesProcesados = 0;
        for (const cliente of clientesConCuota) {

            // Convertir _id a string para poder compararlo con los del Set (misma razón que arriba)
            // Si el cliente ya tiene un pago generado para el mes actual, saltar al siguiente (evita duplicados)
            if (yaGenerados.has(cliente._id.toString())) continue;

            clientesProcesados++;
            const { meses, importe, nombre } = cliente.tipo_cuota;
            const importeMensual = Math.round((importe / meses) * 100) / 100;
            const grupoPago = new mongoose.Types.ObjectId();

            for (let i = 0; i < meses; i++) {
                nuevos.push({
                    cliente_id: cliente._id,
                    mes: formatearMes(sumarMeses(ahora, i)),
                    tipo_cuota: nombre,
                    importe: importeMensual,
                    pendiente: true,
                    grupo_pago: grupoPago,
                });
            }
        }

        if (nuevos.length === 0) {
            return res.status(200).json({ mensaje: 'Todos los clientes ya tienen pagos generados para este mes', generados: 0 });
        }

        await Pagos.insertMany(nuevos);

        return res.status(201).json({
            mensaje: `Pagos generados correctamente`,
            generados: nuevos.length,
            clientes_procesados: clientesProcesados,
        });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });

    }
}

// Confirmar que un cliente ha pagado su cuota, marcando todos los meses del grupo como pagados
// Recibe grupo_pago en el body; registrado_por se extrae del token JWT para saber quién lo confirmó
export const registrarPago = async (req, res) => {

    try {

        const { grupo_pago } = req.body;
        const registrado_por = req.usuario.id;
        const fecha = new Date();

        // Verificar que el grupo_pago existe antes de actualizar
        const existe = await Pagos.findOne({ grupo_pago });
        if (!existe) return res.status(404).json({ mensaje: 'No se encontraron pagos para ese grupo' });

        // Marcar todos los pagos del grupo como pagados, añadiendo fecha y quién los registró
        const resultado = await Pagos.updateMany(
            { grupo_pago },
            { pendiente: false, fecha, registrado_por }
        );

        return res.status(200).json({
            mensaje: 'Pagos registrados correctamente',
            actualizados: resultado.modifiedCount,
        });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });

    }
}

// Eliminar todos los pagos de un grupo para anular una generación errónea
// Recibe grupo_pago en el body; borra todos los meses del lote de golpe
export const eliminarPagos = async (req, res) => {

    try {

        const { grupo_pago } = req.body;

        // Verificar que el grupo_pago existe antes de eliminar
        const existe = await Pagos.findOne({ grupo_pago });
        if (!existe) return res.status(404).json({ mensaje: 'No se encontraron pagos para ese grupo' });

        // Eliminar todos los pagos del grupo
        const resultado = await Pagos.deleteMany({ grupo_pago });

        return res.status(200).json({
            mensaje: 'Pagos eliminados correctamente',
            eliminados: resultado.deletedCount,
        });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor: ' + error.message });

    }
}