const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, eliminar, validar } = require('../controllers/CuponController');
const { autenticar, autorizar } = require('../middleware/auth');

router.post('/validar', autenticar, validar);
router.get('/', autenticar, autorizar('admin'), listar);
router.get('/:id', autenticar, autorizar('admin'), obtener);
router.post('/', autenticar, autorizar('admin'), crear);
router.put('/:id', autenticar, autorizar('admin'), actualizar);
router.delete('/:id', autenticar, autorizar('admin'), eliminar);

module.exports = router;
