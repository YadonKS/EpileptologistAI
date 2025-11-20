"""
Edge inference placeholder.
Receives EEG frames (example) and runs model inference (TFLite/ONNX).
"""

import numpy as np

def preprocess(raw_frame):
    # apply filtering, resampling, normalization
    return raw_frame

class EdgeInference:
    def __init__(self, model_path=None):
        self.model_path = model_path
        # load tflite/onnx model here

    def infer(self, frame):
        x = preprocess(frame)
        # run model -> return dict with predictions
        return {"seizure_prob": 0.0, "notes": "placeholder"}

if __name__ == '__main__':
    # quick smoke test
    dummy = np.zeros((1,256))
    ei = EdgeInference()
    print(ei.infer(dummy))
