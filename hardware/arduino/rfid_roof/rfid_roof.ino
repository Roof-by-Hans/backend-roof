#include <SPI.h>
#include <MFRC522.h>

// RC522 -> Nano: SDA(SS)=10, SCK=13, MOSI=11, MISO=12, RST=9
constexpr uint8_t SS_PIN = 10;
constexpr uint8_t RST_PIN = 9;
MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long lastPrint = 0;
bool forceScan = true;

void setup() {
  Serial.begin(115200);
  while (!Serial) { ; }
  SPI.begin();
  mfrc522.PCD_Init();
  delay(50);
  Serial.println("RFID RC522 listo");
}

String toHex(byte *buffer, byte size) {
  String s = "";
  for (byte i = 0; i < size; i++) {
    if (buffer[i] < 0x10) s += "0";
    s += String(buffer[i], HEX);
  }
  s.toUpperCase();
  return s;
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();
    if (cmd == "SCAN") {
      forceScan = true;
    }
  }

  if (!mfrc522.PICC_IsNewCardPresent()) {
    if (!forceScan) return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  String uid = toHex(mfrc522.uid.uidByte, mfrc522.uid.size);
  if (uid.length() > 0) {
    Serial.print("UID: ");
    Serial.println(uid);
    lastPrint = millis();
    forceScan = false;
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
