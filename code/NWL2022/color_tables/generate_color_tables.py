import json

def get_array(filename, prop):
    arr = []
    f = open(filename)
    trace = json.load(f)["draw_trace"]
    for i in range(len(trace)):
        el = trace[i][prop]
        if (el not in arr):
            arr.append(trace[i][prop])
    f.close()
    return arr

def hsv_to_rgb(h, s, v):
    # adapted from https://en.wikipedia.org/wiki/HSL_and_HSV#HSV_to_RGB
    # h in [0, 360]
    # s in [0, 1]
    # v in [0, 1]
    chroma = s*v
    h1 = h/60
    x = chroma * (1-abs(h1%2 - 1))
    [r1, g1, b1] = [
        [chroma, x, 0],
        [x, chroma, 0],
        [0, chroma, x],
        [0, x, chroma],
        [x, 0, chroma],
        [chroma, 0, x]
    ][int(h1)%6]
    m = v-chroma
    [r, b, g] = [r1 + m, g1 + m, b1 + m]
    return int(r*255), int(g*255), int(b*255)

def rgb_to_hex(r, g, b):
    # r, g, b are in [0, 255]
    hex_r = str(hex(r)[2:])
    if (hex_r == "0"): hex_r = "00"
    hex_g = str(hex(g)[2:])
    if (hex_g == "0"): hex_g = "00"
    hex_b = str(hex(b)[2:])
    if (hex_b == "0"): hex_b = "00"
    return "#"+hex_r+hex_g+hex_b

def generate_colors(array):
    colors = []
    hue_step = 360/len(array)+1
    hue = 0
    saturation = 1
    brightness = 1
    for a in array:
        r, g, b = hsv_to_rgb(hue, saturation, brightness)
        colors.append(rgb_to_hex(r, g, b))
        hue += hue_step
    return colors

def write_file(filename, prop, array, colors):
    f = open(filename, "w")
    f.write(prop + ",colors\n")
    for i in range(len(array)):
        f.write(array[i] + "," + colors[i] + "\n")
    f.close()

path = "../LED_web_demo/"
filename = "data-varna-copy-paste-isolated_parsed"

for prop in ["supplier", "dependency"]:
    array = get_array(path+filename+".json", prop)
    colors = generate_colors(array)
    write_file(filename+"_"+prop+"_colors.csv", prop, array, colors)
