import os
import time
import numpy as np

from receiver.line_parser import parse_line_to_sample
from receiver.window_builder import build_window
from receiver.fake_arduino_flow import fake_arduino_stream, get_last_window_is_seizure

# Reads from .env when running via server.py, falls back to defaults
USE_FAKE_ARDUINO = os.environ.get("USE_FAKE_ARDUINO", "true").lower() == "true"

PORT = os.environ.get("SERIAL_PORT", "COM3")
BAUD = 115200
N_CHANNELS = 6
FS = 256  # Hz
WINDOW_SEC = 6  # seconds
SAMPLES_PER_WINDOW = FS * WINDOW_SEC  # 1536

# Persistent fake stream so seizure schedule survives across get_window() calls
_fake_stream = None
_quality_mock_index = 0


def get_window():
    global _fake_stream
    rows = []

    if USE_FAKE_ARDUINO:
        if _fake_stream is None:
            _fake_stream = fake_arduino_stream(N_CHANNELS, FS)
        stream = _fake_stream
    else:
        import serial
        ser = serial.Serial(PORT, BAUD, timeout=1)
        time.sleep(1.5)

    while True:
        if USE_FAKE_ARDUINO:
            line = next(stream)
        else:
            line = ser.readline().decode(errors="ignore").strip()
            if not line:
                continue

        sample = parse_line_to_sample(line, N_CHANNELS)
        if sample is None:
            continue

        rows.append(sample)

        if len(rows) == SAMPLES_PER_WINDOW:
            X_tc, X_ct = build_window(rows)
            rows.clear()
            if not USE_FAKE_ARDUINO:
                ser.close()
            return X_tc, X_ct


def assess_signal_quality(sample_count=256):
    """Collect a short sample and return a coarse signal quality estimate."""
    global _quality_mock_index

    if USE_FAKE_ARDUINO:
        mock_mode = os.environ.get("FAKE_SIGNAL_QUALITY_MODE", "fail-then-pass").strip().lower()
        if mock_mode == "always-poor":
            return {
                "status": "poor",
                "score": 32.0,
                "details": {
                    "mock_mode": mock_mode,
                    "samples_checked": int(sample_count),
                    "channels": N_CHANNELS,
                },
            }
        if mock_mode == "always-good":
            return {
                "status": "good",
                "score": 92.0,
                "details": {
                    "mock_mode": mock_mode,
                    "samples_checked": int(sample_count),
                    "channels": N_CHANNELS,
                },
            }
        if mock_mode == "toggle":
            _quality_mock_index += 1
            is_good = (_quality_mock_index % 2 == 0)
            return {
                "status": "good" if is_good else "poor",
                "score": 90.0 if is_good else 35.0,
                "details": {
                    "mock_mode": mock_mode,
                    "check_index": _quality_mock_index,
                    "samples_checked": int(sample_count),
                    "channels": N_CHANNELS,
                },
            }
        if mock_mode == "fail-then-pass":
            _quality_mock_index += 1
            is_good = _quality_mock_index >= 2
            return {
                "status": "good" if is_good else "poor",
                "score": 91.0 if is_good else 28.0,
                "details": {
                    "mock_mode": mock_mode,
                    "check_index": _quality_mock_index,
                    "samples_checked": int(sample_count),
                    "channels": N_CHANNELS,
                },
            }

    rows = []

    if USE_FAKE_ARDUINO:
        global _fake_stream
        if _fake_stream is None:
            _fake_stream = fake_arduino_stream(N_CHANNELS, FS)
        stream = _fake_stream
    else:
        import serial
        ser = serial.Serial(PORT, BAUD, timeout=1)
        time.sleep(1.5)

    while len(rows) < sample_count:
        if USE_FAKE_ARDUINO:
            line = next(stream)
        else:
            line = ser.readline().decode(errors="ignore").strip()
            if not line:
                continue

        sample = parse_line_to_sample(line, N_CHANNELS)
        if sample is None:
            continue
        rows.append(sample)

    if not USE_FAKE_ARDUINO:
        ser.close()

    arr = np.asarray(rows, dtype=np.float32)  # (samples, channels)
    std_per_channel = np.std(arr, axis=0)
    variability_ok = float(np.mean((std_per_channel >= 0.5) & (std_per_channel <= 5000.0)))

    diffs = np.abs(np.diff(arr, axis=0))
    flatline_ratio = float(np.mean(diffs < 1e-3))
    saturation_ratio = float(np.mean(np.abs(arr) > 5000.0))

    score = (variability_ok * 100.0) - (flatline_ratio * 100.0) - (saturation_ratio * 200.0)
    score = max(0.0, min(100.0, score))

    status = "good" if (score >= 70.0 and variability_ok >= 0.8 and flatline_ratio < 0.2) else "poor"
    return {
        "status": status,
        "score": round(score, 1),
        "details": {
            "variability_ok_ratio": round(variability_ok, 3),
            "flatline_ratio": round(flatline_ratio, 3),
            "saturation_ratio": round(saturation_ratio, 3),
            "samples_checked": int(sample_count),
            "channels": N_CHANNELS,
        },
    }


def reset_fake_stream():
    """Reset the fake stream for a new session."""
    global _fake_stream, _quality_mock_index
    _fake_stream = None
    _quality_mock_index = 0


def get_last_fake_window_is_seizure():
    """Expose current fake-window class label for mock-mode post-processing."""
    if not USE_FAKE_ARDUINO:
        return None
    return get_last_window_is_seizure()


# test
if __name__ == "__main__":
    print("testing without arduino ... ")
    X_tc, X_ct = get_window()
    print("window received! ")
    print("time x Channels shape:", X_tc.shape)
    print("Channels x Time shape:", X_ct.shape)
