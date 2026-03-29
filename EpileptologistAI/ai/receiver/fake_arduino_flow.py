"""
Fake Arduino stream using REAL EEG data from CHB-MIT dataset.
Replays actual brain recordings so the model sees realistic patterns.
"""

import random
import time
import os
from pathlib import Path
import numpy as np

_SAMPLES_PER_WINDOW = 256 * 6  # 1536
_WINDOWS_PER_SESSION = 100

_seizure_windows = set()
_normal_data = None
_seizure_data = None
_last_window_is_seizure = None


def _load_real_samples():
    """Load pre-extracted real EEG windows from .npy files."""
    global _normal_data, _seizure_data
    if _normal_data is not None:
        return

    samples_dir = Path(__file__).parent / "real_samples"
    _normal_data = np.load(samples_dir / "normal_windows.npy")    # (80, 1536, 6)
    _seizure_data = np.load(samples_dir / "seizure_windows.npy")  # (20, 1536, 6)


def _init_seizure_schedule():
    """Build a controlled seizure schedule for a 100-window session.

    Defaults to a balanced 50/50 split so mock sessions are analyzable and
    avoid over-representing one class.
    """
    global _seizure_windows
    ratio_raw = os.environ.get("FAKE_SEIZURE_RATIO", "0.5")
    try:
        ratio = float(ratio_raw)
    except ValueError:
        ratio = 0.5

    # Keep ratio in a healthy range so one class does not dominate mock runs.
    ratio = max(0.3, min(0.7, ratio))
    n_seizure = int(round(_WINDOWS_PER_SESSION * ratio))
    _seizure_windows = set(random.sample(range(_WINDOWS_PER_SESSION), n_seizure))


def fake_arduino_stream(n_channels, fs, realtime=False):
    """
    Replays real EEG data from the CHB-MIT dataset.
    Normal windows use real non-seizure recordings.
    Seizure windows use real seizure recordings.

    Yields CSV strings like: "12.5,-3.2,0.8,45.1,-7.6,22.3"
    """
    _load_real_samples()
    _init_seizure_schedule()

    window_index = 0

    global _last_window_is_seizure

    while True:
        schedule_index = window_index % _WINDOWS_PER_SESSION
        is_seizure = schedule_index in _seizure_windows
        _last_window_is_seizure = bool(is_seizure)

        if is_seizure:
            # Pick a random real seizure window
            idx = random.randint(0, len(_seizure_data) - 1)
            window = _seizure_data[idx]  # (1536, 6)
        else:
            # Pick a random real normal window
            idx = random.randint(0, len(_normal_data) - 1)
            window = _normal_data[idx]  # (1536, 6)

        # Yield one row at a time (each row = one timestamp, 6 channel values)
        for row in range(window.shape[0]):
            values = window[row, :n_channels]
            yield ",".join(f"{v:.2f}" for v in values)
            if realtime:
                time.sleep(1 / fs)

        window_index += 1


def get_last_window_is_seizure():
    """Return class label for the most recently streamed fake window."""
    return _last_window_is_seizure
