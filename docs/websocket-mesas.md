## WebSockets - Mesas (Documentación para Frontend React Native)

Esta documentación explica cómo integrar el frontend **React Native** con el backend WebSocket para recibir y enviar actualizaciones en tiempo real relacionadas con las "mesas". Usa Socket.IO client compatible con React Native.

### Resumen rápido

- Endpoint: el servidor usa Socket.IO. Conéctate al mismo host/dominio donde corre la API (el servidor HTTP que inicializa Socket.IO).
- Autenticación: opcional. Puedes enviar token JWT en `auth.token` al conectar o en la cabecera `Authorization: Bearer <token>`. Si no se envía token, la conexión será de invitado.
- Salas (rooms): `mesas` (general) y `mesa:<id>` (sala por mesa).

---

## Contrato mínimo (inputs/outputs)

- Conexión: Socket.IO client -> server
- Inputs principales (client -> server):
  - `join:mesas` (sin payload) — unirse a la sala general.
  - `leave:mesas` (sin payload) — salir de la sala general.
  - `join:mesa` { mesaId } — unirse a sala `mesa:<mesaId>`.
  - `leave:mesa` { mesaId } — salir de sala `mesa:<mesaId>`.
  - `mesas:get-connected-clients` (sin payload) — solicitar lista de clientes conectados a la sala `mesas`.
  - `mesa:get-estado` { mesaId } — solicitar estado actual de una mesa.

- Outputs (server -> client) (suscríbete a estos eventos):
  - `mesa:creada` — notifica creación de mesa
  - `mesa:actualizada` — notifica actualización de mesa (también emitido en sala `mesa:<id>`)
  - `mesa:eliminada` — notifica eliminación
  - `mesa:estado-cambiado` — cambio en estado de ocupación
  - `mesas:actualizar` — solicitar a clientes una actualización masiva
  - `notificacion` — notificaciones generales a sala `mesas`
  - `joined:mesas`, `left:mesas`, `joined:mesa`, `left:mesa` — respuestas a las acciones de join/leave
  - `mesas:connected-clients` — respuesta a `mesas:get-connected-clients`
  - `mesa:estado` — respuesta a `mesa:get-estado`

---

## Esquemas de payload (ejemplos)

- `mesa:creada`
  {
    message: String,
    data: { idMesa, nombreMesa, grupo, ... },
    timestamp: ISOString
  }

- `mesa:actualizada`
  {
    message: String,
    data: { idMesa, nombreMesa, grupo, ... },
    timestamp: ISOString
  }

- `mesa:eliminada`
  {
    message: String,
    data: { id: idMesa },
    timestamp: ISOString
  }

- `mesa:estado-cambiado`
  {
    message: String,
    data: { id: idMesa, estado: { ocupada: Boolean, reservado: Boolean, ... } },
    timestamp: ISOString
  }

- `mesas:actualizar` (sin data, solo indica que deben refrescar listados)
  {
    message: String,
    timestamp: ISOString
  }

- `notificacion`
  {
    message: String,
    type: String, // info|warning|error|success
    timestamp: ISOString
  }

- `joined:mesas` / `left:mesas` / `joined:mesa` / `left:mesa` (respuestas)
  {
    message: String,
    mesaId?: Number,
    userId?: Number | null,
    timestamp: ISOString
  }

- `mesas:connected-clients`
  {
    count: Number,
    clients: [ { id: socketId, userId, userRole } ]
  }

- `mesa:estado` (respuesta a `mesa:get-estado`)
  {
    mesaId: Number,
    message: String,
    /* Podrías añadir aquí datos reales de la mesa si el backend los proporciona */
    timestamp: ISOString
  }

---

## Instalación en React Native

Primero, instala el cliente de Socket.IO compatible con React Native:

```bash
npm install socket.io-client
# o
yarn add socket.io-client
```

**Nota importante**: Socket.IO v4+ funciona nativamente en React Native. Si tienes problemas, asegúrate de tener una versión reciente.

---

## Conexión desde React Native (Socket.IO)

Ejemplo básico con `socket.io-client`:

