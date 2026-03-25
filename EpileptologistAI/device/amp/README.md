# Amplifier / Front-end

This directory holds notes and reference designs for the external EEG amplifier / ADC front-end option.

When to choose the external amplifier path
- Use off-the-shelf amplifier/ADC modules (e.g., ADS1299) when you want fewer design iterations and simultaneous-sampling ADCs tuned for EEG.

Goals:
- Low-noise, high input impedance front-end
- Right-leg drive or driven-right-leg circuit for reference
- AC coupling and anti-aliasing filters
- Gain selection and programmable gain amplifier (PGA)

Files to add:
- `schematic.svg` — schematic drawing (placeholder)
- `bom.md` — bill of materials and recommended parts (amplifier/ADC modules, connectors)
- `safety.md` — isolation and patient-safety design guidance

Note on the repo layout
- This repo supports two hardware paths: `device/amp/` (external amplifier modules) and `device/adc/` (custom analog front-end + MCU or discrete ADCs). See `device/firmware/` for firmware templates that let you select the path via build flags.

Start with commercial EEG amplifier modules for faster prototyping and move to custom ADCs when you need specific analog chain control.
