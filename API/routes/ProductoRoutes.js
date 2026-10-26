const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, actualizarStock, eliminar } = require('../controllers/ProductoController');

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', crear);
router.put('/:id', actualizar);
router.patch('/:id/stock', actualizarStock);
router.delete('/:id', eliminar);

module.exports = router;
