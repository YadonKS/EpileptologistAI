# Custom ADC / Direct MCU ADC

This folder contains guidance, reference schematics, and notes for the path where a custom analog front-end and ADC (discrete or MCU-integrated) are used instead of a dedicated commercial EEG amplifier module.

When to choose this path
- You want tighter control over the analog chain (filtering, gain stages) and choose ADC parts or MCU ADCs directly.
- You need lower BOM cost for low-channel prototypes and are comfortable designing patient-safety circuitry.

Key design considerations
- Input protection and isolation: patient safety rules apply. Provide high-input impedance, DC blocking, series resistors, and patient isolation where required.
- Anti-aliasing filter: design an analog low-pass (or multi-stage) before the ADC to avoid aliasing at your sampling rate.
- ADC selection: choose ADCs with appropriate resolution (>=16-bit preferred for EEG) and sampling rates. Options include discrete ADC ICs over SPI/I2C or using high-quality MCU ADCs with external reference.
- Channel counts & multiplexing: for many channels, consider external multi-channel ADCs or simultaneous-sampling ADC arrays.

Suggested files to add here
- `schematic.svg` — analog front-end schematic and connector layout
- `bom.md` — recommended parts for amplifier stages and ADCs
- `firmware/` — ADC-specific sampling examples and calibration helpers

Notes
- For prototyping, consider using evaluation modules (EVMs) or breakout ADCs to avoid re-spinning PCBs until you validate the design.
- For clinical use, consult certified medical device electrical engineers and follow regulatory standards.
