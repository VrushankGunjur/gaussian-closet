import os
from flask import Flask, redirect, url_for

app = Flask(__name__, static_folder="../web/build", static_url_path="/")

@app.route("/")
def index():
    return redirect("./index.html")