```javascript
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1) Conexión básica (sin token):
const socket = io('https://tu-api.com', {
  transports: ['websocket', 'polling'],
  auth: {
    token: null // o JWT si tienes
  }
});

// 2) Conexión con token JWT (recomendado si quieres identificar al usuario):
const initSocketWithAuth = async () => {
  const token = await AsyncStorage.getItem('token');
  const socketAuth = io('https://tu-api.com', {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socketAuth.on('connect', () => {
    console.log('Conectado, socket id:', socketAuth.id);
  });

  // Manejar eventos globales
  socketAuth.on('mesa:creada', (payload) => {
    // actualizar lista de mesas o mostrar notificación
    console.log('Mesa creada', payload);
  });

  socketAuth.on('mesa:actualizada', (payload) => {
    // actualizar single table state en UI
    console.log('Mesa actualizada', payload);
  });

  socketAuth.on('mesa:eliminada', (payload) => {
    console.log('Mesa eliminada', payload);
  });

  socketAuth.on('mesa:estado-cambiado', (payload) => {
    // actualizar indicador de ocupado/reservado en la UI
    console.log('Estado cambiado', payload);
  });

  // Unirse a la sala general
  socketAuth.emit('join:mesas');

  // Unirse a una mesa específica
  socketAuth.emit('join:mesa', { mesaId: 123 });

  // Solicitar estado de una mesa
  socketAuth.emit('mesa:get-estado', { mesaId: 123 });

  // Manejar reconexión: volver a unirse a salas que interesan
  socketAuth.on('reconnect', (attemptNumber) => {
    console.log('Reconnected after', attemptNumber);
    // reemitir join si es necesario
    socketAuth.emit('join:mesas');
    // volver a unirse a mesas específicas (almacenar lista localmente si la necesitas)
  });

  return socketAuth;
};
```

---

## Hook personalizado para React Native (useMesasSocket)

Este hook maneja la conexión, autenticación, suscripción a eventos y limpieza automática:

```javascript
// hooks/useMesasSocket.js
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'https://tu-api.com'; // o usa una variable de entorno

export function useMesasSocket(options = {}) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mesas, setMesas] = useState([]);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let socket = null;

    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        socketRef.current = socket;

        // Eventos de conexión
        socket.on('connect', () => {
          console.log('✅ Socket conectado:', socket.id);
          setIsConnected(true);
          
          // Unirse automáticamente a la sala de mesas
          socket.emit('join:mesas');
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ Socket desconectado:', reason);
          setIsConnected(false);
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Socket reconectado después de', attemptNumber, 'intentos');
          socket.emit('join:mesas'); // Re-unirse a la sala
        });

        // Confirmación de unión
        socket.on('joined:mesas', (data) => {
          console.log('✅ Unido a sala de mesas:', data);
        });

        // Eventos de mesas
        socket.on('mesa:creada', (payload) => {
          console.log('🆕 Mesa creada:', payload.data);
          setMesas(prev => [...prev, payload.data]);
          // Aquí puedes disparar un toast/notificación
        });

        socket.on('mesa:actualizada', (payload) => {
          console.log('🔄 Mesa actualizada:', payload.data);
          setMesas(prev => 
            prev.map(mesa => 
              mesa.idMesa === payload.data.idMesa ? payload.data : mesa
            )
          );
        });

        socket.on('mesa:eliminada', (payload) => {
          console.log('🗑️ Mesa eliminada:', payload.data.id);
          setMesas(prev => 
            prev.filter(mesa => mesa.idMesa !== payload.data.id)
          );
        });

        socket.on('mesa:estado-cambiado', (payload) => {
          console.log('🔄 Estado de mesa cambiado:', payload.data);
          setMesas(prev => 
            prev.map(mesa => 
              mesa.idMesa === payload.data.id 
                ? { ...mesa, estado: payload.data.estado }
                : mesa
            )
          );
        });

        socket.on('mesas:actualizar', () => {
          console.log('🔄 Solicitud de actualización masiva de mesas');
          // Aquí puedes llamar a tu API REST para recargar todas las mesas
          if (options.onRefreshRequest) {
            options.onRefreshRequest();
          }
        });

        socket.on('notificacion', (payload) => {
          console.log('🔔 Notificación:', payload);
          // Mostrar notificación al usuario
          if (options.onNotification) {
            options.onNotification(payload);
          }
        });

        socket.on('error', (error) => {
          console.error('⚠️ Error de socket:', error);
        });

      } catch (error) {
        console.error('Error al inicializar socket:', error);
      }
    };

    initSocket();

    // Manejar cuando la app pasa a background/foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // La app volvió a foreground, reconectar si es necesario
        if (socket && !socket.connected) {
          socket.connect();
        }
      }
      appState.current = nextAppState;
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.emit('leave:mesas');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('reconnect');
        socket.off('joined:mesas');
        socket.off('mesa:creada');
        socket.off('mesa:actualizada');
        socket.off('mesa:eliminada');
        socket.off('mesa:estado-cambiado');
        socket.off('mesas:actualizar');
        socket.off('notificacion');
        socket.off('error');
        socket.disconnect();
      }
      subscription?.remove();
    };
  }, []); // Solo se ejecuta una vez al montar

  // Funciones auxiliares para emitir eventos
  const joinMesa = (mesaId) => {
    if (socketRef.current) {
      socketRef.current.emit('join:mesa', { mesaId });
    }
  };

  const leaveMesa = (mesaId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave:mesa', { mesaId });
    }
  };

  const getEstadoMesa = (mesaId) => {
    if (socketRef.current) {
      socketRef.current.emit('mesa:get-estado', { mesaId });
    }
  };

  const getConnectedClients = () => {
    if (socketRef.current) {
      socketRef.current.emit('mesas:get-connected-clients');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    mesas,
    setMesas,
    joinMesa,
    leaveMesa,
    getEstadoMesa,
    getConnectedClients
  };
}
```

