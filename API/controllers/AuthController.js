const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

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
        const usuario = new Usuario({
            nombre: req.body.nombre,
            apellido: req.body.apellido,
            apellido2: req.body.apellido2,
            cedula: req.body.cedula,
            telefono: req.body.telefono,
            correo: req.body.correo,
            contrasenna: req.body.contrasenna,
            direcciones: req.body.direcciones,
            rol: 'cliente'
        });

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
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { correo, contrasenna } = req.body;

        if (!correo || !contrasenna) {
            return res.status(400).json({ message: "El correo y la contraseña son obligatorios" });
        }

        const usuario = await Usuario.findOne({ correo }).select('+contrasenna');

        if (!usuario) {
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
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const perfil = async (req, res) => {
    try {
        res.json(req.usuario);
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const actualizarPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario._id);

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const campos = ['nombre', 'apellido', 'apellido2', 'telefono', 'direcciones'];

        campos.forEach(campo => {
            if (req.body[campo] !== undefined) {
                usuario[campo] = req.body[campo];
            }
        });

        await usuario.save();

        res.json({
            mensaje: "Perfil actualizado",
            datos: usuario
        });
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
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

        const coincide = await bcrypt.compare(contrasennaActual, usuario.contrasenna);

        if (!coincide) {
            return res.status(400).json({ message: "La contraseña actual no es correcta" });
        }

        usuario.contrasenna = contrasennaNueva;
        await usuario.save();

        res.json({ mensaje: "Contraseña actualizada" });
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const recuperar = async (req, res) => {
    try {
        const { correo } = req.body;

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

        // Simulación del envío de correo: el token se devuelve en la respuesta
        res.json({
            mensaje: "Token de recuperación generado",
            datos: { token }
        });
    } catch (error) {
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

const restablecer = async (req, res) => {
    try {
        const { correo, token, contrasenna } = req.body;

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
        const codigo = error.code === 11000 ? 409 : (error.name === 'ValidationError' || error.name === 'CastError') ? 400 : 500;
        res.status(codigo).json({ message: error.message });
    }
};

module.exports = { registro, login, perfil, actualizarPerfil, cambiarContrasenna, recuperar, restablecer };
