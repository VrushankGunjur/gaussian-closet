import os
from flask import Flask, redirect, request
import requests
import base64
import uuid
from flask_cors import CORS, cross_origin
from PIL import Image
from io import BytesIO
from .image_pipeline import ImagePipelineTask

img = None

# from redis import Redis
# from rq import Queue

# r = Redis()
# q = Queue(connection=r)

app = Flask(__name__, static_folder="../web/build", static_url_path="/")
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

@app.route("/")
@cross_origin
def index():
    return redirect("./index.html")

@app.route("/api/in_fill", methods=["POST"])
@cross_origin()
def in_fill():
    content = request.get_json()

    bg = Image.open(BytesIO(requests.get(content["bg_image_url"]).content))
    fg = Image.open(BytesIO(requests.get(content["fg_image_urls"][0]).content)) 

    task = ImagePipelineTask((content["bg_height"], content["bg_width"]), bg, fg, (content["fg_image_coords"][0]["tl"]["y"], content["fg_image_coords"][0]["tl"]["x"]))

    id = uuid.uuid1()

    return { "id": id }

@app.route("/api/in_fill/<id>")
@cross_origin()
def serve_in_fill(id):
    done = False
    # get the appropriate image data
    return { "done": done }