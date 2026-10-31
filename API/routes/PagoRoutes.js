const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/PagoController');
const { autenticar, autorizar } = require('../middleware/auth');

router.get('/', autenticar, autorizar('admin'), listar);
router.get('/:id', autenticar, autorizar('admin'), obtener);
router.post('/', autenticar, crear);
router.put('/:id', autenticar, autorizar('admin'), actualizar);
router.delete('/:id', autenticar, autorizar('admin'), eliminar);

module.exports = router;
