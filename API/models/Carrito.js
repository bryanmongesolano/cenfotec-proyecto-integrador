const mongoose = require('mongoose');

const CarritoItemSchema = new mongoose.Schema({
    producto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },
    cantidad: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    precioUnitario: {
        type: Number,
        required: true,
        min: 0
    }
});

const CarritoSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true,
        unique: true
    },
    items: {
        type: [CarritoItemSchema],
        default: []
    },
    subtotal: {
        type: Number,
        default: 0,
        min: 0
    },
    impuestos: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        default: 0,
        min: 0
    },
    expiraEn: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
});

const IVA = 0.13;

CarritoSchema.methods.recalcularTotal = function () {
    this.subtotal = this.items.reduce((acumulado, item) => {
        return acumulado + (item.precioUnitario * item.cantidad);
    }, 0);

    this.impuestos = Math.round(this.subtotal * IVA * 100) / 100;
    this.total = this.subtotal + this.impuestos;

    return this.total;
};

module.exports = mongoose.model('Carrito', CarritoSchema);
