from receiver.serial_receiver import get_window
from preprocessing.signal_preprocess import preprocess_window
from features.feature_extractor import extract_features_from_window
import numpy as np

FS = 256

print("Getting one fake 6-second window...")
_, X_ct = get_window()
print("X_ct shape:", X_ct.shape)  # must be (6,1536)
assert X_ct.shape == (6, 1536), f"Bad shape: {X_ct.shape}"

X_clean = preprocess_window(X_ct, fs=FS)
print("X_clean shape:", X_clean.shape)  # must be (6,1536)
assert X_clean.shape == (6, 1536), f"Bad shape: {X_clean.shape}"

feat = extract_features_from_window(X_clean, fs=FS)
print("Feature vector shape:", feat.shape)  # must be (216,)
assert feat.shape == (216,), f"Bad shape: {feat.shape}"

# Check for NaN/Inf
feat_clean = np.nan_to_num(feat, nan=0.0, posinf=0.0, neginf=0.0)
n_bad = np.sum(np.isnan(feat) | np.isinf(feat))
print(f"NaN/Inf values: {n_bad}")

print("\nSmoke test passed (receiver -> preprocess -> features)")
print("Pipeline ready. Run the notebook export cell to generate model files.")
