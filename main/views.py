
from flask import (
    g,
    render_template,
    redirect,
    url_for,
    flash,
    abort,
    jsonify,
)
from flask.ext.babel import refresh
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

# todo: only accept as post
@app.route("/language/<lang>/", methods=["get", "post"])
def language(lang):
    app.config["BABEL_DEFAULT_LOCALE"] = lang
    refresh()
    return redirect(url_for("index"))

