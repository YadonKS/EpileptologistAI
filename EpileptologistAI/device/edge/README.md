# Edge Device (Raspberry Pi / Jetson / similar)

Purpose: receive raw or framed EEG streams from the microcontroller (USB/UART/BLE/Wi‑Fi), run preprocessing and inference (TFLite/ONNX runtime), and forward results to backend or local UI.

Suggested contents:
- `inference.py` — script to run model inference on incoming frames
- `requirements.txt` — Python deps (numpy, scipy, tflite-runtime or onnxruntime)
- `model/` — place exported models and conversion notes

Notes:
- For low-power devices, use `tflite` with quantized models and hardware acceleration where available.
- Provide an option to run lightweight detection on-device and aggregate features for cloud diagnosis.
