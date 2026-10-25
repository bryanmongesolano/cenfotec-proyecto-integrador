const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

//GET
router.get('/', async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        res.json(usuarios);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});

//GET por ID
router.get('/:id', async (req, res) => {
    try {
        const usuarios = await Usuario.findById(req.params.id);

        if (!usuarios) {
            return res.status(404).json({ message: "Usuario no encontrado" + req.params.id });
        }

        res.json(usuarios);

    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});

//POST
router.post('/', async (req, res) => {
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
});

//PUT por ID
router.put('/:id', async (req, res) => {
    try {
        const usuarios = await Usuario.findByIdAndUpdate(
            req.params.id,
            req.body, {
            new: true,
            runValidators: true
        }
        );

        if (!usuarios) {
            return res.status(404).json({ message: "Usuario no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Usuario actualizado",
                datos: usuarios
            }
        );

    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});

//DELETE por ID
router.delete('/:id', async (req, res) => {
    try {
        const usuarios = await Usuario.findByIdAndDelete(
            req.params.id,
        );

        if (!usuarios) {
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
});

module.exports = router;