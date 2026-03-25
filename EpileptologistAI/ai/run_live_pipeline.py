import os
import time
from datetime import datetime
from pathlib import Path

import numpy as np

from receiver.serial_receiver import get_window
from preprocessing.signal_preprocess import preprocess_window
from features.feature_extractor import extract_features_from_window
from inference.predict_xgb import load_pipeline, predict_one_window

FS = 256
WINDOW_SEC = 6
CHUNK_MINUTES = 10

WINDOWS_PER_PERSON = int((CHUNK_MINUTES * 60) / WINDOW_SEC)  # 600/6 = 100
PROBA_THRESHOLD = 0.5
SEIZURE_COUNT_THRESHOLD = 2  # more than 1 seizure window → epilepsy

def aggregate_results(preds, probas):
    """
    Count seizure windows. If more than 1 window is flagged as seizure,
    conclude the patient has epilepsy.
    """
    preds = np.array(preds, dtype=int)
    probas = np.array(probas, dtype=float)

    seizure_count = int(np.sum(preds == 1))
    avg_proba = float(probas.mean())
    has_epilepsy = int(seizure_count >= SEIZURE_COUNT_THRESHOLD)

    return has_epilepsy, avg_proba, seizure_count


def run_one_person(model, scaler, selector):
    preds = []
    probas = []

    print(f"\nRecording {CHUNK_MINUTES} minutes -> {WINDOWS_PER_PERSON} windows of {WINDOW_SEC}s each...")

    start_person = time.time()

    for w in range(WINDOWS_PER_PERSON):
        # 1) get one 6-sec window (matrix)
        _, X_ct = get_window()  # (6,1536)

        # 2) preprocess (same shape)
        X_clean = preprocess_window(X_ct, fs=FS)  # (6,1536)

        # 3) feature extraction (216,)
        feat_vec = extract_features_from_window(X_clean, fs=FS)  # (216,)

        # 4) scale -> select -> predict
        pred, proba = predict_one_window(model, scaler, selector, feat_vec)

        preds.append(pred)
        probas.append(proba)

        print(f"Window {w+1:03d}/{WINDOWS_PER_PERSON}: pred={pred} proba={proba:.3f}")

    has_epilepsy, avg_proba, seizure_count = aggregate_results(preds, probas)
    elapsed = time.time() - start_person

    print("\n" + "=" * 60)
    print(f"Done. Time: {elapsed:.1f}s")
    print(f"Seizures detected: {seizure_count}/{WINDOWS_PER_PERSON} windows")
    print(f"Prediction: {'EPILEPSY LIKELY' if has_epilepsy else 'EPILEPSY UNLIKELY'} (avg proba: {avg_proba:.3f})")
    print("=" * 60)

    return has_epilepsy, avg_proba, seizure_count, preds, probas


def run_pipeline_generator(model, scaler, selector, cancel_event=None, session_id=None):
    """Yield one dict per window — used by the FastAPI server."""

    # Set up raw data collection
    collect_dir = Path(__file__).parent / "collected_data"
    collect_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    label = session_id[:8] if session_id else timestamp
    raw_windows = []

    for w in range(WINDOWS_PER_PERSON):
        if cancel_event and cancel_event.is_set():
            break

        X_tc, X_ct = get_window()  # X_tc is (1536, 6)
        raw_windows.append(X_tc)

        X_clean = preprocess_window(X_ct, fs=FS)
        feat_vec = extract_features_from_window(X_clean, fs=FS)
        pred, proba = predict_one_window(model, scaler, selector, feat_vec)

        yield {
            "window": w + 1,
            "total": WINDOWS_PER_PERSON,
            "prediction": int(pred),
            "probability": float(proba),
            "elapsed_seconds": (w + 1) * WINDOW_SEC,
        }

    # Save raw EEG data for retraining
    if raw_windows:
        raw_array = np.stack(raw_windows)  # (N, 1536, 6)
        save_path = collect_dir / f"session_{label}.npy"
        np.save(save_path, raw_array)
        print(f"Saved raw EEG: {save_path} ({raw_array.shape})")


def main():
    # Load the full pipeline (model + scaler + feature selector)
    model, scaler, selector = load_pipeline("models")
    # Run one person (10 min)
    run_one_person(model, scaler, selector)


if __name__ == "__main__":
    main()