---

## Ejemplo de uso en un componente React Native

```javascript
// screens/MesasScreen.js
import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { useMesasSocket } from '../hooks/useMesasSocket';

export default function MesasScreen() {
  const { 
    isConnected, 
    mesas, 
    setMesas,
    joinMesa,
    leaveMesa 
  } = useMesasSocket({
    onRefreshRequest: async () => {
      // Llamar a tu API REST para recargar mesas
      console.log('Refrescando mesas desde API...');
      // const response = await api.getMesas();
      // setMesas(response.data);
    },
    onNotification: (notification) => {
      Alert.alert(
        notification.type === 'error' ? 'Error' : 'Notificación',
        notification.message
      );
    }
  });

  useEffect(() => {
    // Cargar mesas iniciales desde tu API REST
    const loadInitialMesas = async () => {
      try {
        // const response = await api.getMesas();
        // setMesas(response.data);
      } catch (error) {
        console.error('Error al cargar mesas:', error);
      }
    };
    
    loadInitialMesas();
  }, []);

  const renderMesa = ({ item }) => (
    <View style={styles.mesaCard}>
      <Text style={styles.mesaNombre}>{item.nombreMesa}</Text>
      <Text style={styles.mesaGrupo}>Grupo: {item.grupo?.nombreGrupo}</Text>
      <Text style={styles.mesaEstado}>
        Estado: {item.estado?.ocupada ? '🔴 Ocupada' : '🟢 Disponible'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesas en Tiempo Real</Text>
        <Text style={styles.status}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </Text>
      </View>
      
      <FlatList
        data={mesas}
        keyExtractor={(item) => item.idMesa.toString()}
        renderItem={renderMesa}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay mesas disponibles</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  status: {
    fontSize: 14
  },
  list: {
    padding: 16
  },
  mesaCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  mesaNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  mesaGrupo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  mesaEstado: {
    fontSize: 14,
    color: '#333'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#999'
  }
});
```

---

## Recomendaciones y buenas prácticas para React Native

- **Token opcional**: el backend permite conexiones anónimas; pero si necesitas acciones protegidas (p. ej. mostrar datos privados), pasa el JWT usando `AsyncStorage`.
- **Manejo de AppState**: Implementa la lógica de reconexión cuando la app vuelve a foreground (`AppState.addEventListener`).
- **Evita procesar cada evento innecesariamente**: usa debounce o throttling para altas frecuencias de eventos.
- **Maneja nil/guest**: `socket.userId` puede ser `null` si el usuario no se autentica.
- **Re-subscribe tras reconexión**: cuando Socket.IO se reconecta, vuelve a emitir `join:mesas` y `join:mesa` para recuperar las salas.
- **Evita memory leaks**: limpia listeners con `socket.off(event, handler)` en el cleanup del useEffect.
- **Control de errores**: el backend emite `error` con `{ message, code }` cuando faltan parámetros; muéstralo al usuario con `Alert` o un Toast.
- **Notificaciones push**: Si necesitas notificaciones mientras la app está cerrada, considera usar Firebase Cloud Messaging (FCM) en conjunto con WebSockets.
- **Context API**: Para apps grandes, considera envolver el socket en un Context para compartir la conexión entre múltiples componentes.
- **Persistencia**: Si necesitas persistir el estado de las mesas, usa AsyncStorage o una solución como Redux Persist.

---

## Ejemplo con Context API (compartir socket globalmente)

Para evitar múltiples conexiones de socket, puedes usar Context:

```javascript
// context/SocketContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket debe usarse dentro de SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSocket = async () => {
      const token = await AsyncStorage.getItem('token');
      const socket = io('https://tu-api.com', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket conectado');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket desconectado');
      });
    };

    initSocket();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    });

    return () => {
      socketRef.current?.disconnect();
      subscription?.remove();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

// Uso en App.js:
// <SocketProvider>
//   <NavigationContainer>
//     <RootNavigator />
//   </NavigationContainer>
// </SocketProvider>

// Uso en cualquier componente:
// const { socket, isConnected } = useSocket();
```

