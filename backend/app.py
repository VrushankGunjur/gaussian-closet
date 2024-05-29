import os
from flask import Flask, redirect, request
import requests
import base64
import uuid
from flask_cors import CORS, cross_origin
from PIL import Image, ImageDraw
from io import BytesIO
from image_pipeline import AnyDoorTask
from svgpathtools import Path, parse_path, svgstr2paths
import numpy as np
import pickle
import io
import torch

# from backend_segmenter.auto_segmenter import AutoSegmenter

# from run_inference import inference_single_image

# from redis import Redis
# from rq import Queue

# r = Redis()
# q = Queue(connection=r)

def img_to_base64(img, name):
    buf = io.BytesIO()
    img.save(buf, 'JPEG')
    b = buf.getvalue()
    return (name, b, "image/jpeg")

def base64_to_img(b64_str):
    out = base64.b64decode(b64_str)
    buf = io.BytesIO(out)
    return Image.open(buf)

app = Flask(__name__, static_folder="../web/build", static_url_path="/")
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

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

def widen_mask(mask):
    invert = np.invert(mask)
    new_mask = np.copy(mask)
    for i in range(mask.shape[0]):
        for j in range(mask.shape[1]):
            if (not mask[i][j] and is_neighbor(mask, i, j)):
                new_mask[i][j] = True
    return new_mask

@app.route("/")
@cross_origin()
def index():
    return redirect("./index.html")

@app.route("/api/segment", methods=["POST"])
@cross_origin()
def segment():
    content = request.get_json()
    
    bg = Image.open(BytesIO(requests.get(content["bg_image_url"]).content))
    fg = Image.open(BytesIO(requests.get(content["fg_image_url"]).content))

    from auto_segmenter import AutoSegmenter
    seg = AutoSegmenter()
    bg_masks, fg_masks = seg.run_segmenter(bg, fg, [content["segment_target"]])
    bg_mask = bg_masks[0][0]
    fg_mask = fg_masks[0][0]

    torch.cuda.empty_cache()

    for i in range(10):
        bg_mask = widen_mask(bg_mask)
        fg_mask = widen_mask(fg_mask)

    # send back the bg_mask and fg_mask as base64
    bg_mask = Image.fromarray(bg_mask.astype(np.uint8)*255)
    fg_mask = Image.fromarray(fg_mask.astype(np.uint8)*255)

    #base64bg = bg_mask.tobytes()
    buffered_bg = BytesIO()
    bg_mask.save(buffered_bg, format="JPEG")
    base64bg = base64.b64encode(buffered_bg.getvalue())

    buffered_fg = BytesIO()
    fg_mask.save(buffered_fg, format="JPEG")
    base64fg = base64.b64encode(buffered_fg.getvalue())

    # should we be decoding here?
    return { "bg_mask": base64bg.decode("utf-8"), "fg_mask": base64fg.decode("utf-8") }


