# Proyecto Integrador 1 - API E-commerce

API REST para una tienda en línea. Incluye la lógica de negocio del catálogo, carrito, checkout, pedidos, reseñas y pagos, con esquemas validados y respuestas JSON.

## Tecnologías

- Node.js
- Express 5
- MongoDB + Mongoose 6
- dotenv
- cors
- nodemon (desarrollo)

## Pasos

1. Clonar el repositorio e ingresar a la carpeta de la API:

```bash
cd API
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear el archivo de variables de entorno a partir del ejemplo:

```bash
cp .env.example .env
```

Contenido de `.env`:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/nombrebd
```

4. Ejecutar el servidor:

```bash
npm start
# o
npm run dev
```

La API queda disponible en `http://localhost:5001`.

El servidor solo inicia si la conexión a MongoDB es exitosa. Si falla, el proceso termina con el error en consola.

## Endpoints

Base URL: `http://localhost:5001`

### Usuarios

| Método | Ruta | Descripción | Cuerpo / parámetros |
|---|---|---|---|
| GET | `/usuarios` | Lista todos los usuarios | — |
| GET | `/usuarios/:id` | Usuario por ID | — |
| POST | `/usuarios` | Crea un usuario | Ver ejemplo |
| PUT | `/usuarios/:id` | Actualiza un usuario | Campos a modificar |
| DELETE | `/usuarios/:id` | Elimina un usuario | — |

Cuerpo para crear o actualizar:

```json
{
  "nombre": "Bryan",
  "apellido": "Monge",
  "apellido2": "Solano",
  "cedula": "112340567",
  "telefono": "8888-7777",
  "correo": "bryan@example.com",
  "contrasenna": "Clave123!",
  "rol": "cliente",
  "estado": true,
  "direcciones": [
    {
      "provincia": "San José",
      "canton": "Central",
      "distrito": "Carmen",
      "codigoPostal": "10101",
      "direccionExacta": "Calle 5, casa 12",
      "tipo": "casa",
      "esPrincipal": true
    }
  ]
}
```

### Categorías

| Método | Ruta | Descripción | Cuerpo / parámetros |
|---|---|---|---|
| GET | `/categorias` | Lista categorías | `?estado=true|false`, `?padre=<id>` |
| GET | `/categorias/:id` | Categoría por ID | — |
| GET | `/categorias/:id/productos` | Productos de la categoría | — |
| POST | `/categorias` | Crea una categoría | Ver ejemplo |
| PUT | `/categorias/:id` | Actualiza una categoría | Campos a modificar |
| DELETE | `/categorias/:id` | Elimina (409 si tiene productos o subcategorías) | — |

Cuerpo para crear o actualizar:

```json
{
  "nombre": "Tecnologia",
  "descripcion": "Equipos y accesorios",
  "icono": "laptop",
  "padre": null,
  "estado": true
}
```

### Productos

| Método | Ruta | Descripción | Cuerpo / parámetros |
|---|---|---|---|
| GET | `/productos` | Lista productos con filtros | `?q=`, `?categoria=`, `?precioMin=`, `?precioMax=`, `?viral=`, `?destacado=`, `?estado=`, `?stockBajo=true` |
| GET | `/productos/:id` | Producto por ID | — |
| POST | `/productos` | Crea un producto | Ver ejemplo |
| PUT | `/productos/:id` | Actualiza un producto | Campos a modificar |
| PATCH | `/productos/:id/stock` | Actualiza el stock | `{ "stock": 20 }` |
| DELETE | `/productos/:id` | Elimina un producto | — |

Cuerpo para crear o actualizar:

```json
{
  "nombre": "Audífonos Bluetooth",
  "descripcion": "Inalámbricos con cancelación de ruido",
  "precio": 45900,
  "stock": 12,
  "stockMinimo": 3,
  "categoria": "ID_DE_CATEGORIA",
  "marca": "Sony",
  "sku": "AUD-SONY-100",
  "imagenes": ["https://cdn.example.com/productos/audifonos.jpg"],
  "viral": true,
  "destacado": true,
  "estado": true
}
```

### Carrito

