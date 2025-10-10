# Endpoints de Movimientos de Cuenta y Facturas

## Resumen
Se han creado los endpoints necesarios para gestionar movimientos de cuenta, facturas y detalles de factura. Estos endpoints permiten a los usuarios y al sistema visualizar:
- Movimientos de cuenta de los clientes
- Facturas y sus detalles
- Productos consumidos por cliente (registros únicos por producto)

## Estructura de Archivos Creados

### Mappers (helpers/)
1. **movimientoCuentaMapper.js** - Mapea datos de movimientos de cuenta
2. **facturaMapper.js** - Mapea datos de facturas
3. **detalleFacturaMapper.js** - Mapea detalles de facturas

### Controladores (controllers/)
1. **movimientoCuentaController.js** - Lógica de negocio para movimientos
2. **facturaController.js** - Lógica de negocio para facturas

### Rutas (routes/)
1. **movimientoCuentaRoutes.js** - Rutas con documentación Swagger
2. **facturaRoutes.js** - Rutas con documentación Swagger

---

## Endpoints de Movimientos de Cuenta

### 1. GET /api/movimientos-cuenta
Obtiene todos los movimientos de cuenta del sistema.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Respuesta**: Lista de todos los movimientos con información del cliente y factura

### 2. GET /api/movimientos-cuenta/:id
Obtiene un movimiento específico por su ID.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**: 
  - `id` (path): ID del movimiento
- **Respuesta**: Detalles completos del movimiento

### 3. GET /api/movimientos-cuenta/cliente/:idCliente
Obtiene todos los movimientos de un cliente específico.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `idCliente` (path): ID del cliente
  - `tipo` (query, opcional): CONSUMO | RECARGA | PAGO
  - `desde` (query, opcional): Fecha inicial (YYYY-MM-DD)
  - `hasta` (query, opcional): Fecha final (YYYY-MM-DD)
- **Respuesta**: Lista de movimientos filtrados

### 4. GET /api/movimientos-cuenta/cliente/:idCliente/resumen
Obtiene un resumen completo de la cuenta del cliente.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `idCliente` (path): ID del cliente
- **Respuesta**: 
  - Información del cliente y saldo actual
  - Totales agrupados por tipo de movimiento
  - Últimos 10 movimientos

---

## Endpoints de Facturas

### 1. GET /api/facturas
Obtiene todas las facturas del sistema.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `estado` (query, opcional): PENDIENTE | COBRADA | ANULADA
  - `desde` (query, opcional): Fecha inicial (YYYY-MM-DD)
  - `hasta` (query, opcional): Fecha final (YYYY-MM-DD)
- **Respuesta**: Lista de facturas filtradas

### 2. GET /api/facturas/:id
Obtiene una factura por ID con todos sus detalles.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `id` (path): ID de la factura
- **Respuesta**: Factura completa con array de detalles (productos)

### 3. GET /api/facturas/cliente/:idCliente
Obtiene todas las facturas de un cliente específico.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `idCliente` (path): ID del cliente
  - `estado` (query, opcional): PENDIENTE | COBRADA | ANULADA
  - `desde` (query, opcional): Fecha inicial (YYYY-MM-DD)
  - `hasta` (query, opcional): Fecha final (YYYY-MM-DD)
- **Respuesta**: Lista de facturas del cliente

### 4. GET /api/facturas/cliente/:idCliente/productos-consumidos
Obtiene productos consumidos por el cliente (registro único por producto).
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `idCliente` (path): ID del cliente
  - `desde` (query, opcional): Fecha inicial (YYYY-MM-DD)
  - `hasta` (query, opcional): Fecha final (YYYY-MM-DD)
- **Respuesta**: Lista de productos con:
  - Información del producto
  - Total de cantidad consumida
  - Total gastado en ese producto
  - Veces que lo consumió
  - Fecha de última compra

### 5. GET /api/facturas/:idFactura/detalles
Obtiene los detalles (productos) de una factura específica.
- **Auth**: Requerida (Bearer Token)
- **Rol**: Admin
- **Parámetros**:
  - `idFactura` (path): ID de la factura
- **Respuesta**: Lista de productos en la factura con información completa

---

## Características Especiales

### Filtros Disponibles
- **Por tipo de movimiento**: CONSUMO, RECARGA, PAGO
- **Por estado de factura**: PENDIENTE, COBRADA, ANULADA
- **Por rango de fechas**: desde/hasta

### Información Relacionada
Todos los endpoints incluyen información relacionada cuando está disponible:
- **Movimientos**: Incluyen info del cliente y factura asociada
- **Facturas**: Incluyen info del cliente, mesa y grupo
- **Detalles**: Incluyen info completa del producto y categoría

### Endpoint Especial: Productos Consumidos
El endpoint `/api/facturas/cliente/:idCliente/productos-consumidos` es especialmente útil para:
- Sistema de recomendaciones
- Análisis de preferencias del cliente
- Estadísticas de consumo
- Historial de compras agregado

Devuelve un registro único por cada producto que el cliente ha consumido, con estadísticas agregadas.

---

## Seguridad
Todos los endpoints requieren:
- Autenticación mediante Bearer Token
- Rol de administrador (authorizeAdmin middleware)

---

## Documentación Swagger
Todos los endpoints están completamente documentados en Swagger y estarán disponibles en:
`http://localhost:3000/api-docs`

---

## Ejemplo de Uso

### Obtener movimientos de un cliente con filtros
```bash
GET /api/movimientos-cuenta/cliente/5?tipo=CONSUMO&desde=2025-01-01&hasta=2025-10-10
Authorization: Bearer {token}
```

### Obtener productos consumidos por un cliente
```bash
GET /api/facturas/cliente/5/productos-consumidos?desde=2025-01-01
Authorization: Bearer {token}
```

### Obtener factura completa con detalles
```bash
GET /api/facturas/123
Authorization: Bearer {token}
```

Respuesta incluye automáticamente todos los detalles de productos en el campo `detalles`.
