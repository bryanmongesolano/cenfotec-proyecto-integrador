const Pago = require('../models/Pago');
const Pedido = require('../models/Pedido');
const { responderError } = require('../utils/errores');

const listar = async (req, res) => {
    try {
        const filtro = {};
        if (req.query.pedido) filtro.pedido = req.query.pedido;
        if (req.query.estado) filtro.estado = req.query.estado;

        const pagos = await Pago.find(filtro)
            .populate('pedido', 'numero total estado')
            .sort({ fecha: -1 });

        res.json(pagos);
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const pago = await Pago.findById(req.params.id).populate('pedido', 'numero total estado');
        if (!pago) {
            return res.status(404).json({ message: 'Pago no encontrado: ' + req.params.id });
        }
        res.json(pago);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.body.pedido);
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido no encontrado: ' + req.body.pedido });
        }

        if (req.usuario.rol !== 'admin' && String(pedido.usuario) !== String(req.usuario._id)) {
            return res.status(403).json({ message: 'No tiene permiso para registrar un pago de este pedido' });
        }

        const pagoGuardado = await new Pago(req.body).save();
        res.status(201).json({ mensaje: 'Pago registrado', datos: pagoGuardado });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizar = async (req, res) => {
    try {
        if (req.body.pedido && !(await Pedido.findById(req.body.pedido))) {
            return res.status(404).json({ message: 'Pedido no encontrado: ' + req.body.pedido });
        }

        const pago = await Pago.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!pago) {
            return res.status(404).json({ message: 'Pago no encontrado: ' + req.params.id });
        }

        let pedidoActualizado = false;
        if (pago.estado === 'aprobado' && pago.pedido) {
            const resultado = await Pedido.updateOne(
                { _id: pago.pedido, estado: 'pendiente' },
                { $set: { estado: 'pagado' } }
            );
            pedidoActualizado = resultado.modifiedCount > 0;
        }

        res.json({
            mensaje: pedidoActualizado ? 'Pago aprobado y pedido marcado como pagado' : 'Pago actualizado',
            datos: pago,
            pedidoActualizado
        });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const pago = await Pago.findByIdAndDelete(req.params.id);
        if (!pago) {
            return res.status(404).json({ message: 'Pago no encontrado: ' + req.params.id });
        }
        res.json({ mensaje: 'Pago eliminado', datos: req.params.id });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
