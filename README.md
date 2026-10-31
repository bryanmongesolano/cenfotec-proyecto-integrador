# Proyecto Integrador 1 - API E-commerce

API REST para una tienda en línea. Incluye la lógica de negocio del catálogo, carrito, checkout, pedidos, reseñas y pagos, con esquemas validados, autenticación con JWT y respuestas JSON.

## Tecnologías

- Node.js
- Express 5
- MongoDB + Mongoose 6
- dotenv
- cors
- bcryptjs (hash de contraseñas)
- jsonwebtoken (sesiones)
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
JWT_SECRET=cambia_esta_clave_por_una_larga_y_aleatoria
JWT_EXPIRA=8h
ADMIN_NOMBRE=Admin
ADMIN_CORREO=admin@tienda.com
ADMIN_CONTRASENNA=Admin123!
```

4. Crear el usuario administrador inicial:

```bash
npm run seed:admin
```

Crea (o actualiza) un usuario con `rol: admin` usando `ADMIN_CORREO` y `ADMIN_CONTRASENNA`.

5. Ejecutar el servidor:

```bash
npm start
# o
npm run dev
```

La API queda disponible en `http://localhost:5001`.

El servidor solo inicia si la conexión a MongoDB es exitosa. Si falla, el proceso termina con el error en consola.

## Autenticación

La API usa **JWT**. Los endpoints de login y registro devuelven un `token` que debe enviarse en el header:

```
Authorization: Bearer <token>
```

El token dura **8 horas**. El registro siempre crea usuarios con `rol: cliente`; los administradores se crean con `npm run seed:admin`.

### Endpoints de autenticación

| Método | Ruta | Descripción | Acceso | Cuerpo |
|---|---|---|---|---|
| POST | `/auth/registro` | Registra un cliente | Público | Ver ejemplo |
| POST | `/auth/login` | Inicia sesión | Público | `{ "correo": "...", "contrasenna": "..." }` |
| POST | `/auth/recuperar` | Genera token de recuperación | Público | `{ "correo": "..." }` |
| POST | `/auth/restablecer` | Cambia la contraseña con el token | Público | `{ "correo": "...", "token": "...", "contrasenna": "..." }` |
| GET | `/auth/perfil` | Datos del usuario autenticado | Token | — |
| PUT | `/auth/perfil` | Actualiza el perfil propio | Token | `{ "nombre": "...", "telefono": "...", "direcciones": [] }` |
| PUT | `/auth/contrasenna` | Cambia la contraseña | Token | `{ "contrasennaActual": "...", "contrasennaNueva": "..." }` |

Registro:

```json
{
  "nombre": "Bryan",
  "apellido": "Monge",
  "telefono": "8888-7777",
  "correo": "bryan@example.com",
  "contrasenna": "Clave123!"
}
```

La recuperación es **simulada** (no hay envío de correo): `POST /auth/recuperar` devuelve el token en la respuesta para poder probar el flujo.

## Endpoints

Base URL: `http://localhost:5001`

### Usuarios

Todas las rutas requieren **token de administrador**.

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

Las consultas son públicas; crear, editar y eliminar requieren **token de administrador**.

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

Las consultas son públicas; crear, editar, actualizar stock y eliminar requieren **token de administrador**.

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

Requieren **token**. Cada usuario solo puede operar su propio carrito; un administrador puede operar cualquiera.

| Método | Ruta | Descripción | Cuerpo |
|---|---|---|---|
| GET | `/carrito/:usuarioId` | Carrito del usuario (se crea vacío si no existe) | — |
| POST | `/carrito/:usuarioId/items` | Agrega un producto | `{ "producto": "<id>", "cantidad": 2 }` |
| PUT | `/carrito/:usuarioId/items/:itemId` | Cambia la cantidad | `{ "cantidad": 3 }` |
| DELETE | `/carrito/:usuarioId/items/:itemId` | Quita un producto | — |
| DELETE | `/carrito/:usuarioId` | Vacía el carrito | — |

El carrito calcula `subtotal`, `impuestos` (13 %) y `total`, y valida stock al agregar o modificar.

### Pedidos

Requieren **token**. El listado general y las estadísticas son solo para administradores; el cliente solo accede a sus propios pedidos.

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

Para un cliente el campo `usuario` se ignora y se usa el del token.

### Reseñas

Las consultas son públicas; crear y editar requieren **token** (solo el autor); eliminar requiere **token de administrador**.

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

Para un cliente el campo `usuario` se ignora y se usa el del token.

### Pagos

Registrar un pago requiere **token** del dueño del pedido; listar, editar y eliminar requieren **token de administrador**.

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
| 401 | Falta el token o es inválido/expirado |
| 403 | El usuario no tiene permiso para esa acción |
| 404 | Recurso o referencia no encontrada |
| 409 | Conflicto (duplicado, stock insuficiente, categoría con productos) |
| 500 | Error interno del servidor |

Todas las respuestas de error tienen la forma:

```json
{ "message": "Descripción del error" }
```

## Colección de Postman

Archivo: `API/postman/ProyectoIntegrador1.postman_collection.json`

1. Ejecutar `npm run seed:admin` (la colección usa el admin para las rutas protegidas).
2. Abrir Postman → **Import** → seleccionar el archivo.
3. Verificar la variable `baseUrl` (`http://localhost:5001`).
4. Ejecutar con **Collection Runner** respetando el orden de las carpetas.

La carpeta **0. Auth** hace login del admin y registra un cliente, y guarda los tokens en las variables `adminToken` y `token`. El resto de las peticiones usan esos tokens automáticamente. Las variables de ids (`usuarioId`, `categoriaId`, `productoId`, `pedidoId`, etc.) también se capturan solas. La carpeta **8. Limpieza** elimina los registros creados.

Incluye casos de éxito y de error (400, 401, 404 y 409) para cada entidad.
