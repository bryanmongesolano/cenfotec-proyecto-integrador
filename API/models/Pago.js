const mongoose = require('mongoose');

const PagoSchema = new mongoose.Schema({
    pedido: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
        required: true
    },
    metodo: {
        type: String,
        enum: ['sinpe', 'tarjeta'],
        required: true
    },
    monto: {
        type: Number,
        required: true,
        min: 0
    },
    estado: {
        type: String,
        enum: ['pendiente', 'aprobado', 'rechazado'],
        default: 'pendiente'
    },
    comprobante: {
        type: String,
        trim: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Pago', PagoSchema);
