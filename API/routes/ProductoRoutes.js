const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, actualizarStock, eliminar } = require('../controllers/ProductoController');
const { autenticar, autorizar } = require('../middleware/auth');

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', autenticar, autorizar('admin'), crear);
router.put('/:id', autenticar, autorizar('admin'), actualizar);
router.patch('/:id/stock', autenticar, autorizar('admin'), actualizarStock);
router.delete('/:id', autenticar, autorizar('admin'), eliminar);

module.exports = router;
