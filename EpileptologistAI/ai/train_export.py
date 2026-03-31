
import numpy as np
import pandas as pd
import time
import warnings
import pywt
from scipy.signal import welch, butter, filtfilt, iirnotch
from scipy.stats import entropy, skew, kurtosis, zscore
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import recall_score, precision_score, f1_score, roc_auc_score
import xgboost as xgb
import joblib
import os

warnings.filterwarnings("ignore")
np.random.seed(42)

#  Constants 
N_CHANNELS_ORIG = 24
SAMPLES_PER_CHANNEL = 1536
SAMPLING_FREQ = 256
TEST_SIZE = 0.2
RANDOM_STATE = 42
KEEP_CHANNELS = [0, 1, 2, 12, 13, 14]  # 6 channels: FP1-F7, F7-T7, T7-P7, FP2-F8, F8-T8, T8-P8

#  Feature names 
time_feats = ["mean", "std", "var", "rms", "abs_diff_sum", "ptp", "zero_crossings", "skew", "kurt"]
freq_feats = [
    "delta_power", "theta_power", "alpha_power", "beta_power", "gamma_power",
    "delta_rel", "theta_rel", "alpha_rel", "beta_rel", "gamma_rel",
    "total_power", "psd_entropy", "peak_freq", "freq_95pct",
    "theta_alpha_ratio", "delta_beta_ratio",
]
wave_feats = [
    "wl_energy_A4", "wl_energy_D4", "wl_energy_D3", "wl_energy_D2", "wl_energy_D1",
    "wl_A4_mean", "wl_A4_std",
    "wl_entropy_D4", "wl_entropy_D3", "wl_entropy_D2", "wl_entropy_D1",
]
per_channel_feature_names = time_feats + freq_feats + wave_feats  # 36
FEATS_PER_CH = len(per_channel_feature_names)

#  Preprocessing (same as notebook + signal_preprocess.py) 

def butter_bandpass_filter(data, lowcut, highcut, fs, order=4):
    nyquist = 0.5 * fs
    b, a = butter(order, [lowcut / nyquist, highcut / nyquist], btype="band")
    return filtfilt(b, a, data, axis=-1)

def notch_filter(data, freq, fs, quality_factor=30):
    b, a = iirnotch(freq / (0.5 * fs), quality_factor)
    return filtfilt(b, a, data, axis=-1)

def remove_artifacts_zscore(data, threshold=3.5):
    cleaned = data.copy()
    for i in range(data.shape[0]):
        for ch in range(data.shape[1]):
            channel_data = data[i, ch, :]
            z = np.abs(zscore(channel_data))
            mask = z > threshold
            if np.any(mask):
                cleaned[i, ch, mask] = np.median(channel_data[~mask])
    return cleaned

# Feature extraction  feature_extractor.py

def extract_time_domain_features(sig):
    return np.array([
        np.mean(sig), np.std(sig), np.var(sig),
        np.sqrt(np.mean(sig ** 2)),
        np.sum(np.abs(np.diff(sig))),
        np.ptp(sig),
        np.sum(np.diff(np.signbit(sig))),
        skew(sig), kurtosis(sig),
    ])

def extract_frequency_domain_features(sig, fs=256):
    freqs, psd = welch(sig, fs=fs, nperseg=min(256, len(sig)))
    bands = {"delta": (0.5, 4), "theta": (4, 8), "alpha": (8, 13), "beta": (13, 30), "gamma": (30, 50)}
    bp = {}
    for name, (lo, hi) in bands.items():
        idx = np.logical_and(freqs >= lo, freqs <= hi)
        bp[name] = np.trapz(psd[idx], freqs[idx])
    total = sum(bp.values()) + 1e-10
    rel = {k: v / total for k, v in bp.items()}
    psd_norm = psd / (np.sum(psd) + 1e-10)
    csum = np.cumsum(psd)
    edge_idx = np.where(csum >= 0.95 * np.sum(psd))[0]
    freq_95 = freqs[edge_idx[0]] if len(edge_idx) > 0 else freqs[-1]
    return np.array([
        bp["delta"], bp["theta"], bp["alpha"], bp["beta"], bp["gamma"],
        rel["delta"], rel["theta"], rel["alpha"], rel["beta"], rel["gamma"],
        total, entropy(psd_norm), freqs[np.argmax(psd)], freq_95,
        (bp["theta"] + 1e-10) / (bp["alpha"] + 1e-10),
        (bp["delta"] + 1e-10) / (bp["beta"] + 1e-10),
    ])

def extract_wavelet_features(sig):
    coeffs = pywt.wavedec(sig, "db4", level=4)
    energies = [np.sum(c ** 2) for c in coeffs]
    detail_entropies = [entropy(np.abs(c) / (np.sum(np.abs(c)) + 1e-10)) for c in coeffs[1:]]
    return np.array(energies + [np.mean(coeffs[0]), np.std(coeffs[0])] + detail_entropies)

