const express = require('express');
const router = express.Router();
const { listar, listarProductos, obtener, crear, actualizar, eliminar } = require('../controllers/CategoriaController');

router.get('/', listar);
router.get('/:id/productos', listarProductos);
router.get('/:id', obtener);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
