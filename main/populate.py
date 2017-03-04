
import os
import time
import datetime as dt
import json
import sys
from instrumenting.instrumenting import Timer
from gedcom import gedcom
from soundexpy import soundex
from .models import *
from .database import session

def ensure_unicode(s):
    if isinstance(s, unicode):
        return s
    if isinstance(s, str):
        return s.decode("utf8")
    return unicode(s)
u = ensure_unicode

# todo: use the gedcom.py implementation instead
def get_chain(root, chain):
    tag = root
    for key in chain.split("."):
        if key in ["level", "xref", "tag", "value", "children", "parent"]:
            tag = getattr(tag, key)
        elif key == key.lower():
            tag = tag.additional.get(key, None)
        else:
            tag = tag.first_tag(key)
            if not tag:
                return None
    return ensure_unicode(tag)

def populate_from_gedcom(fname, store_gedcom=False):
    t0 = time.time()
    root = gedcom.read_file(fname)
    t1 = time.time()
    print "gedcom parsed     {}ms".format(str(int((t1 - t0)*1000)).rjust(8))
    for entry in root.traverse():
        if entry.tag == "FAM":
            if entry.level != 0:
                continue
            candidate = Family.query.filter_by(xref = ensure_unicode(entry.xref)).first()
            if candidate:
                print "Family '{}' already exists".format(entry.xref)
                continue
            fam = Family(
                    xref = ensure_unicode(entry.xref),
                    tag = u"FAM",
                    loaded_gedcom = ensure_unicode(gedcom.reform(entry)) if store_gedcom else None,
                    )
            session.add(fam)
    session.flush()
    t2 = time.time()
    print "families added    {}ms".format(str(int((t2 - t1)*1000)).rjust(8))
    for entry in root.traverse():
        if entry.tag == "INDI":
            if entry.level != 0:
                continue
            candidate = Individual.query.filter_by(xref = ensure_unicode(entry.xref)).first()
            if candidate:
                print "Individual '{}' already exists".format(entry.xref)
                continue
            names = get_chain(entry, "NAME.value").split("/")
            name_first = names[0].strip()
            name_family = names[1].strip()
            ind = Individual(
                    xref = ensure_unicode(entry.xref),
                    name = get_chain(entry, "NAME.value"),
                    name_first = name_first,
                    name_family = name_family,
                    tag = u"INDI",
                    sex = get_chain(entry, "SEX.value"),
                    birth_date_string = get_chain(entry, "BIRT.DATE.value"),
                    birth_date_year = get_chain(entry, "BIRT.DATE.year"),
                    # birth_date
                    death_date_string = get_chain(entry, "DEAT.DATE.value"),
                    death_date_year = get_chain(entry, "DEAT.DATE.year"),
                    # death_date
                    # soundex encodings
                    soundex_first = u(soundex.soundex(name_first.upper())),
                    soundex_family = u(soundex.soundex(name_family.upper())),
                    # loaded gedcom
                    loaded_gedcom = ensure_unicode(gedcom.reform(entry)) if store_gedcom else None,
                    )
            for tag in entry.by_tag("FAMC"):
                fam = Family.query.filter_by(xref = ensure_unicode(tag.value)).first()
                if not fam:
                    print "Family '{}' not found for individual '{}'".format(tag.xref, xref)
                    continue
                fam.children.append(ind)
            for tag in entry.by_tag("FAMS"):
                fam = Family.query.filter_by(xref = ensure_unicode(tag.value)).first()
                if not fam:
                    print "Family '{}' not found for individual '{}'".format(tag.xref, xref)
                    continue
                fam.parents.append(ind)
            session.add(ind)
    t3 = time.time()
    print "individuals added {}ms".format(str(int((t3 - t2)*1000)).rjust(8))
    if root.get_chain("HEAD.ROLE.value") == "test":
        testnote = ensure_unicode(root.get_chain("HEAD.ROLE.NOTE.value"))
        if testnote:
            testnotesetting = Setting.query.filter_by(key = "testnote").first()
            if testnotesetting:
                testnotesetting.value = testnote
            else:
                testnotesetting = Setting(key = "testnote", value = testnote)
                session.add(testnotesetting)
        print "testnote set"
    session.commit()

