/*
 * EEG Reader Firmware for Arduino Due
 * =====================================
 * Reads 6 EEG channels from two ADS7828 ADC chips via I2C and streams
 * comma-separated voltage values over USB serial at 256 Hz.
 *
 * Hardware layout:
 *   PCB1 (left):  FP1=CH0, F7=CH1, T7=CH2, P7=CH3  → Wire  (I2C0): SDA=D20, SCL=D21
 *   PCB2 (right): FP2=CH0, F8=CH1, T8=CH2, P8=CH3  → Wire1 (I2C1): SDA=PA17, SCL=PA18
 *   Reference: A1 (left mastoid) shared by both PCBs
 *   Both ADS7828 chips are at I2C address 0x48.
 *
 * Serial output format (115200 baud, 256 Hz):
 *   "FP1-F7, F7-T7, T7-P7, FP2-F8, F8-T8, T8-P8\n"
 *   Bipolar differences matching dataset indices 0,1,2,12,13,14
 *   Values in volts.
 *
 * ADS7828 command byte:
 *   [SD C2 C1 C0 0 PD1 PD0 0]
 *   SD=1 → single-ended, PD1PD0=11 → internal ref ON + ADC ON
 *   Channel mux order (ADS7828 datasheet Table 1):
 *     CH0: 000 → 0x8C    CH4: 010 → 0xAC
 *     CH1: 100 → 0xCC    CH5: 110 → 0xEC
 *     CH2: 001 → 0x9C    CH6: 011 → 0xBC
 *     CH3: 101 → 0xDC    CH7: 111 → 0xFC
 */

#include <Wire.h>

// ─── Config ────────────────────────────────────────────────────────────────
#define ADS7828_ADDR    0x48       // I2C address (A0=A1=0)
#define VREF            2.5f       // ADS7828 internal reference voltage (V)
#define ADC_MAX         4095.0f    // 12-bit full scale
#define SAMPLE_RATE_HZ  256        // target sample rate
#define SAMPLE_PERIOD_US 3906      // 1 000 000 / 256 ≈ 3906 µs

// ADS7828 single-ended command bytes (SD=1, PD1=1, PD0=1)
static const uint8_t CMD_CH[8] = {
  0x8C,  // CH0
  0xCC,  // CH1
  0x9C,  // CH2
  0xDC,  // CH3
  0xAC,  // CH4
  0xEC,  // CH5
  0xBC,  // CH6
  0xFC   // CH7
};

// ─── Read one channel from an ADS7828 ──────────────────────────────────────
// Returns raw 12-bit value (0–4095), or -1 on I2C error.
static int16_t ads7828_read(TwoWire &bus, uint8_t addr, uint8_t channel) {
  // Send conversion command
  bus.beginTransmission(addr);
  bus.write(CMD_CH[channel]);
  if (bus.endTransmission(false) != 0) {
    return -1;  // NACK or bus error
  }

  // Request 2 result bytes
  if (bus.requestFrom(addr, (uint8_t)2) != 2) {
    return -1;
  }

  uint8_t hi = bus.read();
  uint8_t lo = bus.read();

  // Result is in the upper 12 bits: shift right by 4
  return (int16_t)(((uint16_t)hi << 8 | lo) >> 4);
}

// ─── Convert raw ADC count to voltage ──────────────────────────────────────
static inline float to_volts(int16_t raw) {
  if (raw < 0) return 0.0f;
  return (raw / ADC_MAX) * VREF;
}

// ─── Arduino setup ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("EEG_READY");

  // I2C bus 0 → PCB1 (4 channels)
  Wire.begin();
  Wire.setClock(400000);   // 400 kHz fast mode

  // I2C bus 1 → PCB2 (2 channels)
  Wire1.begin();
  Wire1.setClock(400000);
}

// ─── Arduino loop ──────────────────────────────────────────────────────────
void loop() {
  static uint32_t next_sample_us = 0;

  uint32_t now = micros();
  if ((int32_t)(now - next_sample_us) < 0) {
    return;  // not yet time for the next sample
  }
  next_sample_us = now + SAMPLE_PERIOD_US;

  // ── PCB1 (left): FP1=CH0, F7=CH1, T7=CH2, P7=CH3 via Wire (I2C0) ──
  float fp1 = to_volts(ads7828_read(Wire,  ADS7828_ADDR, 0));
  float f7  = to_volts(ads7828_read(Wire,  ADS7828_ADDR, 1));
  float t7  = to_volts(ads7828_read(Wire,  ADS7828_ADDR, 2));
  float p7  = to_volts(ads7828_read(Wire,  ADS7828_ADDR, 3));

  // ── PCB2 (right): FP2=CH0, F8=CH1, T8=CH2, P8=CH3 via Wire1 (I2C1) ──
  float fp2 = to_volts(ads7828_read(Wire1, ADS7828_ADDR, 0));
  float f8  = to_volts(ads7828_read(Wire1, ADS7828_ADDR, 1));
  float t8  = to_volts(ads7828_read(Wire1, ADS7828_ADDR, 2));
  float p8  = to_volts(ads7828_read(Wire1, ADS7828_ADDR, 3));

  // ── Bipolar channels matching dataset indices ──
  // idx0: FP1-F7, idx1: F7-T7, idx2: T7-P7
  // idx12: FP2-F8, idx13: F8-T8, idx14: T8-P8
  float ch0 = fp1 - f7;
  float ch1 = f7  - t7;
  float ch2 = t7  - p7;
  float ch3 = fp2 - f8;
  float ch4 = f8  - t8;
  float ch5 = t8  - p8;

  // Stream CSV line at 115200 baud (format expected by serial_receiver.py)
  Serial.print(ch0, 6); Serial.print(',');
  Serial.print(ch1, 6); Serial.print(',');
  Serial.print(ch2, 6); Serial.print(',');
  Serial.print(ch3, 6); Serial.print(',');
  Serial.print(ch4, 6); Serial.print(',');
  Serial.println(ch5, 6);
}
