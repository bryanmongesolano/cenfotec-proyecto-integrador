require('dotenv').config();

const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

async function crearAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const correo = process.env.ADMIN_CORREO;
        const contrasenna = process.env.ADMIN_CONTRASENNA;

        if (!correo || !contrasenna) {
            console.error('Faltan ADMIN_CORREO o ADMIN_CONTRASENNA en el .env');
            process.exit(1);
        }

        const admin = await Usuario.findOne({ correo }).select('+contrasenna');

        if (admin) {
            admin.rol = 'admin';
            admin.contrasenna = contrasenna;
            await admin.save();
            console.log('Admin actualizado:', correo);
        } else {
            await Usuario.create({
                nombre: process.env.ADMIN_NOMBRE || 'Admin',
                apellido: 'Sistema',
                correo,
                contrasenna,
                rol: 'admin'
            });
            console.log('Admin creado:', correo);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error creando el admin:', error.message);
        process.exit(1);
    }
}

crearAdmin();