def reform_gedcom():
    def update(entry, chain, value):
        if value == None:
            return
        entry.edit_chain(chain, value)
    for ind in Individual.query.all():
        nextid = 123
        if ind.loaded_gedcom:
            entry = gedcom.read_string(ind.loaded_gedcom)
        else:
            entry = gedcom.Entry(0, "@I{}@".format(nextid), "INDI", None)
        update(entry, "NAME.value", ind.name)
        update(entry, "SEX.value", ind.sex)
        update(entry, "BIRT.DATE.value", ind.birth_date_string)
        update(entry, "DEAT.DATE.value", ind.death_date_string)
        for fam in ind.sub_families:
            print fam
        ind.loaded_gedcom = gedcom.reform(entry)
    for fam in Family.query.all():
        nextid = 123
        if fam.loaded_gedcom:
            entry = gedcom.read_string(fam.loaded_gedcom)
        else:
            entry = gedcom.Entry(0, "@F{}@".format(nextid), "FAM", None)


def yield_data_dicts(path, batch_idx=None, num_batches=None, is_one_json=False):
    with open(path) as f:
        if is_one_json:
            data = json.load(f)
            for d in data:
                yield d
        else:
            for i, line in enumerate(f):
                #if i == 10000:
                #    break
                if batch_idx is not None and num_batches is not None and i % num_batches != batch_idx:
                    continue
                yield json.loads(line)