@app.route("/api/in_fill", methods=["POST"])
@cross_origin()
def in_fill():
    content = request.get_json()

    print('received request')

    bg = Image.open(BytesIO(requests.get(content["bg_image_url"]).content))
    fg = Image.open(BytesIO(requests.get(content["fg_image_url"]).content)) 

    bg_mask, fg_mask = None, None

    if (content["segment_type"] == "auto" or content["segment_type"] == "partial"):
        print('segmenting')

        torch.cuda.empty_cache()

        from auto_segmenter import AutoSegmenter

        seg = AutoSegmenter()

        bg_masks, fg_masks = seg.run_segmenter(bg, fg, [content["segment_target"]])
    
        bg_mask = bg_masks[0][0]    # get the first mask in the list, which is (mask Img, mask label)
        fg_mask = fg_masks[0][0]

        bg_mask = bg_mask.astype(bool)
        fg_mask = fg_mask.astype(bool)
        #print(bg_mask)
    
        # files_bg = {
        #      "img": img_to_base64(bg, "img.jpeg"),
        # }
        # files_fg = {
        #      "img": img_to_base64(fg, "img.jpeg"),
        # } 

        # r_bg = requests.post("http://35.203.64.204:5000/api/segment", json={ "segment_target":content["segment_target"] }, files=files_bg)
        # r_fg = requests.post("http://35.203.64.204:5000/api/segment", json={ "segment_target":content["segment_target"] }, files=files_fg)

        # c_bg = r_bg.get_json()
        # bg_mask = base64_to_img(c["bg_mask"])
        # fg_mask = base64_to_img(c["fg_mask"])
    else:
        bg_mask = svg_to_mask(content['bg_path'], bg.size, "bg_mask")
        fg_mask = svg_to_mask(content['fg_path'], fg.size, "fg_mask")

    # widen masks
    for i in range(10):
        bg_mask = widen_mask(bg_mask)
        fg_mask = widen_mask(fg_mask)

    if (content["segment_type"] == "partial"):
        print("partial detected")

        if (content['bg_path'] != "NONE"): 
            bg_mask_user = np.array(svg_to_mask(content['bg_path'], bg.size, "bg_mask"))
            bg_mask = np.logical_or(bg_mask, bg_mask_user)
            # bg_mask = union_mask(bg_mask, bg_mask_user)
        
        if (content['fg_path'] != "NONE"):  
            fg_mask_user = np.array(svg_to_mask(content['fg_path'], fg.size, "fg_mask"))
            fg_mask = np.logical_or(fg_mask, fg_mask_user)
            # fg_mask = union_mask(fg_mask, fg_mask_user)

    print('clearing cache')
    torch.cuda.empty_cache()


    print('inference')
    from run_inference import inference_single_image

    id = uuid.uuid1()

    Image.fromarray(fg_mask.astype(np.uint8)*255).save(f"./masks/fg_mask_{id}.jpg")
    Image.fromarray(bg_mask.astype(np.uint8)*255).save(f"./masks/bg_mask_{id}.jpg")

    task = AnyDoorTask(bg, bg_mask, fg, fg_mask, inference_single_image)

    # out is the generated image
    out_arr = task.run()
    out = Image.fromarray(out_arr.astype(np.uint8))
    out.save(f"./imgs/direct_from_model_{id}.jpg")
    # we want to replace the original image with the pixels in the generated
    # image only where the masks align

    # for x in range(len(bg_mask)):
    #     for y in range(len(bg_mask[0])):
    #         # might be y,x
    #         out[x][y] = 

    # elementwise multiply to get the addition

    # before doing this, we want to make the bg_mask "fuzzy" by flipping
    # boundary pixels to on position
    # take only the part of the generated image we wanted replaced in the original image
    # 0 out all entries in the matrix that aren't in the mask

    #out_masked_arr = np.multiply(out_arr, np.stack([bg_mask, bg_mask, bg_mask], axis=2))

    # mask out all of the generation that we don't want
    out_arr[~bg_mask] = 0
    Image.fromarray(out_arr.astype(np.uint8)).save(f"./intermediates/masked_generation_{id}.jpg")

    # inverse_bg_mask = np.logical_not(bg_mask) # ~
    # inverse_bg_mask_ = Image.fromarray(inverse_bg_mask.astype(np.uint8)*255)
    # inverse_bg_mask_.save(f"./masks/inv_bg_mask_{id}.jpg")

    # mask out the part of the original image we want to replace
    bg_arr = np.array(bg)
    bg_arr[bg_mask] = 0
    #bg = np.multiply(bg, np.stack([inverse_bg_mask, inverse_bg_mask, inverse_bg_mask], axis=2)) 

    Image.fromarray(bg_arr.astype(np.uint8)).save(f"./intermediates/keep_from_og_{id}.jpg")


    generation = bg_arr + out_arr

    gen = Image.fromarray(generation.astype(np.uint8))

    gen.save(f"./generations/{id}.jpg")

    print(id)

    base64img = None

    print('clearing cache')
    torch.cuda.empty_cache()
    with open(f"./generations/{id}.jpg", "rb") as image_file:
        base64img = base64.b64encode(image_file.read()).decode("utf-8")

    return { "id": id, "image": base64img }

@app.route("/api/in_fill/<id>")
@cross_origin()
def serve_in_fill(id):
    done = False
    return { "done": done }

app.run(port=5000, host="0.0.0.0")
