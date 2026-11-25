const Pedido = require('../models/Pedido');
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');
const Pago = require('../models/Pago');
const Cupon = require('../models/Cupon');
const { validarDisponibilidadCupon } = require('./CuponController');
const { responderError } = require('../utils/errores');

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
        responderError(res, error);
    }
};

const listarPorUsuario = async (req, res) => {
    try {
        const pedidos = await Pedido.find({ usuario: req.params.usuarioId })
            .sort({ _id: -1 });

        res.json(pedidos);
    } catch (error) {
        responderError(res, error);
    }
};

const estadisticas = async (req, res) => {
    try {
        const hace14Dias = new Date();
        hace14Dias.setHours(0, 0, 0, 0);
        hace14Dias.setDate(hace14Dias.getDate() - 13);

        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);

        const [
            totalPedidos,
            pedidosPorEstado,
            ventas,
            productosMasVendidos,
            productosStockBajo,
            totalClientes,
            totalProductos,
            pagosPendientes,
            ventasPorDiaRaw,
            ventasPorMetodoPago,
            ventasHoyRaw
        ] = await Promise.all([
            Pedido.countDocuments(),
            Pedido.aggregate([
                { $group: { _id: '$estado', cantidad: { $sum: 1 }, total: { $sum: '$total' } } }
            ]),
            Pedido.aggregate([
                { $match: { estado: { $ne: 'cancelado' } } },
                { $group: { _id: null, total: { $sum: '$total' }, cantidad: { $sum: 1 } } }
            ]),
            Pedido.aggregate([
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
            ]),
            Producto.countDocuments({
                $expr: { $lte: ['$stock', '$stockMinimo'] }
            }),
            Usuario.countDocuments({ rol: 'cliente' }),
            Producto.countDocuments({ estado: true }),
            Pago.countDocuments({ estado: 'pendiente' }),
            Pedido.aggregate([
                { $match: { estado: { $ne: 'cancelado' }, fecha: { $gte: hace14Dias } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
                        total: { $sum: '$total' },
                        pedidos: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Pedido.aggregate([
                { $match: { estado: { $ne: 'cancelado' } } },
                {
                    $group: {
                        _id: '$metodoPago',
                        cantidad: { $sum: 1 },
                        total: { $sum: '$total' }
                    }
                },
                { $sort: { total: -1 } }
            ]),
            Pedido.aggregate([
                { $match: { estado: { $ne: 'cancelado' }, fecha: { $gte: inicioHoy } } },
                { $group: { _id: null, total: { $sum: '$total' }, pedidos: { $sum: 1 } } }
            ])
        ]);

        const totalVentas = ventas.length > 0 ? ventas[0].total : 0;
        const pedidosValidos = ventas.length > 0 ? ventas[0].cantidad : 0;
        const ticketPromedio = pedidosValidos > 0 ? Math.round(totalVentas / pedidosValidos) : 0;

        const mapaDias = new Map(ventasPorDiaRaw.map(d => [d._id, d]));
        const ventasPorDia = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date(hace14Dias);
            d.setDate(hace14Dias.getDate() + i);
            const clave = d.toISOString().slice(0, 10);
            const dato = mapaDias.get(clave);
            ventasPorDia.push({
                fecha: clave,
                total: dato ? dato.total : 0,
                pedidos: dato ? dato.pedidos : 0
            });
        }

        res.json({
            totalPedidos,
            totalVentas,
            ticketPromedio,
            totalClientes,
            totalProductos,
            pagosPendientes,
            pedidosPorEstado,
            productosMasVendidos,
            productosStockBajo,
            ventasPorDia,
            ventasPorMetodoPago,
            resumenHoy: {
                total: ventasHoyRaw.length > 0 ? ventasHoyRaw[0].total : 0,
                pedidos: ventasHoyRaw.length > 0 ? ventasHoyRaw[0].pedidos : 0
            }
        });
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id)
            .populate('usuario', 'nombre apellido apellido2 correo');

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado: ' + req.params.id });
        }

        const duenio = pedido.usuario && pedido.usuario._id ? pedido.usuario._id : pedido.usuario;

        if (req.usuario.rol !== 'admin' && String(duenio) !== String(req.usuario._id)) {
            return res.status(403).json({ message: 'No tiene permiso para ver este pedido' });
        }

        res.json(pedido);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    const descontados = [];
    let cuponUsadoId = null;

    try {
        const { direccionEnvio, costoEnvio = 0, descuento = 0, metodoPago = 'efectivo', codigoCupon } = req.body;
        const costoEnvioSeguro = Math.max(0, Number(costoEnvio) || 0);
        let descuentoSeguro = Math.max(0, Number(descuento) || 0);
        let codigoCuponAplicado = undefined;

        const usuario = req.usuario.rol === 'admin' && req.body.usuario
            ? req.body.usuario
            : req.usuario._id;

        if (!direccionEnvio || typeof direccionEnvio !== 'object') {
            return res.status(400).json({ message: 'La dirección de envío es obligatoria' });
        }

        const usuarioExiste = await Usuario.findById(usuario);

        if (!usuarioExiste) {
            return res.status(404).json({ message: 'Usuario no encontrado: ' + usuario });
        }

        const carrito = await Carrito.findOne({ usuario }).populate('items.producto');

        if (!carrito || carrito.items.length === 0) {
            return res.status(400).json({ message: 'El carrito está vacío' });
        }

        const items = [];

        for (const item of carrito.items) {
            const producto = item.producto;

            if (!producto) {
                return res.status(409).json({ message: 'Uno de los productos del carrito ya no existe' });
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

        const subtotal = items.reduce((acumulado, item) => acumulado + item.subtotal, 0);

        if (codigoCupon && String(codigoCupon).trim()) {
            const codigoLimpio = String(codigoCupon).trim().toUpperCase();
            const cupon = await Cupon.findOne({ codigo: codigoLimpio });
            const errorCupon = validarDisponibilidadCupon(cupon, subtotal);

            if (errorCupon) {
                return res.status(400).json({ message: errorCupon });
            }

            descuentoSeguro = cupon.calcularDescuento(subtotal);
            codigoCuponAplicado = cupon.codigo;
            cuponUsadoId = cupon._id;
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

        const impuestos = Math.round(subtotal * IVA * 100) / 100;
        const total = Math.max(0, subtotal + impuestos + costoEnvioSeguro - descuentoSeguro);

        const pedido = new Pedido({
            usuario,
            items,
            direccionEnvio,
            subtotal,
            impuestos,
            costoEnvio: costoEnvioSeguro,
            descuento: descuentoSeguro,
            codigoCupon: codigoCuponAplicado,
            total,
            metodoPago
        });

        const pedidoGuardado = await pedido.save();

        if (cuponUsadoId) {
            await Cupon.updateOne({ _id: cuponUsadoId }, { $inc: { usosActuales: 1 } });
        }

        carrito.items = [];
        carrito.recalcularTotal();
        await carrito.save();

        res.status(201).json({
            mensaje: 'Pedido creado',
            datos: pedidoGuardado
        });
    } catch (error) {
        await devolverStock(descontados);
        responderError(res, error);
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
            return res.status(404).json({ message: 'Pedido no encontrado: ' + req.params.id });
        }

        const estadoAnterior = pedido.estado;
        pedido.estado = estado;

        if (estado === 'cancelado' && motivo) {
            pedido.motivoCancelacion = motivo;
        }

        const pedidoGuardado = await pedido.save();

        if (estado === 'cancelado' && estadoAnterior !== 'cancelado') {
            await devolverStock(pedido.items);
        }

        res.json({
            mensaje: 'Estado del pedido actualizado',
            datos: pedidoGuardado
        });
    } catch (error) {
        responderError(res, error);
    }
};

const cancelar = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.params.id);

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado: ' + req.params.id });
        }

        if (req.usuario.rol !== 'admin' && String(pedido.usuario) !== String(req.usuario._id)) {
            return res.status(403).json({ message: 'No tiene permiso para cancelar este pedido' });
        }

        if (pedido.estado !== 'pendiente') {
            return res.status(409).json({ message: 'Solo se pueden cancelar pedidos en estado pendiente' });
        }

        const motivo = req.body && req.body.motivo ? String(req.body.motivo).trim() : '';
        pedido.estado = 'cancelado';
        pedido.motivoCancelacion = motivo || 'Cancelado por el cliente';

        const pedidoGuardado = await pedido.save();
        await devolverStock(pedido.items);

        res.json({
            mensaje: 'Pedido cancelado',
            datos: pedidoGuardado
        });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const pedido = await Pedido.findByIdAndDelete(req.params.id);

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado: ' + req.params.id });
        }

        if (pedido.estado !== 'cancelado') {
            await devolverStock(pedido.items);
        }

        res.json({
            mensaje: 'Pedido eliminado',
            datos: req.params.id
        });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, listarPorUsuario, estadisticas, obtener, crear, cambiarEstado, cancelar, eliminar };
