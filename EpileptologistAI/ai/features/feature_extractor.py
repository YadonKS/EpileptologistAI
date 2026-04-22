"""
dataset mode: (n_samples, n_channels, time)

live mode: one matrix (n_channels, time). 

"""


import numpy as np
import pywt
from scipy.signal import welch
from scipy.stats import skew, kurtosis, entropy


# NumPy 2 removed np.trapz; prefer trapezoid with fallback for older versions.
def _integrate(y: np.ndarray, x: np.ndarray) -> float:
    if hasattr(np, "trapezoid"):
        return float(np.trapezoid(y, x))
    return float(np.trapz(y, x))

time_feats = [
    "mean","std","var","rms",
    "abs_diff_sum","ptp","zero_crossings",
    "skew","kurt"
]

freq_feats = [
    "delta_power","theta_power","alpha_power","beta_power","gamma_power",
    "delta_rel","theta_rel","alpha_rel","beta_rel","gamma_rel",
    "total_power","psd_entropy","peak_freq","freq_95pct",
    "theta_alpha_ratio","delta_beta_ratio"
]

wave_feats = [
    "wl_energy_A4","wl_energy_D4","wl_energy_D3","wl_energy_D2","wl_energy_D1",
    "wl_A4_mean","wl_A4_std",
    "wl_entropy_D4","wl_entropy_D3","wl_entropy_D2","wl_entropy_D1"
]

per_channel_feature_names = time_feats + freq_feats + wave_feats  # 36
FEATS_PER_CH = len(per_channel_feature_names)

# Feature functions as in kaggle 

def extract_time_domain_features(signal_window: np.ndarray) -> np.ndarray:
    return np.array([
        np.mean(signal_window),
        np.std(signal_window),
        np.var(signal_window),
        np.sqrt(np.mean(signal_window**2)),
        np.sum(np.abs(np.diff(signal_window))),
        np.ptp(signal_window),
        np.sum(np.diff(np.signbit(signal_window))),
        skew(signal_window),
        kurtosis(signal_window),
    ], dtype=np.float32)

def extract_frequency_domain_features(signal_window: np.ndarray, fs: int = 256) -> np.ndarray:
    freqs, psd = welch(signal_window, fs=fs, nperseg=min(256, len(signal_window)))

    bands = {
        "delta": (0.5, 4),
        "theta": (4, 8),
        "alpha": (8, 13),
        "beta":  (13, 30),
        "gamma": (30, 50),
    }

    band_powers = {}
    for name, (low, high) in bands.items():
        idx = (freqs >= low) & (freqs <= high)
        band_powers[name] = _integrate(psd[idx], freqs[idx])

    total = sum(band_powers.values()) + 1e-10
    rel = {k: v / total for k, v in band_powers.items()}

    psd_norm = psd / (np.sum(psd) + 1e-10)

    # 95% spectral edge frequency
    csum = np.cumsum(psd)
    edge_idx = np.where(csum >= 0.95 * np.sum(psd))[0]
    freq_95 = freqs[edge_idx[0]] if len(edge_idx) > 0 else freqs[-1]

    return np.array([
        band_powers["delta"], band_powers["theta"], band_powers["alpha"], band_powers["beta"], band_powers["gamma"],
        rel["delta"], rel["theta"], rel["alpha"], rel["beta"], rel["gamma"],
        total,
        entropy(psd_norm),
        freqs[np.argmax(psd)],
        freq_95,
        (band_powers["theta"] + 1e-10) / (band_powers["alpha"] + 1e-10),
        (band_powers["delta"] + 1e-10) / (band_powers["beta"] + 1e-10),
    ], dtype=np.float32)

def extract_wavelet_features(signal_window: np.ndarray) -> np.ndarray:
    coeffs = pywt.wavedec(signal_window, "db4", level=4)  

    energies = [np.sum(c**2) for c in coeffs]  # 5 values

    detail_entropies = [
        entropy(np.abs(c) / (np.sum(np.abs(c)) + 1e-10))
        for c in coeffs[1:]  
    ]  # 4 values

    return np.array(
        energies + [np.mean(coeffs[0]), np.std(coeffs[0])] + detail_entropies,
        dtype=np.float32
    )  # 11 values

# Live: one window (6, 1536) --> (216,) --> xgboost input expects features from 2D

def extract_features_from_window(X_ct_clean: np.ndarray, fs: int = 256) -> np.ndarray:
    """
    X_ct_clean: (channels, time) = (6,1536)
    returns: (channels * 36,) = (216,)
    """
    n_channels = X_ct_clean.shape[0]
    feats = []

    for ch in range(n_channels):
        x = X_ct_clean[ch, :]

        ch_features = np.concatenate([
            extract_time_domain_features(x),
            extract_frequency_domain_features(x, fs),
            extract_wavelet_features(x)
        ])

        # safety check
        assert len(ch_features) == FEATS_PER_CH, (
            f"Feature count mismatch on channel {ch}: got {len(ch_features)}, expected {FEATS_PER_CH}"
        )

        feats.append(ch_features)

    return np.concatenate(feats, axis=0)  # (216,)