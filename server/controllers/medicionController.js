import Medicion from '../models/MedicionModel.js';
import { validarCrearMedicion, validarEditarMedicion } from '../validators/validarRegistros.js';
import { validarObjectId } from '../validators/validarCampos.js';

// Obtener historial de mediciones de un cliente, ordenadas de más reciente a más antigua
export const obtenerMediciones = async (req, res) => {

    try {

        // Extraer el id del cliente de los parámetros de la ruta
        const { id_usuario } = req.params;

        // Rechazar IDs con formato inválido antes de llegar a Mongoose
        const { valido } = validarObjectId(id_usuario);
        if (!valido) return res.status(400).json({ mensaje: 'ID de cliente no válido' });

        // Buscar todas las mediciones del cliente ordenadas de más reciente a más antigua
        const mediciones = await Medicion.find({ cliente_id: id_usuario }).sort({ fecha: -1 });

        // Devolver 404 si el cliente no tiene mediciones registradas
        if (mediciones.length === 0) return res.status(404).json({ mensaje: 'No se encontraron mediciones'});

        return res.status(200).json(mediciones);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Obtener las mediciones del cliente autenticado leyendo su id del token JWT
export const obtenerMisMediciones = async (req, res) => {

    try {

        // Leer el id del usuario desde el token, no desde los parámetros
        const id_usuario = req.usuario.id;

        // Buscar todas las mediciones del cliente ordenadas de más reciente a más antigua
        const mediciones = await Medicion.find({ cliente_id: id_usuario }).sort({ fecha: -1 });

        // Devolver 404 si el cliente no tiene mediciones registradas
        if (mediciones.length === 0) return res.status(404).json({ mensaje: 'No se encontraron mediciones'});

        return res.status(200).json(mediciones);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Obtener una medición concreta por su id
export const obtenerMedicion = async (req, res) => {

    try {

        // Extraer el id de la medición de los parámetros de la ruta
        const { id } = req.params;

        // Rechazar IDs con formato inválido antes de llegar a Mongoose
        const { valido } = validarObjectId(id);
        if (!valido) return res.status(400).json({ mensaje: 'ID de medición no válido' });

        // Buscar la medición y devolver 404 si no existe
        const medicion = await Medicion.findById(id);
        if (!medicion) return res.status(404).json({ mensaje: 'Medición no encontrada' });

        return res.status(200).json(medicion);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Crear una nueva medición: validar datos, asignar entrenador desde el token y guardar
export const crearMedicion = async (req, res) => {

    try {

        // Obtener el id del entrenador desde el token, no del body
        const entrenador_id = req.usuario.id;

        // Validar el formato de los datos incluyendo el entrenador_id del token
        const { valido, errores } = validarCrearMedicion({ ...req.body, entrenador_id });
        if (!valido) return res.status(400).json({ errores });

        // Crear el documento con todos los campos del body más el entrenador y guardarlo
        const nuevaMedicion = new Medicion({ ...req.body, entrenador_id });

        const medicionGuardada = await nuevaMedicion.save();
        return res.status(201).json(medicionGuardada);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Editar una medición existente: validar datos y actualizar por id
export const editarMedicion = async (req, res) => {

    try {

        // Extraer el id de la medición de los parámetros de la ruta
        const { id } = req.params;

        // Validar los datos recibidos; rechaza cliente_id y entrenador_id si vienen en el body
        const { valido, errores } = validarEditarMedicion(req.body);
        if (!valido) return res.status(400).json({ errores });

        // Actualizar la medición y devolver el documento actualizado
        const medicion = await Medicion.findByIdAndUpdate(id, req.body, { new: true });
        if (!medicion) return res.status(404).json({ mensaje: 'Medición no encontrada' });

        return res.status(200).json(medicion);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}

// Eliminar una medición por su id
export const eliminarMedicion = async (req, res) => {

    try {

        // Extraer el id de la medición de los parámetros de la ruta
        const { id } = req.params;

        // Eliminar la medición y devolver 404 si no existía
        const medicion = await Medicion.findByIdAndDelete(id);
        if (!medicion) return res.status(404).json({ mensaje: 'Medición no encontrada' });

        return res.status(200).json({ mensaje: 'Medición eliminada correctamente' });

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}