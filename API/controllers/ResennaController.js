const Resenna = require('../models/Resenna');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');
const { responderError } = require('../utils/errores');

const listar = async (req, res) => {
    try {
        const filtro = {};
        if (req.query.producto) filtro.producto = req.query.producto;
        if (req.query.usuario) filtro.usuario = req.query.usuario;

        const resennas = await Resenna.find(filtro)
            .populate('producto', 'nombre')
            .populate('usuario', 'nombre apellido apellido2')
            .sort({ fecha: -1 });

        res.json(resennas);
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const resenna = await Resenna.findById(req.params.id)
            .populate('producto', 'nombre')
            .populate('usuario', 'nombre apellido apellido2');

        if (!resenna) {
            return res.status(404).json({ message: 'Reseña no encontrada: ' + req.params.id });
        }
        res.json(resenna);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    try {
        if (!(await Producto.findById(req.body.producto))) {
            return res.status(404).json({ message: 'Producto no encontrado: ' + req.body.producto });
        }

        const resennaGuardada = await new Resenna({
            producto: req.body.producto,
            usuario: req.usuario._id,
            calificacion: req.body.calificacion,
            comentario: req.body.comentario
        }).save();

        res.status(201).json({ mensaje: 'Reseña creada', datos: resennaGuardada });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizar = async (req, res) => {
    try {
        const existente = await Resenna.findById(req.params.id);
        if (!existente) {
            return res.status(404).json({ message: 'Reseña no encontrada: ' + req.params.id });
        }

        if (req.usuario.rol !== 'admin' && String(existente.usuario) !== String(req.usuario._id)) {
            return res.status(403).json({ message: 'No tiene permiso para modificar esta reseña' });
        }

        const cambios = { ...req.body };
        if (req.usuario.rol !== 'admin') delete cambios.usuario;

        if (cambios.producto && !(await Producto.findById(cambios.producto))) {
            return res.status(404).json({ message: 'Producto no encontrado: ' + cambios.producto });
        }
        if (cambios.usuario && !(await Usuario.findById(cambios.usuario))) {
            return res.status(404).json({ message: 'Usuario no encontrado: ' + cambios.usuario });
        }

        const resenna = await Resenna.findByIdAndUpdate(req.params.id, cambios, { new: true, runValidators: true });
        res.json({ mensaje: 'Reseña actualizada', datos: resenna });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const resenna = await Resenna.findById(req.params.id);
        if (!resenna) {
            return res.status(404).json({ message: 'Reseña no encontrada: ' + req.params.id });
        }

        if (req.usuario.rol !== 'admin' && String(resenna.usuario) !== String(req.usuario._id)) {
            return res.status(403).json({ message: 'No tiene permiso para eliminar esta reseña' });
        }

        await resenna.deleteOne();
        res.json({ mensaje: 'Reseña eliminada', datos: req.params.id });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
