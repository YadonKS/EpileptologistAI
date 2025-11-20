# System Architecture

High-level components:

-- EEG Cap + Amplifier/ADC + MCU: captures electrode voltages, protects patient, streams framed data.

Hardware options:

- External amplifier/ADC module: dedicated EEG ADCs (ADS1299-style) provide simultaneous sampling and are usually easier to integrate. This is represented in `device/amp/`.
- Custom analog front-end + ADC: discrete amplifier stages and MCU ADCs or discrete ADC chips give full analog-chain control; see `device/adc/` and the firmware `ADC` path in `device/firmware/`.
- Edge Device: receives data, pre-processes, runs inference locally for real-time detection, and forwards events to backend.
- Backend: device registry, telemetry ingestion, event storage, and user authentication.
- Frontend: different UIs for mobile (PWA/React Native) and web (browser) showing tailored views.

Data flow:
1. ADC samples -> MCU packs frames -> sends to Edge (BLE/Wi‑Fi/USB)
2. Edge preprocesses, runs model -> raised events + confidence
3. Edge pushes events to backend and/or pushes summarized data to the frontend
4. Frontend displays events; mobile view emphasizes immediate actions and alerts.

Security:
- Authenticate devices; use TLS for transport.
- Minimize PHI stored; anonymize or encrypt sensitive data at rest.
