import numpy as np
from scipy.signal import butter, filtfilt, iirnotch
from scipy.stats import zscore

FS = 256
def butter_bandpass_filter(X, lowcut, highcut, fs, order=4):
    """
    X: (channels, time) = (6,1536)
    """
    nyquist = 0.5 * fs
    low = lowcut / nyquist
    high = highcut / nyquist
    b, a = butter(order, [low, high], btype="band")
    return filtfilt(b, a, X, axis=1)  # time axis = 1

def notch_filter(X, freq, fs, quality_factor=30):
    """
    X: (channels, time)
    """
    nyquist = 0.5 * fs
    freq_normalized = freq / nyquist
    b, a = iirnotch(freq_normalized, quality_factor)
    return filtfilt(b, a, X, axis=1)  # time axis = 1

def remove_artifacts_zscore(X, threshold=3.5):
    """
    X: (channels, time)
    """
    cleaned = X.copy()
    for ch in range(X.shape[0]):
        channel_data = X[ch, :]
        z_scores = np.abs(zscore(channel_data))
        outlier_mask = z_scores > threshold
        if np.any(outlier_mask):
            median_val = np.median(channel_data[~outlier_mask])
            cleaned[ch, outlier_mask] = median_val
    return cleaned

def preprocess_window(X_ct, fs=256):
    """
    Full pipeline:
    bandpass -> notch -> zscore artifact removal

    Input:  X_ct (6,1536)
    Output: X_ct_clean (6,1536)
    """
    X_bandpass = butter_bandpass_filter(X_ct, 0.5, 50, fs)
    X_notch = notch_filter(X_bandpass, 60, fs)
    X_clean = remove_artifacts_zscore(X_notch, threshold=3.5)
    return X_clean