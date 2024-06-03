import io
import base64
from PIL import Image, ImageDraw
from svgpathtools import Path, parse_path, svgstr2paths
import numpy as np 
import cv2 

def blur_mask(mask):
    kernel = gaussian_kernel(57, sigma=57);
    new_mask = mask.copy().astype(np.double)
    blur_mask = cv2.filter2D(new_mask, -1, kernel)
    return blur_mask

def img_to_base64(img, name):
    buf = io.BytesIO()
    img.save(buf, 'JPEG')
    b = buf.getvalue()
    return (name, b, "image/jpeg")

def base64_to_img(b64_str):
    out = base64.b64decode(b64_str)
    buf = io.BytesIO(out)
    return Image.open(buf)

def sample_path(path):
    points = []
    for segment in path:
        for t in [i / 1000 for i in range(1000 + 1)]:
            point = segment.point(t)
            points.append((point.real, point.imag))
    return points

def svg_to_mask(svg_str, shape, name="mask"):
    svg = svgstr2paths(svg_str)
    path = svg[0][0]
    image = Image.new("1", shape, 0)
    draw = ImageDraw.Draw(image)
    points = sample_path(path)
    draw.polygon(points, outline=1, fill=1)
    return image

# Takes in PIL.Image type
# Assumes are of bool type
def union_mask(a, b):
    a_ = np.array(a)
    b_ = np.array(b)
    out = np.logical_or(a_, b_)
    return Image.fromarray(out)

def is_neighbor(mask, i, j):
    a, b, c, d = False, False, False, False

    if (i > 0):
        a = mask[i - 1][j]
    if (i < mask.shape[0] - 1):
        b = mask[i + 1][j]
    if (j > 0):
        c = mask[i][j - 1]
    if (j < mask.shape[1] - 1):
        d = mask[i][j + 1]
    return a or b or c or d

# def widen_mask(mask):
#     invert = np.invert(mask)
#     new_mask = np.copy(mask)
#     for i in range(mask.shape[0]):
#         for j in range(mask.shape[1]):
#             if (not mask[i][j] and is_neighbor(mask, i, j)):
#                 new_mask[i][j] = True
#     return new_mask

def widen_mask(mask, iterations=5):
    kernel = np.ones((3,3), np.uint8)  # Define a 3x3 kernel
    new_mask = cv2.dilate(mask.astype(np.uint8), kernel, iterations=iterations)
    return new_mask.astype(bool)

# Source
# https://stackoverflow.com/questions/29731726/how-to-calculate-a-gaussian-kernel-matrix-efficiently-in-numpy
def gaussian_filter(l, sigma):
    """\
    creates gaussian kernel with side length `l` and a sigma of `sig`
    """
    ax = np.linspace(-(l - 1) / 2., (l - 1) / 2., l)
    gauss = np.exp(-0.5 * np.square(ax) / np.square(sigma))
    kernel = np.outer(gauss, gauss)
    return kernel / np.sum(kernel)


def blur_mask(mask):
    kernel = gaussian_filter(57, sigma=57)
    new_mask = mask.copy().astype(np.double)
    blur_mask = cv2.filter2D(new_mask, -1, kernel)
    return blur_mask

def upscale_mask(mask, new_dim):
    ox, oy = mask.shape
    new_mask = np.zeros(new_dim, dtype=bool)
    
    for i in range(new_dim[0]):
        for j in range(new_dim[1]):
            if (mask[i * ox // new_dim[0]][j * oy // new_dim[1]]):
                new_mask[i][j] = True

    return new_mask