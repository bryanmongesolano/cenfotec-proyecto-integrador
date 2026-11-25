const mongoose = require('mongoose');

const CuponSchema = new mongoose.Schema({
    codigo: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    descripcion: {
        type: String,
        trim: true,
        default: ''
    },
    tipo: {
        type: String,
        enum: ['porcentaje', 'fijo'],
        default: 'porcentaje'
    },
    valor: {
        type: Number,
        required: true,
        min: 1
    },
    montoMinimo: {
        type: Number,
        default: 0,
        min: 0
    },
    usosMaximos: {
        type: Number,
        default: 0,
        min: 0
    },
    usosActuales: {
        type: Number,
        default: 0,
        min: 0
    },
    fechaExpiracion: {
        type: Date,
        default: null
    },
    estado: {
        type: Boolean,
        default: true
    },
    creadoEn: {
        type: Date,
        default: Date.now
    }
});

CuponSchema.methods.calcularDescuento = function (subtotal) {
    const base = Math.max(0, Number(subtotal) || 0);
    if (this.tipo === 'porcentaje') {
        const porcentaje = Math.min(100, Math.max(0, Number(this.valor) || 0));
        return Math.round((base * porcentaje) / 100);
    }
    return Math.min(base, Math.max(0, Number(this.valor) || 0));
};

module.exports = mongoose.model('Cupon', CuponSchema);
