const express = require('express');
const router = express.Router();
const { listar, agregarItem, actualizarItem, quitarItem, vaciar } = require('../controllers/CarritoController');
const { autenticar, esDuenoOAdmin } = require('../middleware/auth');

router.get('/:usuarioId', autenticar, esDuenoOAdmin('usuarioId'), listar);
router.post('/:usuarioId/items', autenticar, esDuenoOAdmin('usuarioId'), agregarItem);
router.put('/:usuarioId/items/:itemId', autenticar, esDuenoOAdmin('usuarioId'), actualizarItem);
router.delete('/:usuarioId/items/:itemId', autenticar, esDuenoOAdmin('usuarioId'), quitarItem);
router.delete('/:usuarioId', autenticar, esDuenoOAdmin('usuarioId'), vaciar);

module.exports = router;
