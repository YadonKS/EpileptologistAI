import joblib
import numpy as np
import os


def load_pipeline(model_dir: str = "models"):
    """
    Load the full inference pipeline exported from the notebook:
      - scaler (StandardScaler)
      - selector (SelectKBest, k=200)
      - model (XGBoost)

    Returns: (model, scaler, selector)
    """
    model = joblib.load(os.path.join(model_dir, "xgb_model.joblib"))
    scaler = joblib.load(os.path.join(model_dir, "scaler.joblib"))
    selector = joblib.load(os.path.join(model_dir, "selector.joblib"))
    return model, scaler, selector


def predict_one_window(model, scaler, selector, feature_vec):
    """
    feature_vec: (216,) raw features from feature_extractor
    Returns:
      pred (0/1), proba (float)
    """
    feature_vec = np.asarray(feature_vec, dtype=np.float32)

    if feature_vec.ndim != 1:
        raise ValueError(f"feature_vec must be 1D (F,), got shape {feature_vec.shape}")

    # replace NaN/Inf (same as notebook)
    feature_vec = np.nan_to_num(feature_vec, nan=0.0, posinf=0.0, neginf=0.0)

    X = feature_vec.reshape(1, -1)       # (1, 216)
    X = scaler.transform(X)              # scale
    X = selector.transform(X)            # select top 200 features

    pred = int(model.predict(X)[0])

    if hasattr(model, "predict_proba"):
        proba = float(model.predict_proba(X)[0, 1])
    else:
        proba = float(pred)

    return pred, proba
