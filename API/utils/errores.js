function responderError(res, error) {
    if (error && error.code === 11000) {
        const campo = error.keyPattern ? Object.keys(error.keyPattern)[0] : '';
        const mensajes = {
            correo: 'Ya existe una cuenta registrada con ese correo electrónico',
            cedula: 'Ya existe un usuario registrado con esa cédula',
            sku: 'Ya existe un producto con ese SKU',
            codigo: 'Ya existe un cupón con ese código'
        };
        return res.status(409).json({ message: mensajes[campo] || 'El registro ya existe' });
    }

    if (error && (error.name === 'ValidationError' || error.name === 'CastError')) {
        return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: (error && error.message) || 'Error interno del servidor' });
}

module.exports = { responderError };
