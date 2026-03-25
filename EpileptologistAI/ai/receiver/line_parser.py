

def parse_line_to_sample(line, n_channels):
    """
    Logic flow: 
    This function takes one line from arduino like: ch1...ch6 data
    and it turns it into one python list [ch1...ch6]
    and that list represents 1 timestamp x 6 channels 

    """
    parts = line.strip().split(",")
    if len(parts) != n_channels:
        return None
    try: 
        return [float(x) for x in parts]
    except ValueError: 
        return None
