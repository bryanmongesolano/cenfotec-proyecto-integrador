const express = require('express');
const router = express.Router();
const { registro, login, perfil, cambiarContrasenna, recuperar, restablecer } = require('../controllers/AuthController');
const { autenticar } = require('../middleware/auth');

router.post('/registro', registro);
router.post('/login', login);
router.post('/recuperar', recuperar);
router.post('/restablecer', restablecer);
router.get('/perfil', autenticar, perfil);
router.put('/contrasenna', autenticar, cambiarContrasenna);

module.exports = router;
