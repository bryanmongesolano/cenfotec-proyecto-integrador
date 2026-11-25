const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { responderError } = require('../utils/errores');

function generarToken(usuario) {
    return jwt.sign(
        { id: usuario._id, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRA || '8h' }
    );
}

function usuarioSeguro(usuario) {
    const datos = usuario.toObject();
    delete datos.contrasenna;
    delete datos.tokenRecuperacion;
    delete datos.tokenExpira;
    return datos;
}

const registro = async (req, res) => {
    try {
        const datosUsuario = {
            nombre: req.body.nombre,
            apellido: req.body.apellido,
            apellido2: req.body.apellido2,
            correo: req.body.correo,
            contrasenna: req.body.contrasenna,
            direcciones: req.body.direcciones,
            rol: 'cliente'
        };

        if (req.body.cedula && String(req.body.cedula).trim()) {
            datosUsuario.cedula = String(req.body.cedula).trim();
        }

        if (req.body.telefono && String(req.body.telefono).trim()) {
            datosUsuario.telefono = String(req.body.telefono).trim();
        }

        const usuario = new Usuario(datosUsuario);

        const usuarioGuardado = await usuario.save();
        const token = generarToken(usuarioGuardado);

        res.status(201).json({
            mensaje: "Usuario registrado",
            datos: {
                usuario: usuarioSeguro(usuarioGuardado),
                token
            }
        })
    } catch (error) {
        responderError(res, error);
    }
};

const login = async (req, res) => {
    try {
        const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
        const { contrasenna } = req.body;

        if (!correo || !contrasenna) {
            return res.status(400).json({ message: "El correo y la contraseña son obligatorios" });
        }

        const usuario = await Usuario.findOne({ correo }).select('+contrasenna');

        if (!usuario || !usuario.contrasenna) {
            return res.status(401).json({ message: "Correo o contraseña incorrectos" });
        }

        if (!usuario.estado) {
            return res.status(403).json({ message: "El usuario está inactivo" });
        }

        const coincide = await bcrypt.compare(contrasenna, usuario.contrasenna);

        if (!coincide) {
            return res.status(401).json({ message: "Correo o contraseña incorrectos" });
        }

        const token = generarToken(usuario);

        res.json({
            mensaje: "Sesión iniciada",
            datos: {
                usuario: usuarioSeguro(usuario),
                token
            }
        });
    } catch (error) {
        responderError(res, error);
    }
};

const perfil = async (req, res) => {
    try {
        res.json(req.usuario);
    } catch (error) {
        responderError(res, error);
    }
};

const actualizarPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario._id);

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const campos = ['nombre', 'apellido', 'apellido2', 'cedula', 'telefono', 'direcciones'];

        campos.forEach(campo => {
            if (req.body[campo] !== undefined) {
                if ((campo === 'telefono' || campo === 'cedula') && String(req.body[campo]).trim() === '') {
                    usuario[campo] = undefined;
                } else if (campo === 'telefono' || campo === 'cedula') {
                    usuario[campo] = String(req.body[campo]).trim();
                } else {
                    usuario[campo] = req.body[campo];
                }
            }
        });

        await usuario.save();

        res.json({
            mensaje: "Perfil actualizado",
            datos: usuario
        });
    } catch (error) {
        responderError(res, error);
    }
};

const cambiarContrasenna = async (req, res) => {
    try {
        const { contrasennaActual, contrasennaNueva } = req.body;

        if (!contrasennaActual || !contrasennaNueva) {
            return res.status(400).json({ message: "La contraseña actual y la nueva son obligatorias" });
        }

        if (contrasennaNueva.length < 6) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
        }

        const usuario = await Usuario.findById(req.usuario._id).select('+contrasenna');

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        if (!usuario.contrasenna) {
            return res.status(400).json({ message: "El usuario no tiene una contraseña configurada" });
        }

        const coincide = await bcrypt.compare(contrasennaActual, usuario.contrasenna);

        if (!coincide) {
            return res.status(400).json({ message: "La contraseña actual no es correcta" });
        }

        usuario.contrasenna = contrasennaNueva;
        await usuario.save();

        res.json({ mensaje: "Contraseña actualizada" });
    } catch (error) {
        responderError(res, error);
    }
};

const recuperar = async (req, res) => {
    try {
        const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';

        if (!correo) {
            return res.status(400).json({ message: "El correo es obligatorio" });
        }

        const usuario = await Usuario.findOne({ correo });

        if (!usuario) {
            return res.status(404).json({ message: "Correo no registrado" });
        }

        const token = crypto.randomBytes(32).toString('hex');

        usuario.tokenRecuperacion = token;
        usuario.tokenExpira = new Date(Date.now() + 15 * 60 * 1000);

        await usuario.save();

        res.json({
            mensaje: "Token de recuperación generado",
            datos: { token }
        });
    } catch (error) {
        responderError(res, error);
    }
};

const restablecer = async (req, res) => {
    try {
        const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
        const { token, contrasenna } = req.body;

        if (!correo || !token || !contrasenna) {
            return res.status(400).json({ message: "El correo, el token y la nueva contraseña son obligatorios" });
        }

        if (contrasenna.length < 6) {
            return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
        }

        const usuario = await Usuario.findOne({ correo })
            .select('+tokenRecuperacion +tokenExpira +contrasenna');

        if (!usuario) {
            return res.status(404).json({ message: "Correo no registrado" });
        }

        if (usuario.tokenRecuperacion !== token) {
            return res.status(400).json({ message: "Token de recuperación inválido" });
        }

        if (!usuario.tokenExpira || usuario.tokenExpira < new Date()) {
            return res.status(400).json({ message: "El token de recuperación expiró" });
        }

        usuario.contrasenna = contrasenna;
        usuario.tokenRecuperacion = undefined;
        usuario.tokenExpira = undefined;

        await usuario.save();

        res.json({ mensaje: "Contraseña restablecida" });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { registro, login, perfil, actualizarPerfil, cambiarContrasenna, recuperar, restablecer };
