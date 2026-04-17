import Medicion from '../models/MedicionModel.js';
import { validarCrearMedicion } from '../validators/validarRegistros.js';

// Obtener historial de mediciones de un cliente, ordenadas de más reciente a más antigua
export const obtenerMediciones = async (req, res) => {

    try {

        // Extraer el id del cliente de los parámetros de la ruta
        const { id_usuario} = req.params;

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

        // Extraer todos los campos de medición del body
        const { cliente_id, fecha, peso, altura, porcentaje_grasa, cuello, hombros, pecho_ins, pecho_exp, cintura, cadera, muslo, gemelo, brazo, antebrazo, biceps, triceps, subescapular, cresta_iliaca, observaciones } = req.body;

        // Obtener el id del entrenador desde el token, no del body
        const entrenador_id = req.usuario.id;

        // Validar el formato de los datos antes de continuar
        const { valido, errores } = validarCrearMedicion(req.body);
        if (!valido) return res.status(400).json({ errores });

        // Crear el documento con todos los campos y guardarlo
        const nuevaMedicion = new Medicion({
            cliente_id,
            entrenador_id,
            fecha,
            peso,
            altura,
            porcentaje_grasa,
            cuello,
            hombros,
            pecho_ins,
            pecho_exp,
            cintura,
            cadera,
            muslo,
            gemelo,
            brazo,
            antebrazo,
            biceps,
            triceps,
            subescapular,
            cresta_iliaca,
            observaciones
        });

        const medicionGuardada = await nuevaMedicion.save();
        return res.status(201).json(medicionGuardada);

    } catch (error) {

        res.status(500).json({ mensaje: 'Error en el servidor:' + error.message })

    }
}