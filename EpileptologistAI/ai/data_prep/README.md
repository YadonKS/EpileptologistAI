# Data Preparation

Use `mne` or custom parsers to read EDF/BrainVision files. Preprocessing steps often include:
- bandpass filtering (0.5-70 Hz), notch (50/60 Hz)
- resampling to target frequency
- normalization per-channel
- windowing and augmentation

Output a compact dataset (HDF5 or TFRecords) with windows and labels for training.
