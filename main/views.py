
import random
import jellyfish
import time
from datetime import datetime
from flask import (
    g,
    render_template,
    redirect,
    url_for,
    flash,
    abort,
    jsonify,
    request,
)
from flask.ext.babel import refresh
from soundexpy import soundex
from . import app
from gedcom import gedcom
from .models import *

@app.route("/")
def index():
    g.context["at_entrance"] = True
    return render_template("index.html", **g.context)

@app.route("/app/")
def app_directly():
    g.context["at_entrance"] = False
    return render_template("index.html", **g.context)

@app.route("/json/load-old/<xref>/")
def json_individual(xref):
    root = gedcom.read_file("gedcom/test-gedcom.txt")
    entry = root.by_xref(xref)
    return jsonify({
        "result": True if entry else False,
        "entry": entry.as_dict() if entry else None,
    })


@app.route("/json/load/<xref>/")
@app.route("/json/load-any/")
def json_load(xref = None):
    if xref and xref == "@first@":
        ind = Individual.query.filter_by(xref = xref).first()
        if not ind:
            xref = None
    if xref:
        ind = Individual.query.filter_by(xref = xref).first()
    else:
        query = Individual.query
        count = int(query.count())
        i = int(random.random() * count)
        ind = query.offset(i).first()
    if ind:
        return jsonify({
            "result": True,
            "entry": ind.as_dict(),
        })
    fam = Family.query.filter_by(xref = xref).first()
    if fam:
        return jsonify({
            "result": True,
            "entry": fam.as_dict(),
        })
    return jsonify({
        "result": False,
        "entry": None,
    })

# todo: only accept as post
@app.route("/language/<lang>/", methods=["get", "post"])
def language(lang):
    app.config["BABEL_DEFAULT_LOCALE"] = lang
    refresh()
    return redirect(url_for("index"))


@app.route("/json/search/firstname/<term>/")
def json_search_firstname_instrumented(term):
    t0 = time.time()
    soundex_term = soundex.soundex(term)
    t2 = time.time()
    print "-"*60,2
    indfs = IndividualField.query.filter_by(value = soundex_term, key = "First Name Soundex").all()
#    indfs = IndividualField.query.all()
    if not indfs:
        return jsonify({
            "soundex": soundex_term,
            "result": False,
        })
    t3 = time.time()
    print "-"*60,3
    indfs = sorted(indfs, key=lambda x: jellyfish.jaro_distance(x.value, term), reverse=True)
    t4 = time.time()
    print "-"*60,4
    reduced = []
    visited = set([])
    for indf in indfs:
        if indf.individual_id in visited:
            continue
        reduced.append(indf)
        visited.add(indf.individual_id)
        if len(reduced) == 50:
            break
    inds = [x.individual for x in reduced]
    print len(indfs), len(inds)
    t5 = time.time()
    print "-"*60,5
    result = [x.as_dict() for x in inds]
    t1 = time.time()
    def to8ms(a):
        return str(int(a*1000)).rjust(8)
    print """
soundex on term:  {}ms
query from db:    {}ms
jaro_distance:    {}ms
unique and limit: {}ms
as dictionaries:  {}ms
----------------------------
total:            {}ms
""".format(to8ms(t2-t0), to8ms(t3-t2), to8ms(t4-t3), to8ms(t5-t4), to8ms(t1-t5), to8ms(t1-t0))
    return jsonify({
        "soundex": soundex_term,
        "result": True,
        "count": len(inds),
        "inds": result,
        "time": t1 - t0,
    })

@app.route("/json/search/familyname/<term>/")
def json_search_familyname(term):
    t0 = time.time()
    soundex_term = soundex.soundex(term.upper())
    inds = None
    if not inds:
        inds = Individual.query.filter_by(soundex_family = soundex_term).all()
    if not inds:
        return jsonify({
            "soundex": soundex_term,
            "result": False,
        })
    inds = sorted(inds, key=lambda x: jellyfish.jaro_distance(x.name_family, term), reverse=True)
    result = [x.as_dict() for x in inds]
    t1 = time.time()
    return jsonify({
        "soundex": soundex_term,
        "result": True,
        "count": len(inds),
        "inds": result,
        "time": t1 - t0,
    })

@app.route("/json/search/pure-python-family/<term>/")
def json_search_pure_python_family(term):
    t0 = time.time()
    inds = Individual.query.all()
    inds = sorted(inds, key=lambda x: jellyfish.jaro_distance(x.name_family, term), reverse=True)
    inds = inds[:25]
    t1 = time.time()
    return jsonify({
        "soundex6": "-",
        "result": True,
        "count": len(inds),
        "inds": [x.as_dict() for x in inds],
        "time": t1 - t0,
    })

@app.route("/json/setting/<key>/")
def json_setting(key):
    t0 = time.time()
    setting = Setting.query.filter_by(key = key).first()
    t1 = time.time()
    return jsonify({
        "result": setting != None,
        key: setting.value if setting else None,
        "time": t1 - t0,
    })



###########################################
# Commenting
###########################################
@app.route("/json/leave/comment/<xref>/", methods=["POST"])
def json_leave_comment(xref):
    content = request.form.get("content", None)
    ip = request.remote_addr
    author_name = request.form.get("author_name", None)
    author_email = request.form.get("author_email", None)
    comment_type = request.form.get("comment_type", None)
    now = datetime.now()
    if not content:
        # todo: more validation?
        return jsonify({
            "result": False,
        })
    print [ip, "said", content, "about", xref, 3, "at", now.isoformat()]
    comment = Comment(
            xref = xref,
            content = content,
            author_ip_address = ip,
            author_name = author_name,
            author_email = author_email,
            comment_type = comment_type,
            written_on = now,
            )
    session.add(comment)
    session.commit()
    return jsonify({
        "result": True,
    })
@app.route("/json/load/comments/<xref>/")
def json_load_comments(xref):
    comments = Comment.query.filter_by(xref = xref).all()
    return jsonify({
        "result": True,
        "xref": xref,
        "comments": [x.as_dict() for x in comments],
    })

