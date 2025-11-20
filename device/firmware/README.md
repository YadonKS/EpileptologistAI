# Firmware (microcontroller)

Purpose: sample ADC data from EEG electrodes via amplifier (or direct ADC with protection), send framed packets over UART/SPI/I2C/USB/BLE to an edge device or mobile app.

Suggested contents:
- `src/` C/C++ firmware for common MCUs (ESP32, nRF52, STM32) that configures ADC, sampling timer, and comms.
- `hardware/` pin mapping and BOM notes.

Important considerations:
- Sampling rate: 250-2000 Hz depending on channels and needed bandwidth.
- Input protection and patient safety: isolation, current limiting, and compliance with medical safety standards (IEC 60601).
- Data format: apply filtering (optional), sample packing, timestamps, and sequence numbers.

Templates:
- `src/main.c` — minimal sampling + serial transmission example.

Disclaimer: This repo is a prototype scaffold. For any real medical use, consult regulatory and safety experts.

Options and switching
---------------------

This firmware area now supports two common hardware patterns:

- External amplifier front-end: MCU receives digital data (SPI/I2C/parallel) or serial output from a dedicated EEG amplifier (e.g., ADS1299 or similar ADC+AFE). Use the `AMP` code path in `src/`.
- Custom ADC circuit + MCU ADC: MCU reads analog signals directly from the amplifier/anti-aliasing stage or from discrete ADC chips (I2C/SPI). Use the `ADC` code path in `src/`.

Implementation notes
---------------------

- Use compile-time macros or build configurations to select the firmware path (e.g., `-DUSE_EXTERNAL_AMP` vs `-DUSE_CUSTOM_ADC`).
- Keep data framing identical between paths: identical timestamping, sequence numbers, channel ordering, and packet formats to make the edge/backend integration transparent regardless of hardware.
- Provide example functions in `src/main.c` for both `init_amp()/read_amp()` and `init_adc()/read_adc()` as templates.

Files to add/extend:
- `src/config.h` — define hardware selection macros
- `src/amp_driver.c` — example drivers for reading from ADC-equipped amplifier chips
- `src/adc_driver.c` — example drivers for MCU ADC or external ADC ICs

Safety reminder: always include patient-isolation guidance and consult medical device engineers when wiring patient-connected electrodes.
