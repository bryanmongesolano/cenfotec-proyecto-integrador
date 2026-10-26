const Resenna = require('../models/Resenna');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');

const listar = async (req, res) => {
    try {
        const filtro = {};

        if (req.query.producto) {
            filtro.producto = req.query.producto;
        }

        if (req.query.usuario) {
            filtro.usuario = req.query.usuario;
        }

        const resennas = await Resenna.find(filtro)
            .populate('producto', 'nombre')
            .populate('usuario', 'nombre apellido apellido2')
            .sort({ fecha: -1 });

        res.json(resennas);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const obtener = async (req, res) => {
    try {
        const resenna = await Resenna.findById(req.params.id)
            .populate('producto', 'nombre')
            .populate('usuario', 'nombre apellido apellido2');

        if (!resenna) {
            return res.status(404).json({ message: "Reseña no encontrada" + req.params.id });
        }

        res.json(resenna);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const crear = async (req, res) => {
    try {
        const producto = await Producto.findById(req.body.producto);

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + req.body.producto });
        }

        const usuario = await Usuario.findById(req.body.usuario);

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" + req.body.usuario });
        }

        const resenna = new Resenna(req.body);

        const resennaGuardada = await resenna.save();

        res.status(201).json({
            mensaje: "Reseña creada",
            datos: resennaGuardada
        })
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const actualizar = async (req, res) => {
    try {
        if (req.body.producto) {
            const producto = await Producto.findById(req.body.producto);

            if (!producto) {
                return res.status(404).json({ message: "Producto no encontrado" + req.body.producto });
            }
        }

        if (req.body.usuario) {
            const usuario = await Usuario.findById(req.body.usuario);

            if (!usuario) {
                return res.status(404).json({ message: "Usuario no encontrado" + req.body.usuario });
            }
        }

        const resenna = await Resenna.findByIdAndUpdate(
            req.params.id,
            req.body, {
            new: true,
            runValidators: true
        }
        );

        if (!resenna) {
            return res.status(404).json({ message: "Reseña no encontrada" + req.params.id });
        }

        res.json(
            {
                mensaje: "Reseña actualizada",
                datos: resenna
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const eliminar = async (req, res) => {
    try {
        const resenna = await Resenna.findByIdAndDelete(
            req.params.id,
        );

        if (!resenna) {
            return res.status(404).json({ message: "Reseña no encontrada" + req.params.id });
        }

        res.json(
            {
                mensaje: "Reseña eliminada",
                datos: req.params.id
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
