const express = require('express');
const router = express.Router();
const { listar, listarPorUsuario, estadisticas, obtener, crear, cambiarEstado, eliminar } = require('../controllers/PedidoController');

router.get('/', listar);
router.get('/usuario/:usuarioId', listarPorUsuario);
router.get('/estadisticas', estadisticas);
router.get('/:id', obtener);
router.post('/', crear);
router.patch('/:id/estado', cambiarEstado);
router.delete('/:id', eliminar);

module.exports = router;
