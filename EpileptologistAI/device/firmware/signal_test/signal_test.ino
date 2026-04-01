/*
 * Signal Test — Arduino Due ADC Pin Monitor
 * ==========================================
 * Reads the 8 analog pins (A0–A7 / D54–D61) directly using the Due's
 * built-in 12-bit ADC and streams values to the Serial Plotter.
 *
 * Pin mapping (from ADS7828 PCB schematic):
 *   A0 (D54) → ADC[0] / PA16
 *   A1 (D55) → ADC[1] / PA24
 *   A2 (D56) → ADC[2] / PA23
 *   A3 (D57) → ADC[3] / PA22
 *   A4 (D58) → ADC[4] / PA6
 *   A5 (D59) → ADC[5] / PA4
 *   A6 (D60) → ADC[6] / PA3
 *   A7 (D61) → ADC[7] / PA2
 *
 * Usage:
 *   1. Flash this sketch to the Arduino Due.
 *   2. Open Serial Monitor (115200 baud) to see raw values.
 *      OR open Serial Plotter to see live waveforms.
 *   3. First line printed is the column header for the Plotter.
 *
 * Arduino Due specs:
 *   - 12-bit ADC  → raw range 0–4095
 *   - 3.3 V reference (AREF = 3.3 V)
 *   - Voltage = raw * (3.3 / 4095)
 */

// ─── Config ────────────────────────────────────────────────────────────────
#define SAMPLE_RATE_HZ   256            // match EEG firmware rate
#define SAMPLE_PERIOD_US (1000000 / SAMPLE_RATE_HZ)  // 3906 µs
#define VREF             3.3f
#define ADC_MAX          4095.0f
#define N_PINS           8

// Analog pins to sample (A0–A7 on Arduino Due)
static const uint8_t PINS[N_PINS] = { A0, A1, A2, A3, A4, A5, A6, A7 };

// Human-readable labels shown in Serial Plotter legend
static const char* LABELS[N_PINS] = {
  "A0/PA16",
  "A1/PA24",
  "A2/PA23",
  "A3/PA22",
  "A4/PA6",
  "A5/PA4",
  "A6/PA3",
  "A7/PA2"
};

// ─── Setup ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  while (!Serial) {}          // wait for USB Serial on Due

  // Arduino Due supports 12-bit ADC resolution
  analogReadResolution(12);

  // Print header line — Serial Plotter uses this for channel labels
  for (uint8_t i = 0; i < N_PINS; i++) {
    Serial.print(LABELS[i]);
    if (i < N_PINS - 1) Serial.print('\t');
  }
  Serial.println();

  Serial.println("TEST_READY");
}

// ─── Loop ──────────────────────────────────────────────────────────────────
void loop() {
  static uint32_t next_us = 0;

  uint32_t now = micros();
  if ((int32_t)(now - next_us) < 0) {
    return;  // busy-wait until next sample window
  }
  next_us = now + SAMPLE_PERIOD_US;

  // Read all 8 pins and print tab-separated voltages (Serial Plotter friendly)
  for (uint8_t i = 0; i < N_PINS; i++) {
    int raw = analogRead(PINS[i]);
    float volts = (raw / ADC_MAX) * VREF;
    Serial.print(volts, 4);
    if (i < N_PINS - 1) Serial.print('\t');
  }
  Serial.println();
}
