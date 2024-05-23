import os
from flask import Flask, redirect, request
import requests
import base64
import uuid
from flask_cors import CORS, cross_origin
from PIL import Image, ImageDraw
from io import BytesIO
from .image_pipeline import ImagePipelineTask
from svgpathtools import Path, parse_path, svgstr2paths

# from redis import Redis
# from rq import Queue

# r = Redis()
# q = Queue(connection=r)

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

def svg_to_mask(svg_str, shape):
    svg = svgstr2paths(svg_str)
    path = svg[0][0]
    image = Image.new("1", shape, 0)
    draw = ImageDraw.Draw(image)
    points = sample_path(path)
    draw.polygon(points, outline=1, fill=1)
    image.save("./backend/imgs/rasterized_path.png")

@app.route("/")
@cross_origin
def index():
    return redirect("./index.html")

@app.route("/api/in_fill", methods=["POST"])
@cross_origin()
def in_fill():
    content = request.get_json()

    print("Recieved this packet:", content)

    

    bg = Image.open(BytesIO(requests.get(content["bg_image_url"]).content))
    fg = Image.open(BytesIO(requests.get(content["fg_image_urls"][0]).content)) 

    svg_to_mask(content['paths'][0], bg.size)

    task = ImagePipelineTask((content["bg_height"], content["bg_width"]), bg, fg, (content["fg_image_coords"][0]["tl"]["y"], content["fg_image_coords"][0]["tl"]["x"]))

    id = uuid.uuid1()

    bg.save("./backend/imgs/{}.jpg".format(id.int))

    return { "id": id }

@app.route("/api/in_fill/<id>")
@cross_origin()
def serve_in_fill(id):
    done = False
    # get the appropriate image data
    return { "done": done }