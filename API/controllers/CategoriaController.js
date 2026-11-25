const Categoria = require('../models/Categoria');
const Producto = require('../models/Producto');
const { responderError } = require('../utils/errores');

const listar = async (req, res) => {
    try {
        const filtro = {};
        if (req.query.estado !== undefined) filtro.estado = req.query.estado === 'true';
        if (req.query.padre) filtro.padre = req.query.padre === 'null' ? null : req.query.padre;

        const categorias = await Categoria.find(filtro)
            .populate('padre', 'nombre')
            .sort({ nombre: 1 });

        res.json(categorias);
    } catch (error) {
        responderError(res, error);
    }
};

const listarProductos = async (req, res) => {
    try {
        const categoria = await Categoria.findById(req.params.id);
        if (!categoria) {
            return res.status(404).json({ message: 'Categoría no encontrada: ' + req.params.id });
        }

        const productos = await Producto.find({ categoria: categoria._id });
        res.json({
            categoria: { _id: categoria._id, nombre: categoria.nombre },
            productos
        });
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const categoria = await Categoria.findById(req.params.id).populate('padre', 'nombre');
        if (!categoria) {
            return res.status(404).json({ message: 'Categoría no encontrada: ' + req.params.id });
        }
        res.json(categoria);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    try {
        const datos = { ...req.body };
        if (datos.padre === '') datos.padre = null;

        if (datos.padre && !(await Categoria.findById(datos.padre))) {
            return res.status(404).json({ message: 'Categoría padre no encontrada: ' + datos.padre });
        }

        const categoriaGuardada = await new Categoria(datos).save();
        res.status(201).json({ mensaje: 'Categoría creada', datos: categoriaGuardada });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizar = async (req, res) => {
    try {
        const datos = { ...req.body };
        if (datos.padre === '') datos.padre = null;

        if (datos.padre && datos.padre === req.params.id) {
            return res.status(400).json({ message: 'Una categoría no puede ser su propia categoría padre' });
        }

        if (datos.padre && !(await Categoria.findById(datos.padre))) {
            return res.status(404).json({ message: 'Categoría padre no encontrada: ' + datos.padre });
        }

        const categoria = await Categoria.findByIdAndUpdate(req.params.id, datos, { new: true, runValidators: true });
        if (!categoria) {
            return res.status(404).json({ message: 'Categoría no encontrada: ' + req.params.id });
        }

        res.json({ mensaje: 'Categoría actualizada', datos: categoria });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const [subcategorias, productos] = await Promise.all([
            Categoria.countDocuments({ padre: req.params.id }),
            Producto.countDocuments({ categoria: req.params.id })
        ]);

        if (subcategorias > 0 || productos > 0) {
            return res.status(409).json({
                message: 'No se puede eliminar la categoría: tiene subcategorías o productos asociados',
                subcategorias,
                productos
            });
        }

        const categoria = await Categoria.findByIdAndDelete(req.params.id);
        if (!categoria) {
            return res.status(404).json({ message: 'Categoría no encontrada: ' + req.params.id });
        }

        res.json({ mensaje: 'Categoría eliminada', datos: req.params.id });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, listarProductos, obtener, crear, actualizar, eliminar };
