require('dotenv').config();


const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');


const app = express();

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API' });
});


app.use('/usuarios', require('./routes/UsuarioRoutes'));
app.use('/productos', require('./routes/ProductoRoutes'));
app.use('/categorias', require('./routes/CategoriaRoutes'));
app.use('/carrito', require('./routes/CarritoRoutes'));
app.use('/pedidos', require('./routes/PedidoRoutes'));
app.use('/resennas', require('./routes/ResennaRoutes'));
app.use('/pagos', require('./routes/PagoRoutes'));



mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    })
})
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);

    });