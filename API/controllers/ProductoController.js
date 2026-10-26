const Producto = require('../models/Producto');
const Categoria = require('../models/Categoria');

const listar = async (req, res) => {
    try {
        const filtro = {};

        if (req.query.q) {
            const busqueda = new RegExp(req.query.q, 'i');
            filtro.$or = [
                { nombre: busqueda },
                { descripcion: busqueda }
            ];
        }

        if (req.query.categoria) {
            filtro.categoria = req.query.categoria;
        }

        if (req.query.precioMin || req.query.precioMax) {
            filtro.precio = {};

            if (req.query.precioMin) {
                filtro.precio.$gte = Number(req.query.precioMin);
            }

            if (req.query.precioMax) {
                filtro.precio.$lte = Number(req.query.precioMax);
            }
        }

        if (req.query.viral !== undefined) {
            filtro.viral = req.query.viral === 'true';
        }

        if (req.query.destacado !== undefined) {
            filtro.destacado = req.query.destacado === 'true';
        }

        if (req.query.estado !== undefined) {
            filtro.estado = req.query.estado === 'true';
        }

        if (req.query.stockBajo === 'true') {
            filtro.$expr = { $lte: ['$stock', '$stockMinimo'] };
        }

        const productos = await Producto.find(filtro)
            .populate('categoria', 'nombre icono')
            .sort({ destacado: -1, viral: -1, nombre: 1 });

        res.json(productos);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const obtener = async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id).populate('categoria', 'nombre icono');

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + req.params.id });
        }

        res.json(producto);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const crear = async (req, res) => {
    try {
        if (req.body.categoria) {
            const categoria = await Categoria.findById(req.body.categoria);

            if (!categoria) {
                return res.status(404).json({ message: "Categoría no encontrada" + req.body.categoria });
            }
        }

        const producto = new Producto(req.body);

        const productoGuardado = await producto.save();

        res.status(201).json({
            mensaje: "Producto creado",
            datos: productoGuardado
        })
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const actualizar = async (req, res) => {
    try {
        if (req.body.categoria) {
            const categoria = await Categoria.findById(req.body.categoria);

            if (!categoria) {
                return res.status(404).json({ message: "Categoría no encontrada" + req.body.categoria });
            }
        }

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
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const actualizarStock = async (req, res) => {
    try {
        const stock = Number(req.body.stock);

        if (!Number.isInteger(stock) || stock < 0) {
            return res.status(400).json({ message: "El stock debe ser un entero mayor o igual a 0" });
        }

        const producto = await Producto.findByIdAndUpdate(
            req.params.id,
            { stock },
            { new: true, runValidators: true }
        );

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Stock actualizado",
                datos: producto
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const eliminar = async (req, res) => {
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
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

module.exports = { listar, obtener, crear, actualizar, actualizarStock, eliminar };
