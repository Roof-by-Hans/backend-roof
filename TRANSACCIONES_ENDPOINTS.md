# Endpoints de Transacciones (Consumo, Recarga y Pago)

## 📋 Resumen
Los endpoints de transacciones permiten registrar operaciones que afectan el saldo de la tarjeta del cliente y generan movimientos de cuenta. Cada tipo de transacción tiene su flujo específico según el tipo de suscripción (PREPAGA o CRÉDITO).

---

## 🎯 Tipos de Transacciones

### 1. CONSUMO
- **Descripción**: Registra el consumo de productos por parte de un cliente
- **Proceso**:
  1. Valida cliente, productos, mesa/grupo
  2. Calcula el total del consumo
  3. Verifica saldo (PREPAGA) o límite de crédito (CREDITO)
  4. Crea la factura con estado "PENDIENTE"
  5. Inserta los detalles de productos en la factura
  6. Crea movimiento de cuenta tipo "CONSUMO"
  7. Actualiza saldo de tarjeta:
     - **PREPAGA**: Descuenta del saldo
     - **CRÉDITO**: Aumenta la deuda
  8. Retorna factura completa con detalles

### 2. RECARGA
- **Descripción**: Recarga saldo en tarjetas PREPAGA
- **Restricción**: Solo tarjetas tipo PREPAGA
- **Proceso**:
  1. Valida cliente y tipo de tarjeta
  2. Crea movimiento de cuenta tipo "RECARGA"
  3. Aumenta el saldo de la tarjeta
  4. Retorna información del nuevo saldo

### 3. PAGO
- **Descripción**: Registra pagos para liquidar deudas o facturas
- **Uso**: Principalmente para tarjetas CRÉDITO
- **Proceso**:
  1. Valida cliente y opcionalmente la factura
  2. Crea movimiento de cuenta tipo "PAGO"
  3. Reduce la deuda de la tarjeta
  4. Si se pagó una factura completa, la marca como "COBRADA"
  5. Retorna información de la deuda actualizada

---

## 🔌 Endpoints

### Base URL: `/api/transacciones`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/consumo` | Registrar consumo y generar factura |
| POST | `/recarga` | Recargar saldo (solo PREPAGA) |
| POST | `/pago` | Registrar pago de factura o deuda |

---

## 📝 Detalles de Cada Endpoint

### 1. POST /api/transacciones/consumo

**Descripción**: Registra el consumo de productos y genera automáticamente una factura.

**Request Body**:
```json
{
  "idCliente": 1,
  "idMesa": 5,           // Opcional: ID de mesa individual
  "idGrupo": null,       // Opcional: ID de grupo de mesas (excluyente con idMesa)
  "productos": [
    {
      "idProducto": 1,
      "cantidad": 2,
      "precioUnitario": 5000.00  // Opcional: si no se envía, usa el precio del producto
    },
    {
      "idProducto": 2,
      "cantidad": 1
    }
  ],
  "observaciones": "Sin cebolla en la hamburguesa"  // Opcional
}
```

**Validaciones**:
- ✅ El cliente debe existir y tener tarjeta asociada
- ✅ Todos los productos deben existir
- ✅ No puede enviar `idMesa` e `idGrupo` al mismo tiempo
- ✅ Si es PREPAGA: saldo debe ser suficiente
- ✅ Si es CRÉDITO: no debe exceder el límite de crédito

**Response 201**:
```json
{
  "success": true,
  "message": "Consumo registrado exitosamente",
  "data": {
    "factura": {
      "id": 15,
      "idCliente": 1,
      "idMesa": 5,
      "idGrupo": null,
      "fecha": "2025-10-10T14:30:00.000Z",
      "estado": "PENDIENTE",
      "total": 13000.00,
      "cliente": {
        "id": 1,
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@email.com"
      },
      "mesa": {
        "id": 5,
        "nombre": "Mesa 5"
      },
      "detalles": [
        {
          "id": 20,
          "idFactura": 15,
          "idProducto": 1,
          "cantidad": 2,
          "precioUnitario": 5000.00,
          "subtotal": 10000.00,
          "producto": {
            "id": 1,
            "nombre": "Hamburguesa Clásica",
            "descripcion": "Con queso y vegetales",
            "fotoPrincipal": "url...",
            "categoria": "Comidas"
          }
        }
      ]
    },
    "resumen": {
      "totalConsumo": 13000.00,
      "cantidadProductos": 2,
      "tipoTarjeta": "PREPAGA",
      "saldoAnterior": 50000.00,
      "saldoActual": 37000.00
    }
  }
}
```

