# Guía Rápida de Endpoints - Movimientos y Facturas

## 📋 Movimientos de Cuenta

### Base URL: `/api/movimientos-cuenta`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Obtener todos los movimientos |
| GET | `/cliente/:idCliente/resumen` | Resumen de cuenta del cliente |
| GET | `/cliente/:idCliente` | Movimientos de un cliente |
| GET | `/:id` | Obtener un movimiento por ID |

**Orden importante**: Las rutas específicas van antes de las dinámicas.

### Filtros disponibles en `/cliente/:idCliente`:
- `tipo`: CONSUMO, RECARGA, PAGO
- `desde`: Fecha inicial (YYYY-MM-DD)
- `hasta`: Fecha final (YYYY-MM-DD)

---

## 🧾 Facturas

### Base URL: `/api/facturas`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Obtener todas las facturas |
| GET | `/cliente/:idCliente/productos-consumidos` | Productos consumidos (único por producto) |
| GET | `/cliente/:idCliente` | Facturas de un cliente |
| GET | `/:idFactura/detalles` | Detalles de una factura |
| GET | `/:id` | Obtener una factura por ID |

**Orden importante**: Las rutas más específicas van primero.

### Filtros disponibles:
- `estado`: PENDIENTE, COBRADA, ANULADA
- `desde`: Fecha inicial (YYYY-MM-DD)
- `hasta`: Fecha final (YYYY-MM-DD)

---

## 🔒 Seguridad

Todos los endpoints requieren:
- **Autenticación**: Bearer Token
- **Autorización**: Rol de administrador

---

## 💡 Ejemplos de Uso

### 1. Resumen de cuenta de un cliente
```bash
GET /api/movimientos-cuenta/cliente/5/resumen
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": 5,
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@email.com",
      "saldoActual": 500.00,
      "tarjetaUuid": "abc123"
    },
    "totalesPorTipo": [
      {
        "tipo": "CONSUMO",
        "cantidad": 15,
        "total": 1250.50
      }
    ],
    "ultimosMovimientos": [...]
  }
}
```

### 2. Productos consumidos por un cliente
```bash
GET /api/facturas/cliente/5/productos-consumidos?desde=2025-01-01
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "idProducto": 10,
      "nombreProducto": "Hamburguesa Clásica",
      "totalCantidad": 15,
      "totalGastado": 750.00,
      "vecesConsumido": 8,
      "ultimaCompra": "2025-10-10T14:30:00.000Z"
    }
  ]
}
```

### 3. Factura completa con detalles
```bash
GET /api/facturas/123
Authorization: Bearer <token>
```

**Respuesta incluye** automáticamente el array `detalles` con todos los productos.

### 4. Movimientos filtrados por tipo
```bash
GET /api/movimientos-cuenta/cliente/5?tipo=CONSUMO&desde=2025-01-01
Authorization: Bearer <token>
```

---

## 📊 Casos de Uso

### Para el Sistema
- Visualizar todos los movimientos y facturas
- Generar reportes de consumo
- Análisis de ventas por producto
- Control de cuentas pendientes

### Para Usuarios/Clientes
- Ver historial de consumos
- Consultar saldo y movimientos
- Ver productos favoritos
- Revisar facturas históricas

---

## 🎯 Endpoint Destacado

### `/api/facturas/cliente/:idCliente/productos-consumidos`

Este endpoint es especialmente útil porque devuelve **un registro único por cada producto consumido**, con estadísticas agregadas:

- ✅ Total de unidades consumidas
- ✅ Total gastado en ese producto
- ✅ Cantidad de veces que lo consumió
- ✅ Fecha de última compra

Ideal para:
- Sistemas de recomendación
- Análisis de preferencias
- Marketing personalizado
- Dashboard de usuario
