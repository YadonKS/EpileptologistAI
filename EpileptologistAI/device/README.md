# Device Module

This module documents and scaffolds the hardware side of EpileptologistAI.

## Submodules

- `amp/` - external EEG amplifier/ADC module path documentation
- `adc/` - custom analog front-end + ADC path documentation
- `firmware/` - firmware templates and Arduino sketches
- `edge/` - edge runtime notes for on-device inference forwarding

## Hardware paths

### 1) External amplifier path (`device/amp`)

Use dedicated EEG ADC front-ends (for example ADS1299-class solutions) to reduce analog design complexity and speed up prototyping.

### 2) Custom ADC path (`device/adc`)

Use custom analog filtering/amplification and ADC acquisition when you need lower BOM or tighter control of the signal chain.

## Firmware highlights

Firmware examples stream 6 bipolar channels at 256 Hz to match AI pipeline expectations:
- `FP1-F7`
- `F7-T7`
- `T7-P7`
- `FP2-F8`
- `F8-T8`
- `T8-P8`

See:
- `firmware/eeg_reader/eeg_reader.ino`
- `firmware/signal_test/signal_test.ino`
- `firmware/src/main.c` for hardware-path skeleton

## Integration contract

For software compatibility across hardware variants, keep these stable:
- sampling rate
- channel ordering
- packet framing
- timestamp and sequence behavior

## Safety note

This repository is for research/demo prototyping only. Any real patient-connected system requires medically compliant electrical isolation, validation, and regulatory review.
