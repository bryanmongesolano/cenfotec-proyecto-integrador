const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');

//GET
router.get('/', async (req, res) => {
    try {
        const productos = await Producto.find();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//GET por ID
router.get('/:id', async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + req.params.id });
        }

        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//POST
router.post('/', async (req, res) => {
    try {
        const producto = new Producto(req.body);

        const productoGuardado = await producto.save();

        res.status(201).json({
            mensaje: "Producto creado",
            datos: productoGuardado
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//PUT por ID
router.put('/:id', async (req, res) => {
    try {
        const producto = await Producto.findByIdAndUpdate(
            req.params.id,
            req.body, {
            new: true,
            runValidators: true
        }
        );

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Producto actualizado",
                datos: producto
            }
        );
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//DELETE por ID
router.delete('/:id', async (req, res) => {
    try {
        const producto = await Producto.findByIdAndDelete(
            req.params.id,
        );

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Producto eliminado",
                datos: req.params.id
            }
        );
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
