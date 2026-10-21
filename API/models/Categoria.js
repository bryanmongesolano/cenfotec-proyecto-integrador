const mongoose = require('mongoose');

const CategoriaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    descripcion: {
        type: String,
        trim: true
    },
    padre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria',
        default: null
    },
    estado: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Categoria', CategoriaSchema);
