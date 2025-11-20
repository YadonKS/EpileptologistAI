# AI / Models

This folder holds model architecture notes, training scripts, and data-preparation helpers.

Suggested subfolders:
- `data_prep/` — scripts to convert raw EEG to model-ready datasets (MNE, EDF, HDF5)
- `models/` — training code, model definitions, and conversion scripts (TFLite/ONNX)
- `experiments/` — notebooks and logs

Considerations:
- Use clinically labeled seizure segments for supervised training.
- Use windowed approaches (sliding windows) with spectrograms or raw time-series 1D CNNs/transformers.
- For edge: prefer small 1D-CNN or quantized models with TFLite.
