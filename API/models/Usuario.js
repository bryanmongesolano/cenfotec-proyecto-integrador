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
        match: [/^\d{9}$/, 'La cédula debe tener 9 dígitos']
    },
    telefono: {
        type: String,
        trim: true,
        match: [/^[0-9+\-\s]{8,}$/, 'El teléfono no es válido']
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'El correo no es válido']
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
