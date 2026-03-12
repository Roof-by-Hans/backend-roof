# Rollback de Pagos — Guía de integración Frontend (React Native)

## Índice

1. [Resumen de cambios en el backend](#1-resumen-de-cambios-en-el-backend)
2. [Endpoint REST — POST /api/transacciones/revertir/:idFactura](#2-endpoint-rest)
3. [Servicio de API (fetch/axios)](#3-servicio-de-api)
4. [Estados del ciclo de vida de una factura](#4-estados-del-ciclo-de-vida-de-una-factura)
5. [Integración WebSocket — eventos nuevos](#5-integración-websocket)
6. [Pantalla de detalle de factura — botón "Revertir pago"](#6-pantalla-de-detalle-de-factura)
7. [Cartel de advertencia PAGO_REVERTIDO_SIN_CAJA](#7-cartel-de-advertencia)
8. [Actualización automática de mesas](#8-actualización-automática-de-mesas)
9. [Manejo de errores](#9-manejo-de-errores)
10. [Diagrama de flujo completo](#10-diagrama-de-flujo-completo)

---

## 1. Resumen de cambios en el backend

| Cambio | Detalle |
|--------|---------|
| Nuevo endpoint | `POST /api/transacciones/revertir/:idFactura` |
| Nuevo evento WebSocket | `pago:revertido` en la sala `pedidos` |
| Evento WebSocket existente modificado | `mesa:estado-cambiado` y `mesas:lista-completa` se emiten automáticamente al revertir |
| Protección `updateEstadoFactura` | `PATCH /api/facturas/:id/estado` ahora devuelve `409` si la factura está en estado `COBRADA` |
| Sin cambios a la BD | No hay nuevas columnas ni tablas; el motivo se guarda en `observaciones` del `MovimientoCuenta` |

---

## 2. Endpoint REST

### `POST /api/transacciones/revertir/:idFactura`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (requerido):**
```json
{
  "motivo": "Cliente solicitó cancelación del pedido"
}
```

**Respuesta exitosa `200 OK` — caso normal (caja abierta):**
```json
{
  "success": true,
  "message": "Factura revertida exitosamente",
  "data": {
    "factura": {
      "id": 42,
      "idCliente": 5,
      "idMesa": 3,
      "idGrupo": null,
      "estadoAnterior": "COBRADA",
      "estadoActual": "ANULADA",
      "total": 15000.00
    },
    "saldos": {
      "anterior": 35000.00,
      "delta": 15000.00,
      "actual": 50000.00,
      "tipoTarjeta": "PREPAGA"
    },
    "movimientoCajaRegistrado": true,
    "mesasRestauradas": [
      { "idMesa": 3 }
    ]
  }
}
```

**Respuesta exitosa `200 OK` — sin caja abierta (campo `warning` presente):**
```json
{
  "success": true,
  "message": "Factura revertida exitosamente",
  "data": {
    "factura": { ... },
    "saldos": { ... },
    "movimientoCajaRegistrado": false,
    "mesasRestauradas": [],
    "warning": "PAGO_REVERTIDO_SIN_CAJA"
  }
}
```

> ⚠️ `warning` **solo aparece en la respuesta si no había caja abierta**. Cuando está ausente, el egreso se registró correctamente.

**Errores posibles:**

| Código | Condición |
|--------|-----------|
| `400` | `motivo` vacío o ausente |
| `400` | ID de factura inválido (no es número entero) |
| `404` | La factura no existe |
| `409` | La factura ya está `ANULADA` |
| `401` | Token inválido o ausente |
| `500` | Error interno del servidor |

---

## 3. Servicio de API

### `src/services/transaccionService.js`

```javascript
import api from './api'; // tu instancia de axios o fetch configurada

/**
 * Revierte una factura COBRADA o PENDIENTE.
 *
 * @param {number} idFactura
 * @param {string} motivo  - Requerido para auditoría
 * @returns {Promise<{data: object, warning: string|null}>}
 */
export const revertirFactura = async (idFactura, motivo) => {
  const response = await api.post(`/transacciones/revertir/${idFactura}`, {
    motivo,
  });

  return {
    data: response.data.data,
    warning: response.data.data?.warning ?? null,
    message: response.data.message,
  };
};
```

---

## 4. Estados del ciclo de vida de una factura

```
PENDIENTE ──┬──► COBRADA ──► ANULADA  (via rollback)
            └──────────────► ANULADA  (via rollback directo de PENDIENTE crédito)
```

| Estado | Quién lo asigna | Reversible |
|--------|----------------|------------|
| `PENDIENTE` | Al registrar consumo en tarjeta CRÉDITO | ✅ Sí |
| `COBRADA` | Al registrar consumo PREPAGA o al pagar CRÉDITO | ✅ Sí |
| `ANULADA` | Al hacer rollback | ❌ No (idempotente) |

**Regla de UI:** El botón "Revertir pago" solo debe mostrarse cuando `factura.estado === 'COBRADA' || factura.estado === 'PENDIENTE'`.

---

## 5. Integración WebSocket

### Sala a suscribir: `pedidos`

Todos los eventos de pedidos/pagos se reciben en la sala `pedidos`.  
Los eventos de mesas se reciben en las salas `mesas` y `mesa:{idMesa}`.

### Evento nuevo: `pago:revertido`

Se emite a la sala `pedidos` inmediatamente después del commit de la transacción.

**Payload:**
```json
{
  "message": "Factura #42 revertida",
  "data": {
    "id": 42,
    "idCliente": 5,
    "idMesa": 3,
    "idGrupo": null,
    "estadoAnterior": "COBRADA",
    "estadoActual": "ANULADA",
    "total": 15000.00
  },
  "timestamp": "2026-03-11T18:45:00.000Z"
}
```

### Eventos de mesas que se emiten automáticamente al revertir

Si la factura revertida tenía una **mesa individual** asociada :
- `mesa:estado-cambiado` → en las salas `mesas` y `mesa:{idMesa}`

Si la factura revertida tenía un **grupo de mesas** asociado:
- `mesas:lista-completa` → en la sala `mesas`

**No necesitás hacer nada extra para actualizar el mapa de mesas**; el backend lo envía solo después de confirmar el rollback.

### Suscripción en el componente principal (ejemplo con `socket.io-client`):

```javascript
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { marcarFacturaAnulada } from '../store/facturasSlice';
import { actualizarEstadoMesa } from '../store/mesasSlice';

export const usePagosSocket = (socket) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!socket) return;

    // Unirse a la sala si aún no se hizo
    socket.emit('join:pedidos');

    const handlePagoRevertido = ({ data }) => {
      // Actualizar la factura en el store local
      dispatch(marcarFacturaAnulada({
        idFactura: data.id,
        estadoAnterior: data.estadoAnterior,
      }));
    };

    // Actualización de mesa individual al revertir
    const handleMesaEstadoCambiado = ({ data }) => {
      dispatch(actualizarEstadoMesa({
        idMesa: data.id,
        estado: data.estado,
        idClienteActual: data.idClienteActual,
      }));
    };

    socket.on('pago:revertido', handlePagoRevertido);
    socket.on('mesa:estado-cambiado', handleMesaEstadoCambiado);

    return () => {
      socket.off('pago:revertido', handlePagoRevertido);
      socket.off('mesa:estado-cambiado', handleMesaEstadoCambiado);
    };
  }, [socket, dispatch]);
};
```

---

## 6. Pantalla de detalle de factura

### Lógica del botón "Revertir pago"

```jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { revertirFactura } from '../services/transaccionService';

const ESTADOS_REVERSIBLES = ['COBRADA', 'PENDIENTE'];

export const FacturaDetalleScreen = ({ factura, onRevertida }) => {
  const [cargando, setCargando] = useState(false);

  const confirmarReversion = () => {
    Alert.prompt(
      'Revertir factura',
      `¿Seguro que querés revertir la factura #${factura.id}?\nIngresá el motivo:`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revertir',
          style: 'destructive',
          onPress: (motivo) => ejecutarReversion(motivo),
        },
      ],
      'plain-text',
    );
  };

  const ejecutarReversion = async (motivo) => {
    if (!motivo || motivo.trim() === '') {
      Alert.alert('Error', 'El motivo es obligatorio para revertir una factura.');
      return;
    }

    setCargando(true);
    try {
      const { data, warning } = await revertirFactura(factura.id, motivo.trim());

      // Informar al componente padre que la factura fue anulada
      onRevertida?.(data);

      // Mostrar advertencia de caja si aplica
      if (warning === 'PAGO_REVERTIDO_SIN_CAJA') {
        Alert.alert(
          '⚠️ Atención',
          'La deuda fue revertida correctamente, pero no había caja abierta.\n\nEl egreso deberá asentarse manualmente en la próxima caja.',
          [{ text: 'Entendido' }],
        );
      } else {
        Alert.alert('Listo', `Factura #${factura.id} revertida correctamente.`);
      }
    } catch (error) {
      const status = error?.response?.status;
      const mensaje = error?.response?.data?.message;

      if (status === 409) {
        Alert.alert('Sin efecto', 'Esta factura ya estaba anulada.');
      } else if (status === 401) {
        Alert.alert('Sin permiso', 'No tenés autorización para revertir pagos.');
      } else {
        Alert.alert('Error', mensaje ?? 'No se pudo revertir la factura. Intentá de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  };

  const puedeRevertir = ESTADOS_REVERSIBLES.includes(factura.estado);

  return (
    <View style={styles.container}>
      {/* ... resto del detalle de la factura ... */}

      {puedeRevertir && (
        <TouchableOpacity
          style={[styles.botonRevertir, cargando && styles.botonDeshabilitado]}
          onPress={confirmarReversion}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoBoton}>
              {factura.estado === 'COBRADA' ? 'Revertir pago' : 'Anular factura'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {factura.estado === 'ANULADA' && (
        <View style={styles.badgeAnulada}>
          <Text style={styles.textoBadge}>ANULADA</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  botonRevertir: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botonDeshabilitado: { opacity: 0.5 },
  textoBoton: { color: '#fff', fontWeight: '700', fontSize: 16 },
  badgeAnulada: {
    backgroundColor: '#6B7280',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  textoBadge: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
```

---

## 7. Cartel de advertencia

Cuando `data.warning === 'PAGO_REVERTIDO_SIN_CAJA'`, la reversión **fue exitosa contablemente** pero el movimiento de egreso en caja **no pudo registrarse** porque no hay caja abierta.

### Componente reutilizable `SinCajaWarning`

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Mostrar cuando response.data.warning === 'PAGO_REVERTIDO_SIN_CAJA'
 */
export const SinCajaWarning = () => (
  <View style={styles.banner}>
    <Text style={styles.icono}>⚠️</Text>
    <View style={styles.textContainer}>
      <Text style={styles.titulo}>Egreso pendiente en caja</Text>
      <Text style={styles.cuerpo}>
        Se revirtió la deuda del cliente, pero no había caja abierta.
        El egreso debe asentarse manualmente en la próxima apertura de caja.
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  icono: { fontSize: 20, marginRight: 10 },
  textContainer: { flex: 1 },
  titulo: { fontWeight: '700', color: '#92400E', marginBottom: 2 },
  cuerpo: { color: '#78350F', fontSize: 13, lineHeight: 18 },
});
```

---

## 8. Actualización automática de mesas

Cuando el backend revierte una factura con mesa/grupo asignado, emite los eventos correctos **después** del commit (garantía de consistencia). El frontend **no necesita refetch manual** si ya está suscrito a los eventos de mesas.

### Checklist de suscripciones esperadas

| Evento | Sala | Acción en el store |
|--------|------|--------------------|
| `mesa:estado-cambiado` | `mesas` | Actualizar `estado` e `idClienteActual` de la mesa |
| `mesas:lista-completa` | `mesas` | Reemplazar la lista completa (grupos) |
| `pago:revertido` | `pedidos` | Marcar factura como `ANULADA` en el store local |

### Ejemplo de reducer (Redux Toolkit)

```javascript
// facturasSlice.js
import { createSlice } from '@reduxjs/toolkit';

const facturasSlice = createSlice({
  name: 'facturas',
  initialState: { lista: [] },
  reducers: {
    marcarFacturaAnulada(state, action) {
      const { idFactura } = action.payload;
      const factura = state.lista.find((f) => f.id === idFactura);
      if (factura) {
        factura.estado = 'ANULADA';
      }
    },
  },
});

export const { marcarFacturaAnulada } = facturasSlice.actions;
export default facturasSlice.reducer;
```

```javascript
// mesasSlice.js
import { createSlice } from '@reduxjs/toolkit';

const mesasSlice = createSlice({
  name: 'mesas',
  initialState: { lista: [] },
  reducers: {
    actualizarEstadoMesa(state, action) {
      const { idMesa, estado, idClienteActual } = action.payload;
      const mesa = state.lista.find((m) => m.idMesa === idMesa);
      if (mesa) {
        mesa.estado = estado;
        mesa.idClienteActual = idClienteActual;
      }
    },
    reemplazarListaMesas(state, action) {
      state.lista = action.payload;
    },
  },
});

export const { actualizarEstadoMesa, reemplazarListaMesas } = mesasSlice.actions;
export default mesasSlice.reducer;
```

---

## 9. Manejo de errores

| `error.response.status` | `error.response.data.message` (aprox.) | Qué mostrar al usuario |
|------------------------|----------------------------------------|------------------------|
| `400` | "El motivo de reversión es obligatorio" | Input inline bajo el campo de motivo |
| `400` | "No se puede revertir una factura en estado X" | Banner de error con el estado actual |
| `404` | "No existe una factura con ID X" | Toast/snackbar de error genérico |
| `409` | "La factura ya está anulada..." | Badge "ANULADA" ya visible, sin acción extra |
| `401` | — | Redirigir al login |
| `500` | "Error interno del servidor" | Banner de error con botón "Reintentar" |

---

## 10. Diagrama de flujo completo

```
Usuario presiona "Revertir pago"
        │
        ▼
Alert.prompt(motivo)
        │
        ├── Sin motivo → mostrar error inline, no llamar API
        │
        ▼
POST /api/transacciones/revertir/:id  { motivo }
        │
        ├── 404 → "Factura no encontrada"  
        ├── 409 → "Ya estaba anulada"
        ├── 401 → Redirigir al login
        ├── 500 → Banner error + reintentar
        │
        ▼ 200 OK
   response.data.data
        │
        ├── warning === 'PAGO_REVERTIDO_SIN_CAJA'
        │       └── Alert naranja: asentar egreso manualmente
        │
        └── sin warning
                └── Alert verde: "Revertida correctamente"

        ▼ (en paralelo, vía WebSocket)

   evento 'pago:revertido'  ──► store: marcarFacturaAnulada
   evento 'mesa:estado-cambiado' ──► store: actualizarEstadoMesa
   evento 'mesas:lista-completa' ──► store: reemplazarListaMesas
```
