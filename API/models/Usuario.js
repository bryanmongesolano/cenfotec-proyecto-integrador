const mongoose = require('mongoose');

const DireccionSchema = new mongoose.Schema({
    provincia: {
        type: String,
        trim: true
    },
    canton: {
        type: String,
        trim: true
    },
    distrito: {
        type: String,
        trim: true
    },
    codigoPostal: {
        type: String,
        trim: true
    },
    direccionExacta: {
        type: String,
        trim: true
    },
    tipo: {
        type: String,
        enum: ['casa', 'trabajo', 'otra'],
        default: 'casa'
    },
    esPrincipal: {
        type: Boolean,
        default: false
    }
});

const UsuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    apellido: {
        type: String,
        required: true,
        trim: true
    },
    apellido2: {
        type: String,
        trim: true
    },
    cedula: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    telefono: {
        type: String,
        trim: true,
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    contrasenna: {
        type: String,
        required: true,
        trim: true
    },
    estado: {
        type: Boolean,
        default: true
    },
    rol: {
        type: String,
        enum: ['cliente', 'admin'],
        default: 'cliente'
    },
    direcciones: {
        type: [DireccionSchema],
        default: []
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);
