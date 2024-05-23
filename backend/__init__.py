import os
from flask import Flask, redirect, request
import base64
import uuid
from flask_cors import CORS, cross_origin

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
    print("GOT SOME CONTENT", content['hello'])
    # do some processing with the image here
    return { "id": uuid.uuid1() }

@app.route("/api/in_fill/<id>")
@cross_origin()
def serve_in_fill(id):
    done = False
    # get the appropriate image data
    return { "done": done }