def extract_all_features(X_reshaped, fs=256):
    n_samples, n_channels, _ = X_reshaped.shape
    X_features = np.zeros((n_samples, n_channels * FEATS_PER_CH))
    print(f"\nExtracting {n_channels * FEATS_PER_CH} features from {n_samples} samples...")
    start = time.time()
    for i in range(n_samples):
        if (i + 1) % 1000 == 0:
            print(f"  {i + 1}/{n_samples}")
        for ch in range(n_channels):
            ch_feats = np.concatenate([
                extract_time_domain_features(X_reshaped[i, ch, :]),
                extract_frequency_domain_features(X_reshaped[i, ch, :], fs),
                extract_wavelet_features(X_reshaped[i, ch, :]),
            ])
            assert len(ch_feats) == FEATS_PER_CH
            X_features[i, ch * FEATS_PER_CH : (ch + 1) * FEATS_PER_CH] = ch_feats
    print(f"  Done in {time.time() - start:.1f}s")
    return X_features


def main():
    #  1. Load data 
    print("=" * 60)
    print("LOADING DATASET")
    print("=" * 60)
    df = pd.read_csv("EEG_Scaled_data.csv")
    print(f"Loaded: {df.shape}")

    X = df.drop("target", axis=1).values
    y = df["target"].values
    print(f"Class distribution: {dict(zip(*np.unique(y, return_counts=True)))}")

    #  2. Reshape & select 6 channels 
    X_reshaped = X.reshape(-1, N_CHANNELS_ORIG, SAMPLES_PER_CHANNEL)
    X_reshaped = X_reshaped[:, KEEP_CHANNELS, :]
    n_channels = len(KEEP_CHANNELS)
    print(f"Reshaped: {X_reshaped.shape}  (samples, channels, time)")

    # 3. Preprocess 
    print("\n" + "=" * 60)
    print("PREPROCESSING")
    print("=" * 60)
    X_bandpass = butter_bandpass_filter(X_reshaped, 0.5, 50, SAMPLING_FREQ)
    print("  Bandpass 0.5-50 Hz done")
    X_notch = notch_filter(X_bandpass, 60, SAMPLING_FREQ)
    print("  Notch 60 Hz done")
    X_preprocessed = remove_artifacts_zscore(X_notch, threshold=3.5)
    print("  Artifact removal done")

    # 4. Feature extraction
    print("\n" + "=" * 60)
    print("FEATURE EXTRACTION")
    print("=" * 60)
    X_features = extract_all_features(X_preprocessed, SAMPLING_FREQ)
    X_features = np.nan_to_num(X_features, nan=0.0, posinf=0.0, neginf=0.0)
    print(f"Features shape: {X_features.shape}")

    #  5. Train/test split + scale + select 
    print("\n" + "=" * 60)
    print("SPLIT + SCALE + SELECT")
    print("=" * 60)
    X_train, X_test, y_train, y_test = train_test_split(
        X_features, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    selector = SelectKBest(score_func=f_classif, k=200)
    X_train_final = selector.fit_transform(X_train_scaled, y_train)
    X_test_final = selector.transform(X_test_scaled)
    print(f"After selection: {X_train_final.shape[1]} features")

    #  6. Train XGBoost 
    print("\n" + "=" * 60)
    print("TRAINING XGBOOST")
    print("=" * 60)
    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight_dict = dict(zip(classes, weights))

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.05,
        scale_pos_weight=class_weight_dict[1] / class_weight_dict[0],
        random_state=RANDOM_STATE,
        n_jobs=-1,
        eval_metric="logloss",
    )
    start = time.time()
    model.fit(X_train_final, y_train, verbose=False)
    t = time.time() - start

    y_pred = model.predict(X_test_final)
    y_proba = model.predict_proba(X_test_final)[:, 1]

    print(f"  Trained in {t:.1f}s")
    print(f"  Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"  Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"  F1:        {f1_score(y_test, y_pred):.4f}")
    print(f"  AUROC:     {roc_auc_score(y_test, y_proba):.4f}")

    #  7. Export 
    print("\n" + "=" * 60)
    print("EXPORTING")
    print("=" * 60)
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/xgb_model.joblib")
    joblib.dump(scaler, "models/scaler.joblib")
    joblib.dump(selector, "models/selector.joblib")
    print("  models/xgb_model.joblib")
    print("  models/scaler.joblib")
    print("  models/selector.joblib")
    print("\nDone. Pipeline: raw (216,) -> scale -> select (200,) -> XGBoost")


if __name__ == "__main__":
    main()
