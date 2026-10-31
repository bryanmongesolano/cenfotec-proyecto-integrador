const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/UsuarioController');
const { autenticar, autorizar } = require('../middleware/auth');

router.use(autenticar, autorizar('admin'));

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
