const Pedido = require('../models/Pedido');
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');

const ESTADOS = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
const IVA = 0.13;

async function devolverStock(items) {
    for (const item of items) {
        await Producto.updateOne(
            { _id: item.producto },
            { $inc: { stock: item.cantidad } }
        );
    }
}

const listar = async (req, res) => {
    try {
        const filtro = {};

        if (req.query.estado) {
            if (!ESTADOS.includes(req.query.estado)) {
                return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${ESTADOS.join(', ')}` });
            }
            filtro.estado = req.query.estado;
        }

        if (req.query.usuario) {
            filtro.usuario = req.query.usuario;
        }

        const pedidos = await Pedido.find(filtro)
            .populate('usuario', 'nombre apellido apellido2 correo')
            .sort({ _id: -1 });

        res.json(pedidos);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const listarPorUsuario = async (req, res) => {
    try {
        const pedidos = await Pedido.find({ usuario: req.params.usuarioId })
            .sort({ _id: -1 });

        res.json(pedidos);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const estadisticas = async (req, res) => {
    try {
        const totalPedidos = await Pedido.countDocuments();

        const pedidosPorEstado = await Pedido.aggregate([
            { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
        ]);

        const ventas = await Pedido.aggregate([
            { $match: { estado: { $ne: 'cancelado' } } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        const productosMasVendidos = await Pedido.aggregate([
            { $match: { estado: { $ne: 'cancelado' } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.producto',
                    nombre: { $first: '$items.nombre' },
                    cantidad: { $sum: '$items.cantidad' },
                    total: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { cantidad: -1 } },
            { $limit: 5 }
        ]);

        const productosStockBajo = await Producto.countDocuments({
            $expr: { $lte: ['$stock', '$stockMinimo'] }
        });

        res.json({
            totalPedidos,
            totalVentas: ventas.length > 0 ? ventas[0].total : 0,
            pedidosPorEstado,
            productosMasVendidos,
            productosStockBajo
        });
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const obtener = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id)
            .populate('usuario', 'nombre apellido apellido2 correo');

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" + req.params.id });
        }

        res.json(pedido);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const crear = async (req, res) => {
    const descontados = [];

    try {
        const { usuario, direccionEnvio, costoEnvio = 0, descuento = 0, metodoPago = 'efectivo' } = req.body;

        if (!usuario) {
            return res.status(400).json({ message: "El usuario es obligatorio" });
        }

        if (!direccionEnvio || typeof direccionEnvio !== 'object') {
            return res.status(400).json({ message: "La dirección de envío es obligatoria" });
        }

        const usuarioExiste = await Usuario.findById(usuario);

        if (!usuarioExiste) {
            return res.status(404).json({ message: "Usuario no encontrado" + usuario });
        }

        const carrito = await Carrito.findOne({ usuario }).populate('items.producto');

        if (!carrito || carrito.items.length === 0) {
            return res.status(400).json({ message: "El carrito está vacío" });
        }

        const items = [];

        for (const item of carrito.items) {
            const producto = item.producto;

            if (!producto) {
                return res.status(409).json({ message: "Uno de los productos del carrito ya no existe" });
            }

            if (!producto.estado) {
                return res.status(409).json({ message: `El producto "${producto.nombre}" no está disponible` });
            }

            if (producto.stock < item.cantidad) {
                return res.status(409).json({
                    message: `Stock insuficiente para "${producto.nombre}"`,
                    disponible: producto.stock,
                    solicitado: item.cantidad
                });
            }

            items.push({
                producto: producto._id,
                nombre: producto.nombre,
                precioUnitario: producto.precio,
                cantidad: item.cantidad,
                subtotal: producto.precio * item.cantidad
            });
        }

        for (const item of items) {
            const resultado = await Producto.updateOne(
                { _id: item.producto, stock: { $gte: item.cantidad } },
                { $inc: { stock: -item.cantidad } }
            );

            if (resultado.modifiedCount === 0) {
                await devolverStock(descontados);
                return res.status(409).json({ message: `Stock insuficiente para "${item.nombre}"` });
            }

            descontados.push(item);
        }

        const subtotal = items.reduce((acumulado, item) => acumulado + item.subtotal, 0);
        const impuestos = Math.round(subtotal * IVA * 100) / 100;
        const total = Math.max(0, subtotal + impuestos + Number(costoEnvio) - Number(descuento));

        const pedido = new Pedido({
            usuario,
            items,
            direccionEnvio,
            subtotal,
            impuestos,
            costoEnvio,
            descuento,
            total,
            metodoPago
        });

        const pedidoGuardado = await pedido.save();

        carrito.items = [];
        carrito.recalcularTotal();
        await carrito.save();

        res.status(201).json({
            mensaje: "Pedido creado",
            datos: pedidoGuardado
        })
    } catch (error) {
        await devolverStock(descontados);
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const { estado, motivo } = req.body;

        if (!ESTADOS.includes(estado)) {
            return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${ESTADOS.join(', ')}` });
        }

        const pedido = await Pedido.findById(req.params.id);

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" + req.params.id });
        }

        const estadoAnterior = pedido.estado;

        pedido.estado = estado;

        if (estado === 'cancelado' && motivo) {
            pedido.motivoCancelacion = motivo;
        }

        const pedidoGuardado = await pedido.save();

        // Al cancelar se devuelve el stock reservado por el pedido
        if (estado === 'cancelado' && estadoAnterior !== 'cancelado') {
            await devolverStock(pedido.items);
        }

        res.json({
            mensaje: "Estado del pedido actualizado",
            datos: pedidoGuardado
        });
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const eliminar = async (req, res) => {
    try {
        const pedido = await Pedido.findByIdAndDelete(req.params.id);

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" + req.params.id });
        }

        if (pedido.estado !== 'cancelado') {
            await devolverStock(pedido.items);
        }

        res.json(
            {
                mensaje: "Pedido eliminado",
                datos: req.params.id
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

module.exports = { listar, listarPorUsuario, estadisticas, obtener, crear, cambiarEstado, eliminar };
