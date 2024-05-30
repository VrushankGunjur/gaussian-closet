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
from util import *
import time
import cv2

mask_map = {}
request_to_imgs = {}

app = Flask(__name__, static_folder="../web/build", static_url_path="/")
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

def clip_base64_imgtags(url):
    return url[url.find("base64,")+len("base64,"):]

@app.route("/")
@cross_origin()
def index():
    return redirect("./index.html")

@app.route("/api/segment", methods=["POST"])
@cross_origin()
def segment():
    global mask_map
    global request_to_imgs
    #print('clearing cache')
    torch.cuda.empty_cache()
    content = request.get_json()
    
    print('segmenting...')

    base64bg_url = clip_base64_imgtags(content["bg_image_url"])
    base64fg_url = clip_base64_imgtags(content["fg_image_url"])


    #print(base64bg_url[:10])
    bg = Image.open(BytesIO(base64.b64decode(base64bg_url)))
    fg = Image.open(BytesIO(base64.b64decode(base64fg_url)))

    bg_cloth_id = content["bg_cloth_id"] # the specific target id in the background
    fg_cloth_id = content["fg_cloth_id"] # the specific target id in the foreground

    cloth_type = content["cloth_type"] # this is the segment target

    bg_mask = None
    fg_mask = None
    # look up fg and bg in the in-memory map to see if we have the masks for the segment target already
    if bg_cloth_id in mask_map:
        bg_mask = mask_map[bg_cloth_id]
    
    if fg_cloth_id in mask_map:
        fg_mask = mask_map[fg_cloth_id]

    segment_start_time = time.time()
    if bg_mask is None or fg_mask is None:
        from auto_segmenter import AutoSegmenter
        seg = AutoSegmenter()
        if bg_mask is None:
            bg_masks = seg.run_segmenter_single(bg, [cloth_type])
            bg_mask = bg_masks[0][0]
        if fg_mask is None:
            fg_masks = seg.run_segmenter_single(fg, [cloth_type])
            fg_mask = fg_masks[0][0]

    print(f"Segmentation took {time.time() - segment_start_time} seconds")

    #print('clearing cache')
    torch.cuda.empty_cache()

    # # this is just a backend mask to test that blurring the mask works
    # test = blur_mask(bg_mask)
    # ##print(test)
    # ##print(np.max(test))

    # test *= 255

    # Image.fromarray(test.astype(np.uint8), mode="L").save(f"./masks/blurred_mask.png") 

    # # add the bg & fg images to the request to the in-memory map
    request_id = str(uuid.uuid1())
    print(type(request_id))
    request_to_imgs[request_id] = (bg, fg)

    print('clearing cache pre widen')
    torch.cuda.empty_cache()

    widen_start_time = time.time()

    # this should be 10 @VRUSHANK @NAHUM
    # for _ in range(10):
    #     bg_mask = widen_mask(bg_mask)
    #     fg_mask = widen_mask(fg_mask)

    bg_mask = widen_mask(bg_mask, 10)
    fg_mask = widen_mask(fg_mask, 10)

    print(f"Widening took {time.time() - widen_start_time} seconds")

    mask_map[bg_cloth_id] = bg_mask
    mask_map[fg_cloth_id] = fg_mask

    # # send back the bg_mask and fg_mask as base64
    bg_mask = Image.fromarray(bg_mask.astype(np.uint8)*255)
    fg_mask = Image.fromarray(fg_mask.astype(np.uint8)*255)

    bg_mask.save(f"./masks/bg_mask_{request_id}.jpg")

    #base64bg = bg_mask.tobytes()
    buffered_bg = BytesIO()
    bg_mask.save(buffered_bg, format="JPEG")
    base64bg = base64.b64encode(buffered_bg.getvalue())

    buffered_fg = BytesIO()
    fg_mask.save(buffered_fg, format="JPEG")
    base64fg = base64.b64encode(buffered_fg.getvalue())

    # should we be decoding here?
    return { "bg_mask": base64bg.decode("utf-8"), "fg_mask": base64fg.decode("utf-8"), "request_id": request_id }

@app.route("/api/generate", methods=["POST"])
@cross_origin()
def generate():
    content = request.get_json()
    bg, fg = request_to_imgs[str(content["request_id"])]

    bg_mask = mask_map[content["bg_cloth_id"]]
    fg_mask = mask_map[content["fg_cloth_id"]]

    if (content["segment_type"] == "partial"):
        #print("partial detected")

        if (content['bg_path'] != "NONE"): 
            bg_mask_user = np.array(svg_to_mask(content['bg_path'], bg.size, "bg_mask"))
            bg_mask = np.logical_or(bg_mask, bg_mask_user)
            # bg_mask = union_mask(bg_mask, bg_mask_user)
        
        if (content['fg_path'] != "NONE"):  
            fg_mask_user = np.array(svg_to_mask(content['fg_path'], fg.size, "fg_mask"))
            fg_mask = np.logical_or(fg_mask, fg_mask_user)
            # fg_mask = union_mask(fg_mask, fg_mask_user)

    
    #print('clearing cache')
    torch.cuda.empty_cache()

    #print('inference')
    from run_inference import inference_single_image

    id = str(uuid.uuid1())

    Image.fromarray(fg_mask.astype(np.uint8)*255).save(f"./masks/fg_mask_{id}.jpg")
    Image.fromarray(bg_mask.astype(np.uint8)*255).save(f"./masks/bg_mask_{id}.jpg")

    task = AnyDoorTask(bg, bg_mask, fg, fg_mask, inference_single_image)

    # out is the generated image
    out_arr = task.run()
    out = Image.fromarray(out_arr.astype(np.uint8))
    out.save(f"./imgs/direct_from_model_{id}.jpg")

    Image.fromarray(bg_mask.astype(np.uint8)*255).save(f"./masks_in_generate/bg_mask_{id}.jpg")
    # mask out all of the generation that we don't want
    bg_mask = bg_mask.astype(bool)
    out_arr[~bg_mask] = 0
    Image.fromarray(out_arr.astype(np.uint8)).save(f"./intermediates/masked_generation_{id}.jpg")

    # mask out the part of the original image we want to replace
    bg_arr = np.array(bg)
    bg_arr[bg_mask] = 0
    Image.fromarray(bg_arr.astype(np.uint8)).save(f"./intermediates/keep_from_og_{id}.jpg")
    generation = bg_arr + out_arr
    gen = Image.fromarray(generation.astype(np.uint8))
    gen.save(f"./generations/{id}.jpg")

    base64img = None

    #print('clearing cache')
    torch.cuda.empty_cache()
    with open(f"./generations/{id}.jpg", "rb") as image_file:
        base64img = base64.b64encode(image_file.read()).decode("utf-8")

    return { "id": id, "image": base64img }

# @app.route("/api/in_fill/<id>")
# @cross_origin()
# def serve_in_fill(id):
#     done = False
#     return { "done": done }

app.run(port=5000, host="0.0.0.0")