---

## Cómo probar manualmente en React Native

### Opción 1: Usando React Native Debugger o Flipper
1) Abre tu app en modo desarrollo con React Native Debugger o Flipper habilitado.
2) Verifica en la consola que aparezca "✅ Socket conectado" con el socket ID.
3) Comprueba que se emita automáticamente `join:mesas` y recibas `joined:mesas`.
4) Desde tu backend o usando Postman/Thunder Client, crea/actualiza una mesa usando la API REST (que debería disparar el emitter).
5) Observa en la consola del debugger que llegue el evento `mesa:actualizada` o `mesa:creada`.

### Opción 2: Usando logs en la app
1) Implementa `console.log` en todos los listeners de eventos del socket.
2) Ejecuta la app en tu dispositivo o emulador.
3) Usa `npx react-native log-android` o `npx react-native log-ios` para ver logs en tiempo real.
4) Realiza cambios desde el backend y verifica que aparezcan los logs correspondientes.

### Opción 3: Herramienta de prueba externa
1) Puedes usar Socket.IO Client Tool (web) para conectarte al mismo servidor.
2) Conecta con tu URL de backend y envía eventos para simular cambios.
3) Verifica que tu app React Native reciba las actualizaciones.

---

## Errores comunes y soluciones en React Native

- **No recibo eventos**: Verifica que estás en la sala correcta (`join:mesas` o `join:mesa`). Revisa los logs del backend para confirmar que los eventos se están emitiendo.

- **Conexión autenticada no muestra userId**: Asegúrate de enviar `auth.token` al conectar. Verifica que el token esté guardado correctamente en `AsyncStorage`.

- **Duplicado de listeners**: Cada vez que mounts un componente, asegúrate de limpiar listeners en el cleanup del `useEffect` para que no se acumulen.

- **Socket desconectado al pasar a background**: Implementa el listener de `AppState` para reconectar cuando la app vuelva a foreground.

- **Error "Cannot read property 'emit' of null"**: El socket aún no se ha inicializado. Verifica que `socketRef.current` exista antes de emitir eventos.

- **Problemas de CORS en desarrollo**: Si estás usando el emulador/simulador, asegúrate de usar la IP correcta de tu máquina (no `localhost`). En Android, usa `10.0.2.2` para referirte al localhost de tu PC.

- **Latencia alta**: Usa `transports: ['websocket']` en lugar de `['websocket', 'polling']` para forzar WebSocket nativo y mejorar el rendimiento.

---

## Configuración de variables de entorno

Crea un archivo `.env` en la raíz de tu proyecto React Native:

```bash
SOCKET_URL=https://tu-api.com
# o para desarrollo local:
# SOCKET_URL=http://10.0.2.2:3000  # Android emulator
# SOCKET_URL=http://localhost:3000 # iOS simulator
```

Instala `react-native-dotenv`:
```bash
npm install react-native-dotenv
# o
yarn add react-native-dotenv
```

Configura en `babel.config.js`:
```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }]
  ]
};
```

Usa en tu código:
```javascript
import { SOCKET_URL } from '@env';

const socket = io(SOCKET_URL, { ... });
```

---

## Mapa rápido de eventos (resumen)

- Eventos que el frontend puede emitir:
  - `join:mesas`, `leave:mesas`, `join:mesa` ({ mesaId }), `leave:mesa` ({ mesaId }), `mesas:get-connected-clients`, `mesa:get-estado` ({ mesaId })

- Eventos que el frontend debe escuchar:
  - `mesa:creada`, `mesa:actualizada`, `mesa:eliminada`, `mesa:estado-cambiado`, `mesas:actualizar`, `notificacion`, `joined:mesas`, `left:mesas`, `joined:mesa`, `left:mesa`, `mesas:connected-clients`, `mesa:estado`

---

## Notas finales

Esta documentación está optimizada para **React Native**. Si necesitas:

- ✅ Integración con Redux/Redux Toolkit para manejo global de estado
- ✅ Ejemplo de notificaciones push (FCM) combinadas con WebSockets
- ✅ Implementación de optimistic updates (actualizar UI antes de confirmar con servidor)
- ✅ Testing con Jest para el hook de socket
- ✅ TypeScript definitions para los eventos y payloads

Indícame qué necesitas y lo agrego a la documentación.

---

## Recursos adicionales

- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [React Native AppState](https://reactnative.dev/docs/appstate)
- Repositorio del backend: `backend-roof` (rama: `feature/mesas-websocket`)