**Errores Comunes**:
- `400`: Saldo insuficiente, límite de crédito excedido, datos inválidos
- `404`: Cliente, producto, mesa o grupo no encontrado

---

### 2. POST /api/transacciones/recarga

**Descripción**: Recarga saldo en tarjetas PREPAGA.

**Request Body**:
```json
{
  "idCliente": 1,
  "monto": 50000.00,
  "metodoPago": "Efectivo",  // Efectivo, Tarjeta de Débito, Tarjeta de Crédito, Transferencia
  "observaciones": "Recarga en efectivo"  // Opcional
}
```

**Validaciones**:
- ✅ El cliente debe existir y tener tarjeta
- ✅ La tarjeta debe ser tipo PREPAGA
- ✅ El monto debe ser mayor a 0

**Response 201**:
```json
{
  "success": true,
  "message": "Recarga realizada exitosamente",
  "data": {
    "cliente": {
      "id": 1,
      "nombre": "Juan Pérez"
    },
    "recarga": {
      "monto": 50000.00,
      "metodoPago": "Efectivo",
      "fecha": "2025-10-10T14:30:00.000Z"
    },
    "saldos": {
      "anterior": 10000.00,
      "recargado": 50000.00,
      "actual": 60000.00
    }
  }
}
```

**Errores Comunes**:
- `400`: Tipo de tarjeta no válido (solo PREPAGA puede recargarse)
- `404`: Cliente no encontrado

---

### 3. POST /api/transacciones/pago

**Descripción**: Registra un pago para liquidar deudas o facturas específicas.

**Request Body**:
```json
{
  "idCliente": 1,
  "monto": 15000.00,
  "metodoPago": "Tarjeta de Crédito",  // Efectivo, Tarjeta de Débito, Tarjeta de Crédito, Transferencia
  "idFactura": 10,  // Opcional: ID de factura específica a pagar
  "observaciones": "Pago de factura #10"  // Opcional
}
```

**Validaciones**:
- ✅ El cliente debe existir y tener tarjeta
- ✅ El monto debe ser mayor a 0
- ✅ Si se especifica `idFactura`: debe existir, pertenecer al cliente, y no estar cobrada ni anulada

**Response 201**:
```json
{
  "success": true,
  "message": "Pago registrado exitosamente",
  "data": {
    "cliente": {
      "id": 1,
      "nombre": "Juan Pérez",
      "tipoTarjeta": "CREDITO"
    },
    "pago": {
      "monto": 15000.00,
      "metodoPago": "Tarjeta de Crédito",
      "fecha": "2025-10-10T14:30:00.000Z"
    },
    "saldos": {
      "deudaAnterior": 50000.00,
      "montoPagado": 15000.00,
      "deudaActual": 35000.00
    },
    "factura": {
      "id": 10,
      "total": 15000.00,
      "estadoAnterior": "PENDIENTE",
      "estadoActual": "COBRADA"
    }
  }
}
```

**Lógica de Estado de Factura**:
- Si `monto >= total de la factura`: Estado cambia a "COBRADA"
- Si `monto < total de la factura`: Estado permanece en "PENDIENTE"

**Errores Comunes**:
- `400`: Factura ya cobrada o anulada
- `404`: Cliente o factura no encontrada

---

## 🏪 Casos de Uso con Mesas y Grupos

### Escenario 1: Consumo en Mesa Individual
```json
POST /api/transacciones/consumo
{
  "idCliente": 1,
  "idMesa": 5,
  "productos": [...]
}
```
**Uso**: Cliente consume en una mesa específica

### Escenario 2: Consumo en Grupo de Mesas
```json
POST /api/transacciones/consumo
{
  "idCliente": 1,
  "idGrupo": 2,
  "productos": [...]
}
```
**Uso**: Evento o reunión que abarca múltiples mesas agrupadas (ej: terraza, salón privado)

### Escenario 3: Consumo sin Mesa/Grupo
```json
POST /api/transacciones/consumo
{
  "idCliente": 1,
  "productos": [...]
}
```
**Uso**: Compra para llevar, delivery, o consumo en barra

