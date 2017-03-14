
import bisect
import random
import time
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
from sqlalchemy import func
from instrumenting.instrumenting import Timer
from soundexpy import soundex
from . import app
from gedcom import gedcom
from .models import *
from .helper import *
from .database import session
from .family_tree_inference.path_search import bidirectional_search_path

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
#    sleeptime = random.random()
#    print "sleeping {}s".format(sleeptime)
#    time.sleep(sleeptime)
    if xref and xref == "@first@":
        ind = Individual.query.filter_by(xref = xref).first()
        if not ind:
            xref = None
    if xref:
        t0 = time.time()
        ind = Individual.query.filter_by(xref = xref).first()
        #print "Querying took {} seconds.".format(time.time()-t0)
    else:
        count = session.query(func.max(Individual.id).label('max_id')).one()
        i = int(random.random() * count.max_id)
        ind = Individual.query.get(i)
    if ind:
        ind_dict = ind.as_dict()
        return jsonify({
            "result": True,
            "entry": ind_dict,
        })
    t0 = time.time()
    fam = Family.query.filter_by(xref = xref).first()
    #print "Family querying took {} seconds.".format(time.time()-t0)
    if fam:
        fam_dict = fam.as_dict()
        return jsonify({
            "result": True,
            "entry": fam_dict,
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


@app.route("/json/parishes/")
def json_parishes():
    parishes = Parish.query.all()
    return jsonify({
        "result": True,
        "parishes": [x.as_dict() for x in parishes],
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


##########################################
# Searching
##########################################

@app.route("/json/people-path-slow/<xref1>/<xref2>/")
def json_people_path_slow(xref1, xref2):
    t = Timer(True, 40)
    ind1 = Individual.query.filter_by(xref = xref1).first()
    ind2 = Individual.query.filter_by(xref = xref2).first()
    if ind1 == None or ind2 == None:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "some non-existing individual selected {}, {}".format(xref1, xref2),
            "error": "no-such-individual",
        })
    if ind1.component_id == 0 or ind1.component_id == None:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "components not populated; cannot search paths",
            "error": "no-component-info",
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
    buf = [(0, 0, ind2, None, (None, None))]
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
        if cur == ind1:
            break
        for fam_id, nei_id in json.loads(cur.neighboring_ids):
            nei = ind_dict[nei_id]
            # the 50. means that if people get children at over 50 years age,
            # the path might not be optimal
            prio = distance + abs(nei.birth_date_year - ind1.birth_date_year) / 50.
            pos = bisect.bisect(buf, (prio,))
            buf[pos:pos] = [(prio, distance + 1, nei, cur, (fam_id, nei_id))]
            adds += 1
    t.submeasure("searching for node")
    if not ind1 in routing:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "even though they were in the same component",
            "error": "unexpected-error",
        })
    path = []
    alt_path = []
    cur = ind1
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
    out_dicts = [x.as_dict() for x in path][::-1]
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

