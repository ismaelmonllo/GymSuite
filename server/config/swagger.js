// Configurar la especificación OpenAPI 3.0 para toda la API de GymSuite
// Los paths de las rutas se leen de los JSDoc en los archivos de routes/
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'GymSuite API',
            version: '1.0.0',
            description: 'API REST para gestión de gimnasios — clientes, mediciones y pagos',
        },
        servers: [
            { url: 'http://localhost:5000/api', description: 'Local' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
            schemas: {
                LoginBody: {
                    type: 'object',
                    required: ['correo', 'contrasena'],
                    properties: {
                        correo:     { type: 'string', example: 'cliente@gym.com' },
                        contrasena: { type: 'string', example: '12345678' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token:  { type: 'string' },
                        rol:    { type: 'string', enum: ['admin', 'entrenador', 'cliente'] },
                        nombre: { type: 'string' },
                    },
                },
                Cliente: {
                    type: 'object',
                    properties: {
                        _id:             { type: 'string' },
                        nombre:          { type: 'string' },
                        apellidos:       { type: 'string' },
                        correo:          { type: 'string' },
                        telefono:        { type: 'string' },
                        direccion:       { type: 'string' },
                        fecha_nacimiento:{ type: 'string', format: 'date' },
                        DNI:             { type: 'string' },
                        nivel:           { type: 'string', enum: ['principiante', 'intermedio', 'avanzado'] },
                        activo:          { type: 'boolean' },
                        fecha_alta:      { type: 'string', format: 'date' },
                        tipo_cuota:      { type: 'string', description: 'ObjectId ref a TipoCuota' },
                    },
                },
                Empleado: {
                    type: 'object',
                    properties: {
                        _id:             { type: 'string' },
                        nombre:          { type: 'string' },
                        apellidos:       { type: 'string' },
                        correo:          { type: 'string' },
                        telefono:        { type: 'string' },
                        DNI:             { type: 'string' },
                        rol:             { type: 'string', enum: ['admin', 'entrenador'] },
                        activo:          { type: 'boolean' },
                        fecha_alta:      { type: 'string', format: 'date' },
                    },
                },
                Medicion: {
                    type: 'object',
                    properties: {
                        _id:               { type: 'string' },
                        cliente_id:        { type: 'string' },
                        entrenador_id:     { type: 'string' },
                        fecha:             { type: 'string', format: 'date' },
                        peso:              { type: 'number' },
                        altura:            { type: 'number' },
                        porcentaje_grasa:  { type: 'number' },
                        cuello:            { type: 'number' },
                        hombros:           { type: 'number' },
                        pecho_ins:         { type: 'number' },
                        pecho_exp:         { type: 'number' },
                        cintura:           { type: 'number' },
                        cadera:            { type: 'number' },
                        muslo:             { type: 'number' },
                        gemelo:            { type: 'number' },
                        brazo:             { type: 'number' },
                        antebrazo:         { type: 'number' },
                        biceps:            { type: 'number' },
                        triceps:           { type: 'number' },
                        subescapular:      { type: 'number' },
                        cresta_iliaca:     { type: 'number' },
                        observaciones:     { type: 'string' },
                    },
                },
                Pago: {
                    type: 'object',
                    properties: {
                        _id:           { type: 'string' },
                        cliente_id:    { type: 'string' },
                        mes:           { type: 'string', example: '2025-01' },
                        tipo_cuota:    { type: 'string' },
                        importe:       { type: 'number' },
                        pendiente:     { type: 'boolean' },
                        fecha:         { type: 'string', format: 'date' },
                        registrado_por:{ type: 'string' },
                        grupo_pago:    { type: 'string' },
                    },
                },
                TipoCuota: {
                    type: 'object',
                    properties: {
                        _id:     { type: 'string' },
                        nombre:  { type: 'string', example: 'Mensual' },
                        meses:   { type: 'integer', example: 1 },
                        importe: { type: 'number', example: 40 },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        mensaje: { type: 'string' },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    // Leer las anotaciones @swagger de todos los archivos de rutas
    apis: ['./routes/*.js'],
};

export default swaggerJsdoc(options);