---

## 🔐 Seguridad

Todos los endpoints requieren:
- **Autenticación**: Bearer Token
- **Autorización**: Rol de administrador

---

## 💰 Flujos de Saldo por Tipo de Tarjeta

### Tarjeta PREPAGA
```
Saldo Inicial: $50,000
│
├─ CONSUMO ($13,000)
│  └─ Nuevo saldo: $37,000  (se descuenta)
│
├─ RECARGA ($20,000)
│  └─ Nuevo saldo: $57,000  (se suma)
│
└─ PAGO (no aplica para PREPAGA)
```

### Tarjeta CRÉDITO
```
Deuda Inicial: $0 (Límite: $100,000)
│
├─ CONSUMO ($13,000)
│  └─ Nueva deuda: $13,000  (se suma a la deuda)
│
├─ CONSUMO ($25,000)
│  └─ Nueva deuda: $38,000
│
├─ PAGO ($15,000)
│  └─ Nueva deuda: $23,000  (se resta de la deuda)
│
└─ RECARGA (no aplica para CRÉDITO)
```

---

## ⚡ Características Implementadas

### Transacciones Atómicas
- ✅ Todo el proceso se ejecuta en una transacción de base de datos
- ✅ Si falla cualquier paso, se hace rollback completo
- ✅ Garantiza consistencia de datos

### Validaciones Completas
- ✅ Existencia de cliente, productos, mesas, grupos
- ✅ Verificación de saldo o límite de crédito
- ✅ Estado de facturas
- ✅ Tipos de tarjeta según operación

### Auditoría
- ✅ Cada transacción genera un movimiento de cuenta
- ✅ Registro de fecha, monto y observaciones
- ✅ Vinculación con facturas cuando corresponde

### Información Completa
- ✅ Respuestas incluyen todos los detalles
- ✅ Información del cliente, productos y ubicación
- ✅ Saldos anteriores y actuales

---

## 📊 Ejemplos Completos

### Ejemplo 1: Cliente con Tarjeta PREPAGA realiza consumo

**Request**:
```bash
POST /api/transacciones/consumo
Authorization: Bearer {token}
Content-Type: application/json

{
  "idCliente": 1,
  "idMesa": 5,
  "productos": [
    { "idProducto": 1, "cantidad": 2 },
    { "idProducto": 2, "cantidad": 1 }
  ]
}
```

**Resultado**:
1. Se crea Factura #15 con total $13,000 (PENDIENTE)
2. Se insertan 2 detalles de factura
3. Se crea MovimientoCuenta tipo CONSUMO
4. Saldo de tarjeta: $50,000 → $37,000

---

### Ejemplo 2: Cliente recarga su tarjeta PREPAGA

**Request**:
```bash
POST /api/transacciones/recarga
Authorization: Bearer {token}
Content-Type: application/json

{
  "idCliente": 1,
  "monto": 30000,
  "metodoPago": "Efectivo"
}
```

**Resultado**:
1. Se crea MovimientoCuenta tipo RECARGA
2. Saldo de tarjeta: $37,000 → $67,000

---

### Ejemplo 3: Cliente con Tarjeta CRÉDITO paga una factura

**Request**:
```bash
POST /api/transacciones/pago
Authorization: Bearer {token}
Content-Type: application/json

{
  "idCliente": 2,
  "monto": 15000,
  "metodoPago": "Transferencia",
  "idFactura": 20
}
```

**Resultado**:
1. Se crea MovimientoCuenta tipo PAGO vinculado a Factura #20
2. Deuda de tarjeta: $50,000 → $35,000
3. Factura #20 cambia estado: PENDIENTE → COBRADA

---

## 🎯 Documentación Swagger

Todos los endpoints están completamente documentados en Swagger con:
- ✅ Esquemas de request/response completos
- ✅ Ejemplos para cada escenario
- ✅ Descripción de errores posibles
- ✅ Validaciones requeridas

**URL**: `http://localhost:3000/api-docs`

---

## 🚀 ¡Listo para Usar!

Los endpoints de transacciones están implementados y listos para:
- ✅ Registrar consumos con generación automática de facturas
- ✅ Gestionar recargas de tarjetas prepaga
- ✅ Procesar pagos y actualizar estados
- ✅ Mantener historial completo de movimientos
- ✅ Controlar saldos y límites de crédito