@app.route("/json/people-path/<xref1>/<xref2>/")
def json_people_path(xref1, xref2):
    t = Timer(True, 40)
    ind1 = Individual.query.filter_by(xref = xref1).first()
    ind2 = Individual.query.filter_by(xref = xref2).first()
    t.measure("endpoints queried")
    if ind1 == None or ind2 == None:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "some non-existing individual selected {}, {}".format(xref1, xref2),
            "error": "no-such-individual",
        })
    path = bidirectional_search_path(xref1, xref2)
    if not path:
        return jsonify({
            "result": False,
            "xrefs": [],
            "exists": False,
            "message": "individuals in different components",
        })
    path = map(str, path)
    out_xrefs = []
    out_dicts = []
    prev_x = None
    for pi, xref in enumerate(path[::-1]):
        x = Individual.query.filter_by(xref = xref).\
                options(joinedload(Individual.sup_families)).\
                options(joinedload(Individual.sub_families)).first()
        out_dicts.append(x.as_dict())
        if prev_x is None:
            out_xrefs.append([None, xref])
        else:
            matching_fam_xref = get_family_xref(x, prev_x)
            if not matching_fam_xref:
                msg = u"Next xref {} not found among {}.".format(xref, prev_x.neighboring_ids)
                print msg
                return jsonify({
                    "result": False,
                    "xrefs": [],
                    "exists": False,
                    "message": msg,
                    "error": msg,
                })
            else:
                out_xrefs.append([matching_fam_xref, xref])
        prev_x = x
    out_xrefs = out_xrefs[::-1]
    out_dicts = out_dicts[::-1]
    return jsonify({
        "result": True,
        "xrefs": out_xrefs,
        "inds": out_dicts,
        "exists": True,
        "component_id": -1,
        "length": len(path),
        "time": t.full_duration(),
        "visited_count": -1,
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


@app.route("/json/multi-search/", methods=["POST"])
def json_multi_search():
    def soundex_upper(s):
        return soundex.soundex(s.upper())
    def nop(s):
        return s
    def as_int(s):
        return int(s)
    conversions = {
        "firstname": {
            "field": "soundex_first",
            "function": soundex_upper,
        },
        "familyname": {
            "field": "soundex_family",
            "function": soundex_upper,
        },
        "xref": {
            "field": "xref",
            "function": nop,
        },
        "birthyear": {
            "field": "birth_date_year",
            "function": nop,
            "between": "-",
        },
        "parish": {
            "field": "parish_id",
            "function": as_int,
        },
    }
    t = Timer(True, 40)
    data = request.get_json()
    # construct queries
    query_limit = 5000
    query_truncate = 1000
    self_query_terms = []
    other_queries = []
    first_name_to_sort_by = None
    last_name_to_sort_by = None
    for d in data:
        if d["search_type"] not in conversions:
            mes = "no such conversion: {}".format(d["search_type"])
            print mes
            return jsonify({
                "result": False,
                "soundex": "",
                "message": mes,
                "inds": [],
            })
        con = conversions[d["search_type"]]
        if "between" in con and con["between"] in d["search_term"]:
            if len(d["search_term"].split(con["between"])) > 2:
                mes = "multiple between separators present"
                print mes
                return jsonify({
                    "result": False,
                    "soundex": "",
                    "message": mes,
                    "inds": [],
                })
            begin, end = [x.strip() for x in d["search_term"].split(con["between"])]
            query_term = getattr(Individual, con["field"]).between(begin, end)
        else:
            query_term = getattr(Individual, con["field"]) == con["function"](d["search_term"])
        if d["relation"] == "self":
            self_query_terms.append(query_term)
            if d["search_type"] == "firstname":
                first_name_to_sort_by = d["search_term"].lower()
            elif d["search_type"] == "familyname":
                last_name_to_sort_by = d["search_term"].lower()
        else:
            other_queries.append((d["relation"], query_term))

    t.measure("queries constructed")
    # query database
    if False: #other_queries: # NOTE Other than self queries disabled atm.
        sets = []
        if self_query_terms:
            sets.append(("self", set(Individual.query.filter(*self_query_terms).all())))
            t.submeasure("query for self")
        for relation, oq in other_queries:
            set_inds = set([])
            if relation == "parent":
                query_result = Individual.query.filter(oq).options(joinedload(Individual.sub_families)).limit(query_limit).all()
                for ind in query_result:
                    for sub_family in ind.sub_families:
                        for child in sub_family.children:
                            set_inds.add(child)
            if relation == "child":
                query_result = Individual.query.filter(oq).options(joinedload(Individual.sup_families)).limit(query_limit).all()
                for ind in query_result:
                    for sup_family in ind.sup_families:
                        for parent in sup_family.parents:
                            set_inds.add(parent)
            if relation == "sibling":
                query_result = Individual.query.filter(oq).options(joinedload(Individual.sup_families)).limit(query_limit).all()
                for ind in query_result:
                    for sup_family in ind.sup_families:
                        for child in sup_family.children:
                            if child == ind:
                                continue
                            set_inds.add(child)
            relationpath = None
            if relation == "grandparent":
                relationpath = ["up","up"]
            if relation == "grandchild":
                relationpath = ["down","down"]
            if relation == "cousin":
                relationpath = ["up","up","down","down"]
            if relation == "aunt":
                relationpath = ["up","up","down","female"]
            if relation == "uncle":
                relationpath = ["up","up","down","male"]
            if relationpath:
                if relationpath[-1] == "up":
                    group = Individual.query.filter(oq).options(joinedload(Individual.sub_families)).limit(query_limit).all()
                elif relationpath[-1] == "down":
                    group = Individual.query.filter(oq).options(joinedload(Individual.sup_families)).limit(query_limit).all()
                else:
                    group = Individual.query.filter(oq).limit(query_limit).all()
                gender = None
                while relationpath:
                    cur = relationpath.pop()
                    newgroup = set([])
                    # these directions are reversed, because we are following the path in opposite direction
                    if cur == "down":
                        for ind in group:
                            for sup_family in ind.sup_families:
                                for parent in sup_family.parents:
                                    if gender and parent.sex != gender:
                                        continue
                                    newgroup.add(parent)
                    elif cur == "up":
                        for ind in group:
                            for sub_family in ind.sub_families:
                                for child in sub_family.children:
                                    if gender and child.sex != gender:
                                        continue
                                    newgroup.add(child)
                    elif cur == "male":
                        gender = "M"
                        continue
                    elif cur == "female":
                        gender = "F"
                        continue
                    group = newgroup
                set_inds = group

            sets.append((relation, set_inds))
            t.submeasure("query for {}".format(relation))
        s = sets[0][1]
        for s2 in sets[1:]:
            s = s.intersection(s2[1])
        if len(sets) > 1:
            t.submeasure("set intersection")
        inds = list(s)
        print len(inds), "people"
    else:
        inds = Individual.query.filter(*self_query_terms).limit(query_truncate).all()
        if not inds:
            print "No matches"
            return jsonify({
                "soundex": "",
                "result": False,
                "inds": [],
            })
    t.measure("Database queried")
    # Sort the results.
    if first_name_to_sort_by is not None and last_name_to_sort_by is not None:
        inds = sorted(inds, key=lambda x: \
                jellyfish.jaro_winkler(x.name_first, first_name_to_sort_by) + \
                jellyfish.jaro_winkler(x.name_family, last_name_to_sort_by), reverse=True)
        t.measure("Candidates sorted with jaro winkler")
    elif first_name_to_sort_by is not None:
        inds = sorted(inds, key=lambda x: \
                jellyfish.jaro_winkler(x.name_first, first_name_to_sort_by), reverse=True)
        t.measure("Candidates sorted with jaro winkler")
    elif last_name_to_sort_by is not None:
        inds = sorted(inds, key=lambda x: \
                jellyfish.jaro_winkler(x.name_family, last_name_to_sort_by), reverse=True)
        t.measure("Candidates sorted with jaro winkler")
    # convert to dictionaries
    ind_dict = [x.as_dict() for x in inds[:query_truncate]]
    t.measure("Converted individuals to dicts")
    t.print_total()
    return jsonify({
        "soundex": "",
        "result": True,
        "count": len(inds),
        "inds": ind_dict,
        "time": t.full_duration(),
    })
