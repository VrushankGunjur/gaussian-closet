from flask import Flask, request
from flask_cors import CORS, cross_origin
import pickle
from PIL import Image

from auto_segmenter import AutoSegmenter

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

@app.route("/api/segment", methods=["POST"])
@cross_origin()
def segment():
    content = request.get_json()

    segmenter = AutoSegmenter()

    bg = Image.open(pickle.loads(content["bg"]))
    fg = Image.open(pickle.loads(content["fg"]))
    segment_target = content["segment_target"]

    bg_mask, fg_mask = segmenter.run_segmenter(bg, fg, [segment_target])

    return {
        "bg_mask": pickle.dumps(bg_mask),
        "fg_mask": pickle.dumps(fg_mask)
    }

app.run(port=5000, host="0.0.0.0")