import mongoose from 'mongoose';
import Pagos from '../models/PagoModel.js';
import Usuario from '../models/UsuarioModel.js';
import { validarObjectId } from '../validators/validarCampos.js';
import { auditar } from '../utils/audit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { formatearMes, sumarMeses } from '../utils/fechas.js';

// Devolver el historial de pagos de un cliente concreto para que el entrenador o admin lo consulte
// id_usuario viene de los parámetros de la ruta; ordenado del mes más reciente al más antiguo
export const obtenerPagos = asyncHandler(async (req, res) => {

    const { id_usuario } = req.params;

    const { valido } = validarObjectId(id_usuario);
    if (!valido) return res.status(400).json({ mensaje: 'ID de cliente no válido' });

    // Buscar pagos del cliente y ordenar del más reciente al más antiguo
    // Ordenar por mes (string "YYYY-MM") y no por fecha, porque fecha solo existe en pagos confirmados
    const pagos = await Pagos.find({ cliente_id: id_usuario }).sort({ mes: -1 });

    return res.status(200).json(pagos);

});

// Devolver el historial de pagos del cliente que está logueado para que lo consulte desde su perfil
// id_usuario se extrae del token JWT, no del body ni de los parámetros
export const obtenerMisPagos = asyncHandler(async (req, res) => {

    const id_usuario = req.usuario.id;

    // Buscar pagos del cliente y ordenar del más reciente al más antiguo
    // Ordenar por mes (string "YYYY-MM") y no por fecha, porque fecha solo existe en pagos confirmados
    const pagos = await Pagos.find({ cliente_id: id_usuario }).sort({ mes: -1 });

    return res.status(200).json(pagos);

});

// Generar los pagos del mes para todos los clientes activos con cuota asignada
// Se llama desde el cron mensual o manualmente desde el panel de admin
// Solo genera si el cliente no tiene ya un pago para ese mes (evita duplicados)
// Cada lote de N pagos de un mismo cliente comparte grupo_pago para poder gestionarlos juntos
export const generarPagos = asyncHandler(async (req, res) => {

    const ahora = new Date();
    const mesActual = formatearMes(ahora);

    // Obtener clientes activos con su tipo de cuota populado
    const clientes = await Usuario.find({ rol: 'cliente', activo: true }).populate('tipo_cuota');

    // Filtrar clientes sin cuota asignada
    const clientesConCuota = clientes.filter(cliente => cliente.tipo_cuota);

    // Obtener los cliente_id con pago este mes para evitar duplicados
    // distinct devuelve solo valores únicos sin cargar documentos completos en memoria
    const pagosExistentes = await Pagos.find({ mes: mesActual }).distinct('cliente_id');

    // Convertir a Set de strings para búsqueda en O(1)
    // Convertir a string porque ObjectIds distintos en memoria no se comparan con === aunque representen el mismo id
    const yaGenerados = new Set(pagosExistentes.map(id => id.toString()));

    // Construir los nuevos pagos para clientes sin pago este mes
    const nuevos = [];
    let clientesProcesados = 0;
    for (const cliente of clientesConCuota) {

        // Convertir _id a string para buscar en el Set (ObjectIds distintos en memoria, === siempre false)
        // Saltar clientes que ya tienen pago generado este mes para evitar duplicados
        if (yaGenerados.has(cliente._id.toString())) continue;

        clientesProcesados++;
        const { meses, importe, nombre } = cliente.tipo_cuota;
        // Reparto exacto en céntimos: división entera + resto al último mes
        // Ej. 10000 céntimos / 3 meses → 3333, 3333, 3334 (suman 10000 exacto)
        const importeBase = Math.floor(importe / meses);
        const resto = importe - importeBase * meses;
        const grupoPago = new mongoose.Types.ObjectId();

        for (let i = 0; i < meses; i++) {
            nuevos.push({
                cliente_id: cliente._id,
                mes: formatearMes(sumarMeses(ahora, i)),
                tipo_cuota: nombre,
                importe: i === meses - 1 ? importeBase + resto : importeBase,
                pendiente: true,
                grupo_pago: grupoPago,
            });
        }
    }

    if (nuevos.length === 0) {
        return res.status(200).json({ mensaje: 'Todos los clientes ya tienen pagos generados para este mes', generados: 0 });
    }

    await Pagos.insertMany(nuevos);

    await auditar('cron_pago_generacion', req, { generados: nuevos.length, clientes_procesados: clientesProcesados, mes: mesActual });
    return res.status(201).json({
        mensaje: 'Pagos generados correctamente',
        generados: nuevos.length,
        clientes_procesados: clientesProcesados,
    });

});

