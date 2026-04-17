// Cargar variables de entorno desde .env antes de cualquier otra importación
import 'dotenv/config';
import bcrypt from 'bcrypt';
import conectarDB from './config/db.js';
import Usuario from './models/UsuarioModel.js';

// Conectar a la base de datos antes de ejecutar el seed
await conectarDB();

const correo = 'admin@gymsuite.com';

// Comprobar si ya existe un usuario con ese correo para no duplicarlo
const existente = await Usuario.findOne({ correo });

if (existente) {
    console.log('Usuario ya existe:', correo);
} else {
    // Cifrar la contraseña antes de guardarla, igual que en el flujo normal de registro
    const contrasena = await bcrypt.hash('Isma.2001', 10);

    // Crear el usuario admin inicial con los datos mínimos requeridos por el modelo
    await Usuario.create({
        nombre: 'Admin',
        apellidos: 'GymSuite',
        correo,
        contrasena,
        fecha_nacimiento: new Date('2001-01-01'),
        DNI: '99517084M',
        rol: 'admin'
    });

    console.log('Admin creado:', correo);
}

// Salir del proceso una vez terminado el seed para que no quede colgado
process.exit(0);
