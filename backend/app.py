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

@app.route("/")
@cross_origin()
def index():
    return redirect("./index.html")

@app.route("/api/in_fill", methods=["POST"])
@cross_origin()
def in_fill():
    content = request.get_json()

    bg = Image.open(BytesIO(requests.get(content["bg_image_url"]).content))
    fg = Image.open(BytesIO(requests.get(content["fg_image_url"]).content)) 

    bg_mask, fg_mask = None, None

    if (content["segment_type"] == 'auto'):

        from auto_segmenter import AutoSegmenter

        seg = AutoSegmenter()

        bg_mask, fg_mask = seg.run_segmenter(bg, fg, [content["segment_target"]])
        
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

    torch.cuda.empty_cache()

    from run_inference import inference_single_image

    task = AnyDoorTask(bg, bg_mask, fg, fg_mask, inference_single_image)

    id = uuid.uuid1()

    out = Image.fromarray(task.run())
    out.save(f"./imgs/{id}.jpg")

    base64img = None

    with open(f"./imgs/{id}.jpg", "rb") as image_file:
        base64img = base64.b64encode(image_file.read()).decode("utf-8")

    return { "id": id, "image": base64img }

@app.route("/api/in_fill/<id>")
@cross_origin()
def serve_in_fill(id):
    done = False
    return { "done": done }

app.run(port=5000, host="0.0.0.0")
