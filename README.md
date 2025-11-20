# EpileptologistAI

EpileptologistAI is a multi-part project to gather EEG data from an EEG cap and amplifier, run edge AI-based seizure detection/diagnosis on a device, and present results in a responsive React webapp with tailored views for mobile and browser.

This repository contains scaffolding for:
- `device/` — hardware docs, microcontroller firmware, edge inference runtime.
- `backend/` — API to receive/meter device data, user management, persistent storage.
- `frontend/` — React-based webapp with separate mobile and web views.
- `ai/` — model/data preparation, training pipelines, and model export guidance (TFLite/ONNX).
- `docs/` — architecture, hardware requirements, privacy/security.

Next steps:
- Collect initial EEG dataset (annotated) and establish data ingestion pipeline.
- Prototype amplifier and microcontroller ADC design; verify sampling, SNR, and input protection.
- Implement edge inference using a small, efficient TFLite or ONNX model.
- Create backend endpoints and a simple React frontend prototype.

See `docs/` for architecture and safety notes.
