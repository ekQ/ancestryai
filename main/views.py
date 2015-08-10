
import bisect
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
from instrumenting.instrumenting import Timer
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
def json_search_firstname(term):
    t = Timer()
    soundex_term = soundex.soundex(term.upper())
    inds = Individual.query.filter_by(soundex_first = soundex_term).all()
    if not inds:
        print "No matches"
        return jsonify({
            "soundex": soundex_term,
            "result": False,
        })
    t.measure("Database queried")
    inds = sorted(inds, key=lambda x: jellyfish.jaro_distance(x.name_first, term), reverse=True)
    t.measure("Candidates sorted with jaro distance")
    ind_dict = [x.as_dict() for x in inds]
    t.measure("Converted individuals to dicts")
    if app.debug:
        t.print_all()
    return jsonify({
        "soundex": soundex_term,
        "result": True,
        "count": len(inds),
        "inds": ind_dict,
        "time": t.full_duration(),
    })

@app.route("/json/search/familyname/<term>/")
def json_search_familyname(term):
    t = Timer()
    soundex_term = soundex.soundex(term.upper())
    inds = Individual.query.filter_by(soundex_family = soundex_term).all()
    if not inds:
        return jsonify({
            "soundex": soundex_term,
            "result": False,
        })
    t.measure("Database queried")
    inds = sorted(inds, key=lambda x: jellyfish.jaro_distance(x.name_family, term), reverse=True)
    t.measure("Candidates sorted with jaro distance")
    ind_dict = [x.as_dict() for x in inds]
    t.measure("Converted individuals to dicts")
    if app.debug:
        t.print_all()
    return jsonify({
        "soundex": soundex_term,
        "result": True,
        "count": len(inds),
        "inds": ind_dict,
        "time": t.full_duration(),
    })

@app.route("/json/search/pure-python-family/<term>/")
def json_search_pure_python_family(term):
    t = Timer()
    inds = Individual.query.all()
    t.measure("Fetched all individuals from database")
    inds = sorted(inds, key=lambda x: jellyfish.jaro_distance(x.name_family, term), reverse=True)
    t.measure("Sorted with jaro distance")
    inds = inds[:25]
    t.measure("Pruned to a limit")
    ind_dict = [x.as_dict() for x in inds]
    t.measure("Converted individuals to dicts")
    if app.debug:
        t.print_all()
    return jsonify({
        "soundex": "-",
        "result": True,
        "count": len(inds),
        "inds": ind_dict,
        "time": t.full_duration(),
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


@app.route("/json/people-path/<xref1>/<xref2>/")
def json_people_path(xref1, xref2):
    t = Timer(True, 40)
    ind1 = Individual.query.filter_by(xref = xref1).first()
    ind2 = Individual.query.filter_by(xref = xref2).first()
    if ind1 == None or ind2 == None:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "some non-existing individual selected {}, {}".format(xref1, xref2),
        })
    if ind1.component_id == 0 or ind1.component_id == None:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "components not populated; cannot search paths",
        })
    if ind1.component_id != ind2.component_id:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "individuals in different components",
        })
    cid = ind1.component_id
    t.measure("endpoints queried")
    # takes about a second to load them all
    inds = Individual.query.filter_by(component_id = cid).all()
    ind_dict = {x.xref: x for x in inds}
    t.measure("loaded everything")
    visited = set([])
    routing = {}
    routing_path_pieces = {}
    buf = [(0, 0, ind1, None, (None, None))]
    steps = 0
    adds = 0
    while buf:
        priority, distance, cur, source, path_piece = buf.pop(0)
        if cur.xref in visited:
            continue
        visited.add(cur.xref)
        routing[cur] = source
        routing_path_pieces[cur] = path_piece
        steps += 1
        if cur == ind2:
            break
        for fam_id, nei_id in json.loads(cur.neighboring_ids):
            nei = ind_dict[nei_id]
            # the 50. means that if people get children at over 50 years age,
            # the path might not be optimal
            prio = distance + abs(nei.birth_date_year - ind2.birth_date_year) / 50.
            pos = bisect.bisect(buf, (prio,))
            buf[pos:pos] = [(prio, distance + 1, nei, cur, (fam_id, nei_id))]
            adds += 1
    t.submeasure("searching for node")
    if not ind2 in routing:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "even though they were in the same component",
        })
    path = []
    alt_path = []
    cur = ind2
    while cur:
        path.append(cur)
        if routing[cur]:
            alt_path.append(routing_path_pieces[cur])
        else:
            alt_path.append([None, cur.xref])
        cur = routing[cur]
    t.submeasure("reconstructing path")
    t.measure("graph search for the path")
    out_xrefs = alt_path[::-1]
    out_dicts = [x.as_dict() for x in path]
    t.measure("converting for output")
    t.print_total()
    print "visited {} unique nodes and added to buffer {} nodes".format(steps, adds)
    return jsonify({
        "result": True,
        "xrefs": out_xrefs,
        "inds": out_dicts,
        "exists": True,
        "component_id": ind1.component_id,
        "length": len(path),
        "time": t.full_duration(),
        "visited_count": steps,
    })

@app.route("/json/celebrities/")
def json_celebrities():
    t = Timer(True, 40)
    inds = Individual.query.filter_by(is_celebrity = True).all()
    t.measure("loading celebrities")
    inds = sorted(inds, key=lambda x: (x.name_family, x.name_first))
    t.measure("sorting")
    ind_dicts = [x.as_dict() for x in inds]
    t.measure("converting to dictionaries")
    t.print_total()
    return jsonify({
        "result": True,
        "inds": ind_dicts,
        "time": t.full_duration(),
    })
