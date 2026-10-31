const express = require('express');
const router = express.Router();
const { listar, listarPorUsuario, estadisticas, obtener, crear, cambiarEstado, eliminar } = require('../controllers/PedidoController');
const { autenticar, autorizar, esDuenoOAdmin } = require('../middleware/auth');

router.get('/', autenticar, autorizar('admin'), listar);
router.get('/usuario/:usuarioId', autenticar, esDuenoOAdmin('usuarioId'), listarPorUsuario);
router.get('/estadisticas', autenticar, autorizar('admin'), estadisticas);
router.get('/:id', autenticar, obtener);
router.post('/', autenticar, crear);
router.patch('/:id/estado', autenticar, autorizar('admin'), cambiarEstado);
router.delete('/:id', autenticar, autorizar('admin'), eliminar);

module.exports = router;
