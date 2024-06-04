from flask import Flask, request
from flask_cors import CORS, cross_origin
import pickle
from PIL import Image
import torch
from custom_utils import *
import time 
import requests
import uuid

from auto_segmenter import AutoSegmenter

from io import BytesIO

def clip_base64_imgtags(url):
    return url[url.find("base64,")+len("base64,"):]

def get_img(url):
    if url.find("base64") != -1:
        # encoded in base64
        print('decoding base64 image')
        return Image.open(BytesIO(base64.b64decode(clip_base64_imgtags(url))))
    else:
        print('fetching image from url')
        response = requests.get(url)
        img = Image.open(BytesIO(response.content))
        return img

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

@app.route("/api/segment", methods=["POST"])
@cross_origin()
def segment():
    global mask_map
    global request_to_imgs
    
    print("current state of the mask_map")
    print(mask_map.keys())
   
    print('clearing cache')
    torch.cuda.empty_cache()
    content = request.get_json()
    
    print('segmenting...')

    # # if the images are base64 encoded, decode them.

    bg = get_img(content["bg_image_url"])
    fg = get_img(content["fg_image_url"])


    bg_cloth_id = content["bg_cloth_id"] # the specific target id in the background
    fg_cloth_id = content["fg_cloth_id"] # the specific target id in the foreground

    cloth_type = content["cloth_type"] # this is the segment target

    bg_mask = None
    fg_mask = None
    # look up fg and bg in the in-memory map to see if we have the masks for the segment target already
    if bg_cloth_id in mask_map:
        print('using cached background mask')
        bg_mask = mask_map[bg_cloth_id]
    
    if fg_cloth_id in mask_map:
        print('using cached foreground mask')
        fg_mask = mask_map[fg_cloth_id]

    print('clearing cache again')
    torch.cuda.empty_cache()
    segment_start_time = time.time()
    if bg_mask is None or fg_mask is None:
        seg = AutoSegmenter()
        if bg_mask is None:
            bg_masks = seg.run_segmenter_single(bg, [cloth_type])
            bg_mask = bg_masks[0][0]
        if fg_mask is None:
            fg_masks = seg.run_segmenter_single(fg, [cloth_type])
            fg_mask = fg_masks[0][0]

    print(f"Segmentation took {time.time() - segment_start_time} seconds")

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

    bg_mask = widen_mask(bg_mask, 5)
    fg_mask = widen_mask(fg_mask, 3)

    print(f"Widening took {time.time() - widen_start_time} seconds")

    mask_map[bg_cloth_id] = bg_mask
    mask_map[fg_cloth_id] = fg_mask

    # # send back the bg_mask and fg_mask as base64
    bg_mask = Image.fromarray(bg_mask.astype(np.uint8)*255)
    fg_mask = Image.fromarray(fg_mask.astype(np.uint8)*255)

    # bg_mask.save(f"./masks/bg_mask_{request_id}.jpg")

    #base64bg = bg_mask.tobytes()
    buffered_bg = BytesIO()
    # bg_mask.save(buffered_bg, format="JPEG")
    base64bg = base64.b64encode(buffered_bg.getvalue())

    buffered_fg = BytesIO()
    # fg_mask.save(buffered_fg, format="JPEG")
    base64fg = base64.b64encode(buffered_fg.getvalue())

    # should we be decoding here?
    return { "bg_mask": base64bg.decode("utf-8"), "fg_mask": base64fg.decode("utf-8"), "request_id": request_id }

app.run(port=5000, host="0.0.0.0")