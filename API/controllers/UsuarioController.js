const Usuario = require('../models/Usuario');

const listar = async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        res.json(usuarios);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const obtener = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" + req.params.id });
        }

        res.json(usuario);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const crear = async (req, res) => {
    try {
        const usuario = new Usuario(req.body);

        const usuarioGuardado = await usuario.save();

        res.status(201).json({
            mensaje: "Usuario creado",
            datos: usuarioGuardado
        })
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const actualizar = async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndUpdate(
            req.params.id,
            req.body, {
            new: true,
            runValidators: true
        }
        );

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Usuario actualizado",
                datos: usuario
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const eliminar = async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndDelete(
            req.params.id,
        );

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Usuario eliminado",
                datos: req.params.id
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
