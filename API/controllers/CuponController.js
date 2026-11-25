const Cupon = require('../models/Cupon');
const { responderError } = require('../utils/errores');

function validarDisponibilidadCupon(cupon, subtotal) {
    if (!cupon) return 'El cupón ingresado no existe';
    if (!cupon.estado) return 'Este cupón no está activo';
    if (cupon.fechaExpiracion && new Date(cupon.fechaExpiracion) < new Date()) return 'Este cupón ya expiró';
    if (cupon.usosMaximos > 0 && cupon.usosActuales >= cupon.usosMaximos) return 'Este cupón alcanzó el límite máximo de usos';

    const base = Math.max(0, Number(subtotal) || 0);
    if (cupon.montoMinimo > 0 && base < cupon.montoMinimo) {
        return `Este cupón requiere una compra mínima de ₡${cupon.montoMinimo.toLocaleString('es-CR')}`;
    }
    return null;
}

function prepararDatosCupon(body) {
    const datos = { ...body };
    if (datos.codigo) {
        datos.codigo = String(datos.codigo).trim().toUpperCase().replace(/\s+/g, '');
    }
    if (datos.fechaExpiracion === '') {
        datos.fechaExpiracion = null;
    }
    return datos;
}

const listar = async (req, res) => {
    try {
        const filtro = {};
        if (req.query.estado !== undefined) filtro.estado = req.query.estado === 'true';
        const cupones = await Cupon.find(filtro).sort({ creadoEn: -1 });
        res.json(cupones);
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const cupon = await Cupon.findById(req.params.id);
        if (!cupon) {
            return res.status(404).json({ message: 'Cupón no encontrado: ' + req.params.id });
        }
        res.json(cupon);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    try {
        const datos = prepararDatosCupon(req.body);
        if (datos.tipo === 'porcentaje' && Number(datos.valor) > 100) {
            return res.status(400).json({ message: 'El porcentaje de descuento no puede superar el 100%' });
        }

        const guardado = await new Cupon(datos).save();
        res.status(201).json({ mensaje: 'Cupón creado', datos: guardado });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizar = async (req, res) => {
    try {
        const datos = prepararDatosCupon(req.body);
        if (datos.tipo === 'porcentaje' && Number(datos.valor) > 100) {
            return res.status(400).json({ message: 'El porcentaje de descuento no puede superar el 100%' });
        }

        const cupon = await Cupon.findByIdAndUpdate(req.params.id, datos, { new: true, runValidators: true });
        if (!cupon) {
            return res.status(404).json({ message: 'Cupón no encontrado: ' + req.params.id });
        }

        res.json({ mensaje: 'Cupón actualizado', datos: cupon });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const cupon = await Cupon.findByIdAndDelete(req.params.id);
        if (!cupon) {
            return res.status(404).json({ message: 'Cupón no encontrado: ' + req.params.id });
        }
        res.json({ mensaje: 'Cupón eliminado', datos: req.params.id });
    } catch (error) {
        responderError(res, error);
    }
};

const validar = async (req, res) => {
    try {
        const codigo = typeof req.body.codigo === 'string' ? req.body.codigo.trim().toUpperCase() : '';
        const subtotal = Number(req.body.subtotal) || 0;

        if (!codigo) {
            return res.status(400).json({ message: 'Ingresá un código de cupón' });
        }

        const cupon = await Cupon.findOne({ codigo });
        const errorValidacion = validarDisponibilidadCupon(cupon, subtotal);
        if (errorValidacion) {
            return res.status(400).json({ message: errorValidacion });
        }

        res.json({
            mensaje: 'Cupón aplicado',
            datos: {
                codigo: cupon.codigo,
                descripcion: cupon.descripcion,
                tipo: cupon.tipo,
                valor: cupon.valor,
                descuento: cupon.calcularDescuento(subtotal)
            }
        });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar, validar, validarDisponibilidadCupon };
