const express = require('express');
const router = express.Router();
const { listar, listarProductos, obtener, crear, actualizar, eliminar } = require('../controllers/CategoriaController');
const { autenticar, autorizar } = require('../middleware/auth');

router.get('/', listar);
router.get('/:id/productos', listarProductos);
router.get('/:id', obtener);
router.post('/', autenticar, autorizar('admin'), crear);
router.put('/:id', autenticar, autorizar('admin'), actualizar);
router.delete('/:id', autenticar, autorizar('admin'), eliminar);

module.exports = router;
