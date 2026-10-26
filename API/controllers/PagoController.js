const Pago = require('../models/Pago');
const Pedido = require('../models/Pedido');

const listar = async (req, res) => {
    try {
        const filtro = {};

        if (req.query.pedido) {
            filtro.pedido = req.query.pedido;
        }

        if (req.query.estado) {
            filtro.estado = req.query.estado;
        }

        const pagos = await Pago.find(filtro)
            .populate('pedido', 'numero total')
            .sort({ fecha: -1 });

        res.json(pagos);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const obtener = async (req, res) => {
    try {
        const pago = await Pago.findById(req.params.id)
            .populate('pedido', 'numero total');

        if (!pago) {
            return res.status(404).json({ message: "Pago no encontrado" + req.params.id });
        }

        res.json(pago);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const crear = async (req, res) => {
    try {
        const pedido = await Pedido.findById(req.body.pedido);

        if (!pedido) {
            return res.status(404).json({ message: "Pedido no encontrado" + req.body.pedido });
        }

        const pago = new Pago(req.body);

        const pagoGuardado = await pago.save();

        res.status(201).json({
            mensaje: "Pago registrado",
            datos: pagoGuardado
        })
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const actualizar = async (req, res) => {
    try {
        if (req.body.pedido) {
            const pedido = await Pedido.findById(req.body.pedido);

            if (!pedido) {
                return res.status(404).json({ message: "Pedido no encontrado" + req.body.pedido });
            }
        }

        const pago = await Pago.findByIdAndUpdate(
            req.params.id,
            req.body, {
            new: true,
            runValidators: true
        }
        );

        if (!pago) {
            return res.status(404).json({ message: "Pago no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Pago actualizado",
                datos: pago
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const eliminar = async (req, res) => {
    try {
        const pago = await Pago.findByIdAndDelete(
            req.params.id,
        );

        if (!pago) {
            return res.status(404).json({ message: "Pago no encontrado" + req.params.id });
        }

        res.json(
            {
                mensaje: "Pago eliminado",
                datos: req.params.id
            }
        );
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
