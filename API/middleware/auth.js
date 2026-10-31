const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

async function autenticar(req, res, next) {
    try {
        const header = req.header('Authorization');

        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        const token = header.replace('Bearer ', '');
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = await Usuario.findById(payload.id);

        if (!usuario) {
            return res.status(401).json({ message: "Usuario no encontrado" });
        }

        if (!usuario.estado) {
            return res.status(403).json({ message: "El usuario está inactivo" });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token inválido o expirado" });
        }

        const codigo = error.name === 'CastError' ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
}

function autorizar(...roles) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ message: "No autenticado" });
        }

        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({ message: "No tiene permiso para realizar esta acción" });
        }

        next();
    };
}

function esDuenoOAdmin(campo) {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ message: "No autenticado" });
        }

        if (req.usuario.rol === 'admin') {
            return next();
        }

        if (String(req.usuario._id) === String(req.params[campo])) {
            return next();
        }

        return res.status(403).json({ message: "No tiene permiso para ver este recurso" });
    };
}

module.exports = { autenticar, autorizar, esDuenoOAdmin };
