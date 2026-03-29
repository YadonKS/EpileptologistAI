import time


def flat_arduino_stream(n_channels, fs, realtime=False):
    """Yield a flat zero-valued signal stream for visualization accuracy tests."""
    row = ",".join(["0.00"] * n_channels)
    while True:
        yield row
        if realtime:
            time.sleep(1 / fs)
