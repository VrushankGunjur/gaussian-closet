import os
import requests
import base64
import uuid
from PIL import Image, ImageDraw
from io import BytesIO
from image_pipeline import AnyDoorTask
from svgpathtools import Path, parse_path, svgstr2paths
import numpy as np
import pickle
import io
import torch
import sys
from custom_utils import * 

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


def main():


    bg = Image.open("inputs/bg.jpg")
    fg = Image.open("inputs/fg.jpg")

    bg_mask, fg_mask = None, None

    from auto_segmenter import AutoSegmenter

    seg = AutoSegmenter()

    print('running autosegmenter')
    bg_masks, fg_masks = seg.run_segmenter(bg, fg, [sys.argv[1]])

    bg_mask = bg_masks[0][0]    # get the first mask in the list, which is (mask Img, mask label)
    fg_mask = fg_masks[0][0]
    
    bg_mask = widen_mask(bg_mask, 10)
    fg_mask = widen_mask(fg_mask, 2)

    print('clearing cache')
    torch.cuda.empty_cache()


    print('inference')
    from run_inference import inference_single_image

    id = uuid.uuid1()

    Image.fromarray(fg_mask.astype(np.uint8)*255).save(f"./no_app/fg_mask.jpg")
    Image.fromarray(bg_mask.astype(np.uint8)*255).save(f"./no_app/bg_mask.jpg")

    task = AnyDoorTask(bg, bg_mask, fg, fg_mask, inference_single_image)

    # out is the generated image
    out_arr = task.run()
    out = Image.fromarray(out_arr.astype(np.uint8))
    
    print('saving generated image from model itself')
    out.save(f"./no_app/from_model_direct.jpg")
    # we want to replace the original image with the pixels in the generated
    # image only where the masks align

    bg_mask = bg_mask.astype(bool)
    fg_mask = fg_mask.astype(bool)

    # mask out all of the generation that we don't want
    out_arr[~bg_mask] = 0
    Image.fromarray(out_arr.astype(np.uint8)).save(f"./no_app/masked_generation.jpg")


    # mask out the part of the original image we want to replace
    bg_arr = np.array(bg)
    bg_arr[bg_mask] = 0

    Image.fromarray(bg_arr.astype(np.uint8)).save(f"./no_app/keep_from_og.jpg")

    generation = bg_arr + out_arr

    gen = Image.fromarray(generation.astype(np.uint8))

    print('saving generation')
    gen.save(f"./no_app/generation.jpg")

    print('clearing cache')
    torch.cuda.empty_cache()

if __name__ == "__main__":
    main()