// Confirmar que un cliente ha pagado su cuota, marcando todos los meses del grupo como pagados
// Recibe grupo_pago en el body; registrado_por se extrae del token JWT para saber quién lo confirmó
export const registrarPago = asyncHandler(async (req, res) => {

    const { grupo_pago } = req.body;
    const registrado_por = req.usuario.id;
    const fecha = new Date();

    const { valido } = validarObjectId(grupo_pago);
    if (!valido) return res.status(400).json({ mensaje: 'grupo_pago no válido' });

    // Verificar que el grupo_pago existe antes de actualizar
    const existe = await Pagos.findOne({ grupo_pago });
    if (!existe) return res.status(404).json({ mensaje: 'No se encontraron pagos para ese grupo' });

    // Marcar todos los pagos del grupo como pagados, añadiendo fecha y quién los registró
    const resultado = await Pagos.updateMany(
        { grupo_pago },
        { pendiente: false, fecha, registrado_por }
    );

    // Devolver el dato actualizado del cliente para que el frontend actualice solo esa entrada
    // sin necesidad de recargar el mapa completo de último pago
    const clienteId = existe.cliente_id.toString();
    const mesActual = formatearMes(new Date());
    const ultimoPagoActualizado = await Pagos.aggregate([
        { $match: { cliente_id: existe.cliente_id, mes: { $lte: mesActual } } },
        { $sort: { mes: -1 } },
        { $limit: 1 }
    ]);
    const ultimoPagoCliente = ultimoPagoActualizado.length > 0
        ? { pendiente: ultimoPagoActualizado[0].pendiente, mes: ultimoPagoActualizado[0].mes, grupo_pago: ultimoPagoActualizado[0].grupo_pago, tipo_cuota: ultimoPagoActualizado[0].tipo_cuota }
        : null;

    return res.status(200).json({
        mensaje: 'Pagos registrados correctamente',
        actualizados: resultado.modifiedCount,
        clienteId,
        ultimoPagoCliente,
    });

});

// FUNCIONES PARA STATS

// Calcular el total recaudado en el mes actual (pagos confirmados, pendiente: false)
export const obtenerStatsMes = asyncHandler(async (_req, res) => {

    const mesActual = formatearMes(new Date());

    // Sumar los importes de los pagos confirmados del mes actual
    const resultado = await Pagos.aggregate([
        { $match: { mes: mesActual, pendiente: false } },
        { $group: { _id: null, total: { $sum: '$importe' } } }
    ]);

    // aggregate devuelve array vacío si no hay datos; resultado[0] petaría sin esta comprobación
    const total = resultado.length > 0 ? resultado[0].total : 0;

    return res.status(200).json({ mes: mesActual, total });

});

// Calcular el total recaudado por mes en los últimos 12 meses (pagos confirmados, pendiente: false)
export const obtenerStatsAnual = asyncHandler(async (_req, res) => {

    const ahora = new Date();

    // Calcular el mes límite inferior (hace 11 meses, para incluir el mes actual = 12 en total)
    const mesInicio = formatearMes(sumarMeses(ahora, -11));
    const mesFin = formatearMes(ahora);

    // Agrupar por mes y sumar importes; solo pagos confirmados dentro del rango
    const resultado = await Pagos.aggregate([
        { $match: { mes: { $gte: mesInicio, $lte: mesFin }, pendiente: false } },
        { $group: { _id: '$mes', total: { $sum: '$importe' } } },
        { $sort: { _id: 1 } }
    ]);

    // Construir array con los 12 meses, poniendo 0 en los meses sin datos
    const meses = [];
    for (let i = -11; i <= 0; i++) {
        const mes = formatearMes(sumarMeses(ahora, i));
        const encontrado = resultado.find(r => r._id === mes);
        meses.push({ mes, total: encontrado ? encontrado.total : 0 });
    }

    return res.status(200).json(meses);

});

// Contar cuántos pagos del mes actual están confirmados
export const obtenerStatsMesPagados = asyncHandler(async (_req, res) => {

    // Calcular el mes actual en formato "YYYY-MM" para filtrar los pagos
    const mesActual = formatearMes(new Date());

    // Contar pagos del mes actual que ya han sido confirmados (pendiente: false)
    // countDocuments es más eficiente que find().length porque no carga los documentos en memoria
    const total = await Pagos.countDocuments({ mes: mesActual, pendiente: false });

    return res.status(200).json({ mes: mesActual, total });

});

// Contar cuántos pagos del mes actual siguen sin confirmar
export const obtenerStatsMesPendientes = asyncHandler(async (_req, res) => {

    // Calcular el mes actual en formato "YYYY-MM" para filtrar los pagos
    const mesActual = formatearMes(new Date());

    // Contar pagos del mes actual que aún no han sido confirmados (pendiente: true)
    // countDocuments es más eficiente que find().length porque no carga los documentos en memoria
    const total = await Pagos.countDocuments({ mes: mesActual, pendiente: true });

    return res.status(200).json({ mes: mesActual, total });

});

// Devolver el último pago de cada cliente hasta el mes actual: { clienteId: { pendiente, mes } }
// Filtra por mes <= mesActual para ignorar meses futuros generados por cuotas multimensuales
export const obtenerUltimoPagoPorCliente = asyncHandler(async (_req, res) => {

    const mesActual = formatearMes(new Date());

    // Agrupar por cliente quedándose con el pago más reciente que no sea mes futuro
    const resultado = await Pagos.aggregate([
        { $match: { mes: { $lte: mesActual } } },
        { $sort: { mes: -1 } },
        { $group: { _id: '$cliente_id', pendiente: { $first: '$pendiente' }, mes: { $first: '$mes' }, grupo_pago: { $first: '$grupo_pago' }, tipo_cuota: { $first: '$tipo_cuota' } } }
    ]);

    // Convertir array a mapa clienteId → { pendiente, mes, grupo_pago, tipo_cuota }
    const mapa = {};
    for (const r of resultado) mapa[r._id.toString()] = { pendiente: r.pendiente, mes: r.mes, grupo_pago: r.grupo_pago, tipo_cuota: r.tipo_cuota };

    return res.status(200).json(mapa);

});
