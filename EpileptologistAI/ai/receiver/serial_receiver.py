import os
import time

from receiver.line_parser import parse_line_to_sample
from receiver.window_builder import build_window
from receiver.fake_arduino_flow import fake_arduino_stream

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


def reset_fake_stream():
    """Reset the fake stream for a new session."""
    global _fake_stream
    _fake_stream = None


# test
if __name__ == "__main__":
    print("testing without arduino ... ")
    X_tc, X_ct = get_window()
    print("window received! ")
    print("time x Channels shape:", X_tc.shape)
    print("Channels x Time shape:", X_ct.shape)
