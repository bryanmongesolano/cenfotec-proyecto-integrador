const Usuario = require('../models/Usuario');
const { responderError } = require('../utils/errores');

function sinContrasenna(usuario) {
    const datos = usuario.toObject();
    delete datos.contrasenna;
    return datos;
}

const listar = async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        res.json(usuarios);
    } catch (error) {
        responderError(res, error);
    }
};

const obtener = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado: ' + req.params.id });
        }
        res.json(usuario);
    } catch (error) {
        responderError(res, error);
    }
};

const crear = async (req, res) => {
    try {
        const datosEntrada = { ...req.body };
        if (datosEntrada.cedula !== undefined && String(datosEntrada.cedula).trim() === '') delete datosEntrada.cedula;
        if (datosEntrada.telefono !== undefined && String(datosEntrada.telefono).trim() === '') delete datosEntrada.telefono;

        const usuarioGuardado = await new Usuario(datosEntrada).save();
        res.status(201).json({ mensaje: 'Usuario creado', datos: sinContrasenna(usuarioGuardado) });
    } catch (error) {
        responderError(res, error);
    }
};

const actualizar = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.params.id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado: ' + req.params.id });
        }

        const cambios = { ...req.body };
        if (cambios.cedula !== undefined && String(cambios.cedula).trim() === '') cambios.cedula = undefined;
        if (cambios.telefono !== undefined && String(cambios.telefono).trim() === '') cambios.telefono = undefined;
        if (cambios.contrasenna !== undefined && String(cambios.contrasenna).trim() === '') delete cambios.contrasenna;

        Object.assign(usuario, cambios);
        await usuario.save();

        res.json({ mensaje: 'Usuario actualizado', datos: sinContrasenna(usuario) });
    } catch (error) {
        responderError(res, error);
    }
};

const eliminar = async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndDelete(req.params.id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado: ' + req.params.id });
        }
        res.json({ mensaje: 'Usuario eliminado', datos: req.params.id });
    } catch (error) {
        responderError(res, error);
    }
};

module.exports = { listar, obtener, crear, actualizar, eliminar };