| Método | Ruta | Descripción | Cuerpo |
|---|---|---|---|
| GET | `/carrito/:usuarioId` | Carrito del usuario (se crea vacío si no existe) | — |
| POST | `/carrito/:usuarioId/items` | Agrega un producto | `{ "producto": "<id>", "cantidad": 2 }` |
| PUT | `/carrito/:usuarioId/items/:itemId` | Cambia la cantidad | `{ "cantidad": 3 }` |
| DELETE | `/carrito/:usuarioId/items/:itemId` | Quita un producto | — |
| DELETE | `/carrito/:usuarioId` | Vacía el carrito | — |

El carrito calcula `subtotal`, `impuestos` (13 %) y `total`, y valida stock al agregar o modificar.

### Pedidos

| Método | Ruta | Descripción | Cuerpo / parámetros |
|---|---|---|---|
| GET | `/pedidos` | Lista todos los pedidos | `?estado=`, `?usuario=` |
| GET | `/pedidos/usuario/:usuarioId` | Pedidos de un usuario | — |
| GET | `/pedidos/estadisticas` | Métricas para el dashboard | — |
| GET | `/pedidos/:id` | Pedido por ID | — |
| POST | `/pedidos` | Checkout: crea el pedido desde el carrito | Ver ejemplo |
| PATCH | `/pedidos/:id/estado` | Cambia el estado | `{ "estado": "pagado" }` o `{ "estado": "cancelado", "motivo": "..." }` |
| DELETE | `/pedidos/:id` | Elimina un pedido (devuelve stock) | — |

Estados permitidos: `pendiente`, `pagado`, `enviado`, `entregado`, `cancelado`.

Cuerpo para el checkout:

> El checkout toma los productos del **carrito** del usuario, por lo que el carrito debe tener al menos un producto antes de llamar a este endpoint.

```json
{
  "usuario": "ID_DE_USUARIO",
  "direccionEnvio": {
    "provincia": "San José",
    "canton": "Central",
    "distrito": "Carmen",
    "codigoPostal": "10101",
    "direccionExacta": "Calle 5, casa 12"
  },
  "costoEnvio": 1500,
  "descuento": 0,
  "metodoPago": "sinpe"
}
```

### Reseñas

| Método | Ruta | Descripción | Cuerpo / parámetros |
|---|---|---|---|
| GET | `/resennas` | Lista reseñas | `?producto=`, `?usuario=` |
| GET | `/resennas/:id` | Reseña por ID | — |
| POST | `/resennas` | Crea una reseña | Ver ejemplo |
| PUT | `/resennas/:id` | Actualiza una reseña | Campos a modificar |
| DELETE | `/resennas/:id` | Elimina una reseña | — |

Cuerpo para crear o actualizar:

```json
{
  "producto": "ID_DE_PRODUCTO",
  "usuario": "ID_DE_USUARIO",
  "calificacion": 5,
  "comentario": "Excelente calidad"
}
```

### Pagos

| Método | Ruta | Descripción | Cuerpo / parámetros |
|---|---|---|---|
| GET | `/pagos` | Lista pagos | `?pedido=`, `?estado=` |
| GET | `/pagos/:id` | Pago por ID | — |
| POST | `/pagos` | Registra un pago | Ver ejemplo |
| PUT | `/pagos/:id` | Actualiza un pago | Campos a modificar |
| DELETE | `/pagos/:id` | Elimina un pago | — |

Métodos permitidos: `sinpe`, `tarjeta`. Estados: `pendiente`, `aprobado`, `rechazado`.

Cuerpo para crear o actualizar:

```json
{
  "pedido": "ID_DE_PEDIDO",
  "metodo": "sinpe",
  "monto": 52300,
  "estado": "pendiente",
  "comprobante": "https://cdn.example.com/comprobantes/sinpe-123.jpg"
}
```

## Códigos de estado

| Código | Uso |
|---|---|
| 200 | Consulta o actualización exitosa |
| 201 | Recurso creado |
| 400 | Datos inválidos o id con formato incorrecto |
| 404 | Recurso o referencia no encontrada |
| 409 | Conflicto (duplicado, stock insuficiente, categoría con productos) |
| 500 | Error interno del servidor |
