"""
Fake Arduino stream using REAL EEG data from CHB-MIT dataset.
Replays actual brain recordings so the model sees realistic patterns.
"""

import random
import time
from pathlib import Path
import numpy as np

_SAMPLES_PER_WINDOW = 256 * 6  # 1536

_seizure_windows = set()
_normal_data = None
_seizure_data = None


def _load_real_samples():
    """Load pre-extracted real EEG windows from .npy files."""
    global _normal_data, _seizure_data
    if _normal_data is not None:
        return

    samples_dir = Path(__file__).parent / "real_samples"
    _normal_data = np.load(samples_dir / "normal_windows.npy")    # (80, 1536, 6)
    _seizure_data = np.load(samples_dir / "seizure_windows.npy")  # (20, 1536, 6)


def _init_seizure_schedule():
    """Pick 4-12 random windows to be seizure windows."""
    global _seizure_windows
    n_seizure = random.randint(4, 12)
    _seizure_windows = set(random.sample(range(100), n_seizure))


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

    while True:
        is_seizure = window_index in _seizure_windows

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
