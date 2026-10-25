const mongoose = require('mongoose');

// Copia de la dirección al momento de la compra: si el usuario cambia
// su dirección después, el pedido histórico no se altera.
const DireccionEnvioSchema = new mongoose.Schema({
    provincia: {
        type: String,
        required: true,
        trim: true
    },
    canton: {
        type: String,
        required: true,
        trim: true
    },
    distrito: {
        type: String,
        required: true,
        trim: true
    },
    codigoPostal: {
        type: String,
        trim: true
    },
    direccionExacta: {
        type: String,
        required: true,
        trim: true
    }
}, {
    _id: false
});

const PedidoItemSchema = new mongoose.Schema({
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto'
    },
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    precioUnitario: {
        type: Number,
        required: true,
        min: 0
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    }
});

const PedidoSchema = new mongoose.Schema({
    numero: {
        type: String,
        unique: true
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    items: {
        type: [PedidoItemSchema],
        validate: {
            validator: (items) => items && items.length > 0,
            message: 'El pedido debe tener al menos un producto'
        }
    },
    direccionEnvio: {
        type: DireccionEnvioSchema,
        required: true
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    impuestos: {
        type: Number,
        default: 0,
        min: 0
    },
    costoEnvio: {
        type: Number,
        default: 0,
        min: 0
    },
    descuento: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    estado: {
        type: String,
        enum: ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'],
        default: 'pendiente'
    },
    motivoCancelacion: {
        type: String,
        trim: true
    },
    metodoPago: {
        type: String,
        enum: ['tarjeta', 'sinpe', 'efectivo'],
        default: 'efectivo'
    }
});

PedidoSchema.pre('validate', function (next) {
    if (!this.numero && this._id) {
        this.numero = 'ORD-' + this._id.toString().slice(-8).toUpperCase();
    }
    next();
});

module.exports = mongoose.model('Pedido', PedidoSchema);
