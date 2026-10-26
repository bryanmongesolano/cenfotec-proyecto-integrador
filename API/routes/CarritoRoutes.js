const express = require('express');
const router = express.Router();
const { listar, agregarItem, actualizarItem, quitarItem, vaciar } = require('../controllers/CarritoController');

router.get('/:usuarioId', listar);
router.post('/:usuarioId/items', agregarItem);
router.put('/:usuarioId/items/:itemId', actualizarItem);
router.delete('/:usuarioId/items/:itemId', quitarItem);
router.delete('/:usuarioId', vaciar);

module.exports = router;
