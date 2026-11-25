const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');
const { responderError } = require('../utils/errores');

const listar = async (req, res) => {
    try {
        const filtro = {};

        if (req.query.q) {
            const busqueda = new RegExp(req.query.q, 'i');
            filtro.$or = [{ nombre: busqueda }, { descripcion: busqueda }];
        }
        if (req.query.categoria) filtro.categoria = req.query.categoria;
        if (req.query.destacado !== undefined) filtro.destacado = req.query.destacado === 'true';
        if (req.query.estado !== undefined) filtro.estado = req.query.estado === 'true';
        if (req.query.stockBajo === 'true') filtro.$expr = { $lte: ['$stock', '$stockMinimo'] };

        if (req.query.precioMin || req.query.precioMax) {
            filtro.precio = {};
            if (req.query.precioMin) filtro.precio.$gte = Number(req.query.precioMin);
            if (req.query.precioMax) filtro.precio.$lte = Number(req.query.precioMax);
        }

        const productos = await Producto.find(filtro)
            .populate('categoria', 'nombre')
            .sort({ destacado: -1, nombre: 1 });

        res.json(productos);
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id).populate('categoria', 'nombre');
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado: ' + req.params.id });
        }
        res.json(producto);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    try {
        const datos = { ...req.body };
        if (datos.sku !== undefined && String(datos.sku).trim() === '') delete datos.sku;
        if (datos.categoria === '') datos.categoria = null;

        if (datos.categoria && !(await Categoria.findById(datos.categoria))) {
            return res.status(404).json({ message: 'Categoría no encontrada: ' + datos.categoria });
        }

        const productoGuardado = await new Producto(datos).save();
        res.status(201).json({ mensaje: 'Producto creado', datos: productoGuardado });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizar = async (req, res) => {
    try {
        const datos = { ...req.body };
        const unset = {};

        if (datos.sku !== undefined && String(datos.sku).trim() === '') {
            delete datos.sku;
            unset.sku = 1;
        }
        if (datos.categoria === '') datos.categoria = null;

        if (datos.categoria && !(await Categoria.findById(datos.categoria))) {
            return res.status(404).json({ message: 'Categoría no encontrada: ' + datos.categoria });
        }

        const actualizacion = Object.keys(unset).length ? { $set: datos, $unset: unset } : datos;
        const producto = await Producto.findByIdAndUpdate(req.params.id, actualizacion, { new: true, runValidators: true });

        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado: ' + req.params.id });
        }

        res.json({ mensaje: 'Producto actualizado', datos: producto });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizarStock = async (req, res) => {
    try {
        const stock = Number(req.body.stock);
        if (!Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: 'El stock debe ser un entero mayor o igual a 0' });
        }

        const producto = await Producto.findByIdAndUpdate(req.params.id, { stock }, { new: true, runValidators: true });
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado: ' + req.params.id });
        }

        res.json({ mensaje: 'Stock actualizado', datos: producto });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const producto = await Producto.findByIdAndDelete(req.params.id);
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado: ' + req.params.id });
        }
        res.json({ mensaje: 'Producto eliminado', datos: req.params.id });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, obtener, crear, actualizar, actualizarStock, eliminar };
