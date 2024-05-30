import torch
import torch.nn.functional as F
import numpy as np
from svgpathtools import Path, parse_path, svgstr2paths
from PIL import Image, ImageDraw
import io
import base64
import cv2

attn_maps = {}
def hook_fn(name):
    def forward_hook(module, input, output):
        if hasattr(module.processor, "attn_map"):
            attn_maps[name] = module.processor.attn_map
            del module.processor.attn_map

    return forward_hook

def register_cross_attention_hook(unet):
    for name, module in unet.named_modules():
        if name.split('.')[-1].startswith('attn2'):
            module.register_forward_hook(hook_fn(name))

    return unet

def upscale(attn_map, target_size):
    attn_map = torch.mean(attn_map, dim=0)
    attn_map = attn_map.permute(1,0)
    temp_size = None

    for i in range(0,5):
        scale = 2 ** i
        if ( target_size[0] // scale ) * ( target_size[1] // scale) == attn_map.shape[1]*64:
            temp_size = (target_size[0]//(scale*8), target_size[1]//(scale*8))
            break

    assert temp_size is not None, "temp_size cannot is None"

    attn_map = attn_map.view(attn_map.shape[0], *temp_size)

    attn_map = F.interpolate(
        attn_map.unsqueeze(0).to(dtype=torch.float32),
        size=target_size,
        mode='bilinear',
        align_corners=False
    )[0]

    attn_map = torch.softmax(attn_map, dim=0)
    return attn_map

def sample_path(path):
    points = []
    for segment in path:
        for t in [i / 1000 for i in range(1000 + 1)]:
            point = segment.point(t)
            points.append((point.real, point.imag))
    return points

def get_net_attn_map(image_size, batch_size=2, instance_or_negative=False, detach=True):

    idx = 0 if instance_or_negative else 1
    net_attn_maps = []

    for name, attn_map in attn_maps.items():
        attn_map = attn_map.cpu() if detach else attn_map
        attn_map = torch.chunk(attn_map, batch_size)[idx].squeeze()
        attn_map = upscale(attn_map, image_size) 
        net_attn_maps.append(attn_map) 

    net_attn_maps = torch.mean(torch.stack(net_attn_maps,dim=0),dim=0)

    return net_attn_maps

def attnmaps2images(net_attn_maps):

    #total_attn_scores = 0
    images = []

    for attn_map in net_attn_maps:
        attn_map = attn_map.cpu().numpy()
        #total_attn_scores += attn_map.mean().item()

        normalized_attn_map = (attn_map - np.min(attn_map)) / (np.max(attn_map) - np.min(attn_map)) * 255
        normalized_attn_map = normalized_attn_map.astype(np.uint8)
        #print("norm: ", normalized_attn_map.shape)
        image = Image.fromarray(normalized_attn_map)

        #image = fix_save_attn_map(attn_map)
        images.append(image)

    #print(total_attn_scores)
    return images

def is_torch2_available():
    return hasattr(F, "scaled_dot_product_attention")

def get_generator(seed, device):

    if seed is not None:
        if isinstance(seed, list):
            generator = [torch.Generator(device).manual_seed(seed_item) for seed_item in seed]
        else:
            generator = torch.Generator(device).manual_seed(seed)
    else:
        generator = None

    return generator

def img_to_base64(img, name):
    buf = io.BytesIO()
    img.save(buf, 'JPEG')
    b = buf.getvalue()
    return (name, b, "image/jpeg")

def base64_to_img(b64_str):
    out = base64.b64decode(b64_str)
    buf = io.BytesIO(out)
    return Image.open(buf)


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

def widen_mask(mask):
    invert = np.invert(mask)
    new_mask = np.copy(mask)
    for i in range(mask.shape[0]):
        for j in range(mask.shape[1]):
            if (not mask[i][j] and is_neighbor(mask, i, j)):
                new_mask[i][j] = True
    return new_mask


def gaussian_kernel(kernel_size, sigma=1, muu=0):
    x, y = np.meshgrid(np.linspace(-1, 1, kernel_size),
                       np.linspace(-1, 1, kernel_size))
    dst = np.sqrt(x**2+y**2)
 
    normal = 1/(2, 0 * np.pi * sigma**2)
 
    gauss = np.exp(-((dst-muu)**2 / (2.0 * sigma**2))) * normal
    
    kernel /= np.sum(kernel)
    return kernel

def blur_mask(mask):
    kernel = gaussian_kernel(57, sigma=57);
    new_mask = mask.copy().astype(np.double)
    blur_mask = cv2.filter2D(new_mask, -1, kernel)
    return blur_mask