const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/ResennaController');
const { autenticar } = require('../middleware/auth');

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', autenticar, crear);
router.put('/:id', autenticar, actualizar);
router.delete('/:id', autenticar, eliminar);

module.exports = router;
