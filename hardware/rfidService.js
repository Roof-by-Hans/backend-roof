// Servicio para interactuar con un lector RFID vía Arduino por puerto serie
// Requisitos: paquete "serialport" instalado y Arduino enviando líneas con formato "UID: A1B2C3D4"

const EventEmitter = require("events");

let SerialPort, ReadlineParser;
try {
  ({ SerialPort } = require("serialport"));
  ({ ReadlineParser } = require("@serialport/parser-readline"));
} catch (e) {
  // Si no está instalado, el servicio quedará en modo inactivo
}

class RfidService extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
    this.ready = false;
    this.lastUid = null;
    this.connecting = false;
  }

  isReady() {
    return !!this.ready;
  }

  async autoDetectPort() {
    console.log("[rfidService] Iniciando detección automática de puertos...");
    if (!SerialPort || !SerialPort.list) {
      console.log("[rfidService] SerialPort.list no disponible");
      return null;
    }
    try {
      const ports = await SerialPort.list();
      console.log(
        "[rfidService] Puertos disponibles:",
        ports.map((p) => ({
          path: p.path,
          manufacturer: p.manufacturer,
          friendlyName: p.friendlyName,
        }))
      );

      // Heurística: preferir Arduino/ttyACM/ttyUSB
      const candidate = ports.find((p) =>
        /arduino|usb|acm|ch340|cp210/i.test(
          `${p.manufacturer} ${p.friendlyName} ${p.path}`
        )
      );
      console.log(
        "[rfidService] Puerto candidato encontrado:",
        candidate?.path || "ninguno"
      );
      return candidate ? candidate.path : null;
    } catch (err) {
      console.error("[rfidService] Error detectando puertos:", err);
      return null;
    }
  }

  async connect({ path, baudRate } = {}) {
    console.log("[rfidService.connect] INICIO - Parámetros:", {
      path,
      baudRate,
    });
    if (this.connecting || this.ready) {
      console.log(
        "[rfidService.connect] Ya conectado o conectando, retornando:",
        this.ready
      );
      return this.ready;
    }
    this.connecting = true;

    if (!SerialPort) {
      console.error("[rfidService.connect] ERROR - SerialPort no disponible");
      this.connecting = false;
      this.ready = false;
      this.emit(
        "error",
        new Error(
          "serialport no instalado. Ejecute 'npm install serialport @serialport/parser-readline'"
        )
      );
      return false;
    }

    const resolvedPath =
      path || process.env.RFID_SERIAL_PATH || (await this.autoDetectPort());
    const resolvedBaud = Number(baudRate || process.env.RFID_BAUD || 115200);

    console.log("[rfidService.connect] Puerto resuelto:", resolvedPath);
    console.log("[rfidService.connect] Baud rate resuelto:", resolvedBaud);

    if (!resolvedPath) {
      console.error(
        "[rfidService.connect] ERROR - No se encontró puerto serie"
      );
      this.connecting = false;
      this.ready = false;
      this.emit(
        "error",
        new Error(
          "No se encontró puerto serie para el lector RFID. Configure RFID_SERIAL_PATH."
        )
      );
      return false;
    }

    try {
      console.log("[rfidService.connect] Creando puerto serie...");
      this.port = new SerialPort({
        path: resolvedPath,
        baudRate: resolvedBaud,
      });
      this.parser = this.port.pipe(new ReadlineParser({ delimiter: "\n" }));

      // Esperar a que el puerto se abra antes de continuar
      await new Promise((resolve, reject) => {
        const openTimeout = setTimeout(() => {
          reject(new Error("Timeout al abrir puerto serie"));
        }, 5000);

        this.port.on("open", () => {
          clearTimeout(openTimeout);
          this.ready = true;
          this.connecting = false;
          console.log(
            "[rfidService.connect] Puerto serie abierto exitosamente"
          );
          this.emit("ready", { path: resolvedPath, baudRate: resolvedBaud });
          resolve();
        });

        this.port.on("error", (err) => {
          clearTimeout(openTimeout);
          this.ready = false;
          this.connecting = false;
          this.emit("error", err);
          reject(err);
        });
      });

      // Configurar event handlers para después de abrir
      this.port.on("error", (err) => {
        this.ready = false;
        this.connecting = false;
        this.emit("error", err);
      });

      this.port.on("close", () => {
        this.ready = false;
        this.emit("close");
        // reintento simple
        setTimeout(
          () => this.connect({ path: resolvedPath, baudRate: resolvedBaud }),
          3000
        );
      });

      // Parseo de líneas "UID: XXXXXXXX"
      this.parser.on("data", (line) => {
        const text = String(line).trim();
        const match = text.match(/uid\s*:\s*([0-9a-fA-F]+)/i);
        if (match && match[1]) {
          const uid = match[1].toUpperCase();
          this.lastUid = uid;
          this.emit("card", uid);
        }
      });

      return true;
    } catch (err) {
      console.error("[rfidService.connect] ERROR:", err.message);
      this.connecting = false;
      this.ready = false;
      this.emit("error", err);
      return false;
    }
  }

  async readOnce(timeoutMs = 10000) {
    console.log("[rfidService.readOnce] INICIO - Timeout:", timeoutMs);
    console.log("[rfidService.readOnce] Estado actual:", {
      ready: this.ready,
      connecting: this.connecting,
      port: !!this.port,
      portPath: this.port?.path,
    });

    if (!this.ready && !this.connecting) {
      console.log("[rfidService.readOnce] Iniciando conexión...");
      const connected = await this.connect();
      if (!connected) {
        console.error("[rfidService.readOnce] ERROR - No se pudo conectar");
        throw new Error("No se pudo conectar al lector RFID");
      }
    }

    // Esperar a que esté ready si todavía está conectando
    if (this.connecting) {
      console.log(
        "[rfidService.readOnce] Esperando a que finalice la conexión..."
      );
      await new Promise((resolve) => {
        const checkReady = setInterval(() => {
          if (this.ready || !this.connecting) {
            clearInterval(checkReady);
            resolve();
          }
        }, 100);
      });
    }

    if (!this.ready) {
      console.error("[rfidService.readOnce] ERROR - Lector RFID no disponible");
      throw new Error("Lector RFID no disponible");
    }

    console.log("[rfidService.readOnce] Enviando comando SCAN...");
    try {
      this.port.write("SCAN\n");
      console.log("[rfidService.readOnce] Comando SCAN enviado correctamente");
    } catch (err) {
      console.error("[rfidService.readOnce] ERROR enviando SCAN:", err);
    }

    return new Promise((resolve, reject) => {
      let timer;
      const onCard = (uid) => {
        console.log(
          "[rfidService.readOnce] Tarjeta detectada via evento 'card':",
          uid
        );
        clearTimeout(timer);
        this.off("card", onCard);
        resolve(uid);
      };
      this.on("card", onCard);
      timer = setTimeout(() => {
        console.log("[rfidService.readOnce] TIMEOUT - No se detectó tarjeta");
        this.off("card", onCard);
        reject(new Error("Tiempo de espera agotado. No se detectó tarjeta."));
      }, timeoutMs);
    });
  }
}

const rfidService = new RfidService();

module.exports = { rfidService };
