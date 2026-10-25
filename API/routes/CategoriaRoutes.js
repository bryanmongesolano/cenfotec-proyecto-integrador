const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const Producto = require('../models/Producto');

//GET
router.get('/', async (req, res) => {
    try {
        const filtro = {};

        if (req.query.estado !== undefined) {
            filtro.estado = req.query.estado === 'true';
        }

        if (req.query.padre) {
            filtro.padre = req.query.padre === 'null' ? null : req.query.padre;
        }

        const categorias = await Categoria.find(filtro)
            .populate('padre', 'nombre')
            .sort({ nombre: 1 });

        res.json(categorias);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});


//GET productos por categoría
router.get('/:id/productos', async (req, res) => {
    try {
        const categoria = await Categoria.findById(req.params.id);

        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" + req.params.id });
        }

        const productos = await Producto.find({ categoria: categoria._id });

        res.json({
            categoria: {
                _id: categoria._id,
                nombre: categoria.nombre
            },
            productos
        });
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});


//GET por ID
router.get('/:id', async (req, res) => {
    try {
        const categoria = await Categoria.findById(req.params.id)
            .populate('padre', 'nombre');

        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" + req.params.id });
        }

        res.json(categoria);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});


//POST
router.post('/', async (req, res) => {
    try {
        if (req.body.padre) {
            const padre = await Categoria.findById(req.body.padre);

            if (!padre) {
                return res.status(404).json({ message: "Categoría padre no encontrada" + req.body.padre });
            }
        }

        const categoria = new Categoria(req.body);

        const categoriaGuardada = await categoria.save();

        res.status(201).json({
            mensaje: "Categoría creada",
            datos: categoriaGuardada
        })
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});


//PUT por ID
router.put('/:id', async (req, res) => {
    try {
        if (req.body.padre) {
            const padre = await Categoria.findById(req.body.padre);

            if (!padre) {
                return res.status(404).json({ message: "Categoría padre no encontrada" + req.body.padre });
            }
        }

        if (req.body.padre && req.body.padre === req.params.id) {
            return res.status(400).json({ message: "Una categoría no puede ser su propia categoría padre" });
        }

        const categoria = await Categoria.findByIdAndUpdate(
            req.params.id,
            req.body, {
            new: true,
            runValidators: true
        }
        );

        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" + req.params.id });
        }

        res.json(
            {
                mensaje: "Categoría actualizada",
                datos: categoria
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
        const subcategorias = await Categoria.countDocuments({ padre: req.params.id });
        const productos = await Producto.countDocuments({ categoria: req.params.id });

        if (subcategorias > 0 || productos > 0) {
            return res.status(409).json({
                message: "No se puede eliminar la categoría: tiene subcategorías o productos asociados",
                subcategorias,
                productos
            });
        }

        const categoria = await Categoria.findByIdAndDelete(req.params.id);

        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" + req.params.id });
        }

        res.json(
            {
                mensaje: "Categoría eliminada",
                datos: req.params.id
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
});


module.exports = router;
