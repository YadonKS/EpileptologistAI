# Hardware Requirements and Recommendations

- EEG cap: number of channels (8/16/32), electrode type (wet/dry)
- Amplifier: low-noise, differential input, driven right leg, ADS1299 or similar for high channel counts
- MCU: for simple sampling + comms (ESP32, nRF52840)
- Edge device: Raspberry Pi 4 / Jetson Nano for inference
- Power and isolation: patient safety requires galvanic isolation between mains-powered devices and patient contact.

Prototype with dev kits and off-the-shelf EEG front-ends when possible.
