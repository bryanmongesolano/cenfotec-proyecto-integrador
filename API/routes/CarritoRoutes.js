const express = require('express');
const router = express.Router();
const Carrito = require('../models/Carrito');
const Producto = require('../models/Producto');
const Usuario = require('../models/Usuario');

async function obtenerOCrearCarrito(usuarioId) {
    const usuario = await Usuario.findById(usuarioId);

    if (!usuario) {
        return { error: "Usuario no encontrado" };
    }

    let carrito = await Carrito.findOne({ usuario: usuarioId });

    if (!carrito) {
        carrito = await Carrito.create({ usuario: usuarioId });
    }

    return { carrito };
}


//GET carrito del usuario
router.get('/:usuarioId', async (req, res) => {
    try {
        const { carrito, error } = await obtenerOCrearCarrito(req.params.usuarioId);

        if (error) {
            return res.status(404).json({ message: error });
        }

        await carrito.populate('items.producto', 'nombre precio stock imagenes estado');

        res.json(carrito);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//POST agregar producto al carrito
router.post('/:usuarioId/items', async (req, res) => {
    try {
        const { producto: productoId, cantidad } = req.body;

        if (!productoId) {
            return res.status(400).json({ message: "El producto es obligatorio" });
        }

        const cantidadSolicitada = Number(cantidad ?? 1);

        if (!Number.isInteger(cantidadSolicitada) || cantidadSolicitada < 1) {
            return res.status(400).json({ message: "La cantidad debe ser un entero mayor o igual a 1" });
        }

        const producto = await Producto.findById(productoId);

        if (!producto) {
            return res.status(404).json({ message: "Producto no encontrado" + productoId });
        }

        if (!producto.estado) {
            return res.status(409).json({ message: "El producto no está disponible" });
        }

        const { carrito, error } = await obtenerOCrearCarrito(req.params.usuarioId);

        if (error) {
            return res.status(404).json({ message: error });
        }

        const itemExistente = carrito.items.find(item => item.producto.equals(producto._id));
        const cantidadFinal = (itemExistente ? itemExistente.cantidad : 0) + cantidadSolicitada;

        if (producto.stock < cantidadFinal) {
            return res.status(409).json({
                message: `Stock insuficiente para "${producto.nombre}"`,
                disponible: producto.stock,
                solicitado: cantidadFinal
            });
        }

        if (itemExistente) {
            itemExistente.cantidad = cantidadFinal;
            itemExistente.precioUnitario = producto.precio;
        } else {
            carrito.items.push({
                producto: producto._id,
                cantidad: cantidadSolicitada,
                precioUnitario: producto.precio
            });
        }

        carrito.recalcularTotal();

        const carritoGuardado = await carrito.save();

        await carritoGuardado.populate('items.producto', 'nombre precio stock imagenes estado');

        res.status(201).json({
            mensaje: "Producto agregado al carrito",
            datos: carritoGuardado
        })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//PUT actualizar cantidad de un item
router.put('/:usuarioId/items/:itemId', async (req, res) => {
    try {
        const cantidad = Number(req.body.cantidad);

        if (!Number.isInteger(cantidad) || cantidad < 1) {
            return res.status(400).json({ message: "La cantidad debe ser un entero mayor o igual a 1" });
        }

        const carrito = await Carrito.findOne({ usuario: req.params.usuarioId });

        if (!carrito) {
            return res.status(404).json({ message: "Carrito no encontrado" });
        }

        const item = carrito.items.id(req.params.itemId);

        if (!item) {
            return res.status(404).json({ message: "Producto no encontrado en el carrito" });
        }

        const producto = await Producto.findById(item.producto);

        if (!producto) {
            return res.status(409).json({ message: "El producto ya no existe" });
        }

        if (producto.stock < cantidad) {
            return res.status(409).json({
                message: `Stock insuficiente para "${producto.nombre}"`,
                disponible: producto.stock,
                solicitado: cantidad
            });
        }

        item.cantidad = cantidad;
        item.precioUnitario = producto.precio;

        carrito.recalcularTotal();

        const carritoGuardado = await carrito.save();

        await carritoGuardado.populate('items.producto', 'nombre precio stock imagenes estado');

        res.json({
            mensaje: "Cantidad actualizada",
            datos: carritoGuardado
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//DELETE quitar un producto del carrito
router.delete('/:usuarioId/items/:itemId', async (req, res) => {
    try {
        const carrito = await Carrito.findOne({ usuario: req.params.usuarioId });

        if (!carrito) {
            return res.status(404).json({ message: "Carrito no encontrado" });
        }

        const item = carrito.items.id(req.params.itemId);

        if (!item) {
            return res.status(404).json({ message: "Producto no encontrado en el carrito" });
        }

        item.deleteOne();
        carrito.recalcularTotal();

        const carritoGuardado = await carrito.save();

        await carritoGuardado.populate('items.producto', 'nombre precio stock imagenes estado');

        res.json({
            mensaje: "Producto quitado del carrito",
            datos: carritoGuardado
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//DELETE vaciar carrito
router.delete('/:usuarioId', async (req, res) => {
    try {
        const carrito = await Carrito.findOne({ usuario: req.params.usuarioId });

        if (!carrito) {
            return res.status(404).json({ message: "Carrito no encontrado" });
        }

        carrito.items = [];
        carrito.recalcularTotal();

        await carrito.save();

        res.json({
            mensaje: "Carrito vaciado",
            datos: req.params.usuarioId
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
