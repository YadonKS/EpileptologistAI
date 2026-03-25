import numpy as np

def build_window(samples):
    """
    Logic: 
    This function stacks multiple 1D samples over time to form 2D window. 
    samples: list of rows, each row = [ch1...ch6], length should be 1536

    returns: 
    X_time_channels: (1536, 6)
    or 
    X_channels_time: (6, 1536)

    """


    X_time_channels = np.array(samples, dtype=np.float32) # (1536, 6)
    X_channels_time = X_time_channels.T # (6, 1536)

    return X_time_channels, X_channels_time