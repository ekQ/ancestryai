
from flask import (
    g,
    render_template,
    redirect,
    url_for,
    flash,
    abort,
    jsonify,
)
from . import app
from gedcom import gedcom

@app.route("/")
def index():
    return render_template("index.html", **g.context)


@app.route("/json/load/<xref>/")
def json_individual(xref):
    root = gedcom.read_file("gedcom/test-gedcom.txt")
    entry = root.by_xref(xref)
    return jsonify({
        "result": True if entry else False,
        "entry": entry.as_dict() if entry else None,
    })

