
import time
from gedcom import gedcom
from soundexpy import soundex
from .models import *
from .database import session

def ensure_unicode(s):
    if isinstance(s, str):
        return s.decode("utf8")
    return s

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

def populate_from_gedcom(fname):
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
                    soundex6first = ensure_unicode(soundex.soundex(name_first, 6)),
                    soundex6family = ensure_unicode(soundex.soundex(name_family, 6)),
                    soundex3first = ensure_unicode(soundex.soundex(name_first, 3)),
                    soundex3family = ensure_unicode(soundex.soundex(name_family, 3)),
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
    session.commit()
    t3 = time.time()
    print "individuals added {}ms".format(str(int((t3 - t2)*1000)).rjust(8))