def populate_from_recons(fname, batch_idx=None, num_batches=None):
    t = Timer(True, 48)
    base = os.path.dirname(fname)
    f = open(fname)
    lines = f.readlines()
    f.close()
    sources = {}
    for line in lines:
        source, sourcefile = [x.strip() for x in line.split(":")]
        sources[source] = os.path.join(base, sourcefile)
    t.measure("header processed")
    count_parishes = None
    count_villages = None
    count_individuals = None
    count_families = None
    if "parishes" in sources:
        with open(sources["parishes"]) as f:
            data = json.load(f)
            for d in data:
                parish = Parish(**d)
                session.add(parish)
            count_parishes = len(data)
    t.measure("{} parishes added".format(count_parishes))
    if "villages" in sources:
        with open(sources["villages"]) as f:
            data = json.load(f)
            for d in data:
                village = Village(**d)
                session.add(village)
            count_villages = len(data)
    session.flush()
    t.measure("{} villages added".format(count_villages))
    if "individuals" in sources:
        count_individuals = 0
        for didx, d in enumerate(yield_data_dicts(sources["individuals"], batch_idx=batch_idx,
                                                  num_batches=num_batches)):
            name_first = u(" ".join(d["name"].split()[:-1]))
            name_family = u(d["name"].split()[-1] if d["name"].strip() else "")
            ind = Individual(
                    xref = u(d["hiski_id"]),
                    name = u(d["name"]),
                    name_first = name_first,
                    name_family = name_family,
                    tag = u"INDI",
                    sex = u"?",
                    is_celebrity = d.get("is_celebrity", False),
                    birth_date_string = u"{}.{}.{}".format(d["day"], d["month"], d["year"]),
                    birth_date_year = d["year"],
                    death_date_string = None,
                    death_date_year = None,
                    # todo: revise soundex storing to be more sensible
                    soundex_first = u(soundex.soundex(name_first.upper())),
                    soundex_family = u(soundex.soundex(name_family.upper())),
                    village_id = d["village_id"],
                    parish_id = d["parish_id"],
                    )
            session.add(ind)
            count_individuals += 1
            if didx % 10000 == 0:
                print "\t{}\t(villages and parishes linked for {} individuals.)".format(
                        dt.datetime.now().isoformat()[:-7], didx)
                sys.stdout.flush()
                session.flush()
        t.submeasure("individual objects created")
    session.commit()
    t.measure("{} individuals added".format(count_individuals))
    if "edges" in sources:
        for didx, d in enumerate(yield_data_dicts(sources["edges"], batch_idx=batch_idx,
                                                  num_batches=num_batches)):
            pp = ParentProbability(
                    parent_id = d["parent"],
                    person_id = d["child"],
                    probability = d["prob"],
                    is_dad = d["dad"],
                    )
            session.add(pp)
            if didx % 10000 == 0:
                print "\t{}\t({} edges processed.)".format(
                        dt.datetime.now().isoformat()[:-7], didx)
                sys.stdout.flush()
                session.flush()
        t.submeasure("parent probabilities")
        parent_candidates = {}
        for didx, d in enumerate(yield_data_dicts(sources["edges"], batch_idx=batch_idx,
                                                  num_batches=num_batches)):
            if not d["child"] in parent_candidates:
                parent_candidates[d["child"]] = []
            parent_candidates[d["child"]].append(d)
        t.submeasure("edges to parent_candidates")
        family_candidates = {}
        of_len = {}
        for child, parents in parent_candidates.iteritems():
            dads = sorted([x for x in parents if x["dad"]], key = lambda x: x["prob"], reverse = True)
            moms = sorted([x for x in parents if not x["dad"]], key = lambda x: x["prob"], reverse = True)
            key = []
            if dads:
                key.append(dads[0])
            if moms:
                key.append(moms[0])
            key = tuple([x["parent"] for x in key])
            if not key in family_candidates:
                family_candidates[key] = []
            family_candidates[key].append(child)
            of_len[len(parents)] = of_len.get(len(parents), 0) + 1
        t.submeasure("parent_candidates to family_candidates")
        i = 0
        for parents, children in family_candidates.iteritems():
            i += 1
            fam_id = u"F{}".format(i)
            fam = Family(
                    xref = fam_id,
                    tag = u"FAM",
                    )
            session.add(fam)
            for parent in parents:
                ind = Individual.query.filter_by(xref = parent).first()
                fam.parents.append(ind)
            for child in children:
                ind = Individual.query.filter_by(xref = child).first()
                fam.children.append(ind)
        t.submeasure("families added and linked to individuals")
        count_families = i
    t.measure("{} families added".format(count_families))
    for ind in Individual.query.all():
        ind.pre_dicted = u(json.dumps(ind.as_dict()))
    t.measure("{} individuals pre dicted".format(count_individuals))
    session.commit()
    t.measure("commit")
    t.print_total()


def populate_component_ids():
    t = Timer(True, 60)
    # I'm not sure why the joinedload caused an exception, seemed like limit of
    # how much sqlite or sqlalchemy can retrieve from a query.
#    inds = Individual.query.options(joinedload("*")).all()
    inds = Individual.query.all()
    fams = Family.query.options().all()
#    dict_fams = {x.xref: x for x in fams}
    t.measure("queried to memory")
    for ind in inds:
        ind.component_id = 0
    t.measure("resetted component ids")
    next_id = 0
    max_size = 0
    for ind in inds:
        if ind.component_id > 0:
            continue
        next_id += 1
        buf = [ind]
        size = 0
        while buf:
            cur = buf.pop()
            if cur.component_id > 0:
                continue
            cur.component_id = next_id
            size += 1
            n_ids = []
            for fam in cur.sub_families + cur.sup_families:
                fam.component_id = next_id
                for ind2 in fam.parents + fam.children:
                    buf.append(ind2)
                    n_ids.append([fam.xref, ind2.xref])
            cur.neighboring_ids = u(json.dumps(n_ids))
#        t.submeasure("floodfill component {}".format(next_id))
        max_size = max(max_size, size)
    t.measure("floodfill {} components for {} people, max size {}".format(next_id, len(inds), max_size))
    session.commit()
    t.measure("commit")
    t.print_total()
