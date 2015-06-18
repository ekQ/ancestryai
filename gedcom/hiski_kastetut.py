# -*- coding: utf-8 -*-
import sys
import re
import jellyfish
from gedcom import *
import hiski_sqlalchemy as db

re_hiski_kastetut = re.compile("Hiski (?P<hiskitype>[^[]+) \[(?P<hiskiid>[0-9]+)\]")

def CAUS(entry):
    if entry.value == None:
        return
    s = entry.value
    for match in re_hiski_kastetut.finditer(s):
        hiskitype = match.groupdict()["hiskitype"]
        hiskiid = match.groupdict()["hiskiid"]
        if not "hiski" in entry.additional:
            entry.additional["hiski"] = {}
        if not hiskitype in entry.additional["hiski"]:
            entry.additional["hiski"][hiskitype] = []
        entry.additional["hiski"][hiskitype].append(hiskiid)
specials.CAUS = CAUS

def parse_hiski_caus():
    if len(sys.argv) < 3:
        print "python {} edgelist <gedcom-file>".format(sys.argv[0])
        print "python {} prune <gedcom-file>".format(sys.argv[0])
        sys.exit()
    root = read_file(sys.argv[2])
    if sys.argv[1] == "edgelist":
        individuals = {}
        edges = []
        # Add all individuals to the dict
        for entry in root.traverse():
            if entry.tag == "INDI":
                individuals[entry.xref] = entry
                # Family of this individual (not to be confused with
                # entry.children and entry.parent)
                entry.childs = []
                entry.parents = []
        # Read in family relations
        for entry in root.traverse():
            if entry.tag == "FAM":
                parents = []
                children = []
                husbxref = entry.get_chain("HUSB.value")
                if husbxref:
                    parents.append(individuals[husbxref])
                wifexref = entry.get_chain("WIFE.value")
                if wifexref:
                    parents.append(individuals[wifexref])
                for childxref in entry.get_multi_chain("CHIL.value"):
                    children.append(individuals[childxref])

                for parent in parents:
                    for child in children:
                        parent.childs.append(child)
                        child.parents.append(parent)

        fullids = {}
        for ind in individuals.values():
            hiski = ind.get_chain("EVEN.CAUS.hiski")
            fullid = ind.xref
            if hiski:
                for hiskitype, lst in sorted(hiski.items()):
                    for hiskiid in sorted(lst):
                        fullid += ":{}{}".format(hiskitype, hiskiid)
            fullids[ind.xref] = fullid

        for ind in individuals.values():
            if not ind.get_chain("EVEN.CAUS.hiski"):
                continue
            for other in ind.childs:
                if not other.get_chain("EVEN.CAUS.hiski"):
                    continue
                edges.append((fullids[ind.xref], fullids[other.xref]))

        for a,b in edges:
            print a, b
    if sys.argv[1] == "prune":
        individuals = {}
        for entry in root.traverse():
            if entry.tag == "INDI":
                individuals[entry.xref] = entry
                hiski = entry.get_chain("EVEN.CAUS.hiski")
                if not hiski:
                    entry.drop()
        for entry in root.traverse():
            if entry.tag == "FAM":
                drop = True
                for sub in entry.by_tag("CHIL") + entry.by_tag("HUSB") + entry.by_tag("WIFE"):
                    xref = sub.value
                    other = individuals.get(xref, None)
                    if other and not other.dropped:
                        drop = False
                        break
                if drop:
                    entry.drop()
        for entry in root.traverse():
            if entry.tag not in ["INDI", "FAM", "ROOT"] and entry.level == 0:
                entry.drop()
        reprint(root)


re_hiski_kastetut_sour = re.compile("Hiski (?P<hiskitype>[^[]+) \[(?P<hiskiid>[0-9]+)\]")

def TITL(entry):
    if entry.value == None:
        return
    s = entry.value
    for match in re_hiski_kastetut_sour.finditer(s):
        hiskitype = match.groupdict()["hiskitype"]
        hiskiid = match.groupdict()["hiskiid"]
        if not "hiski" in entry.additional:
            entry.additional["hiski"] = {}
        if not hiskitype in entry.additional["hiski"]:
            entry.additional["hiski"][hiskitype] = []
        entry.additional["hiski"][hiskitype].append(hiskiid)
specials.TITL = TITL

def name_similarity(hiski_name, ged_name):
    ged_name = unicode(ged_name.lower(), encoding='utf-8')
    hiski_name = unicode(hiski_name.lower(), encoding='utf-8')
    #if ged_name.startswith(ged_name):
    #    return 1
    return jellyfish.jaro_winkler(hiski_name, ged_name)

def parse_hiski_sour(gedcom_file):
    root = read_file(gedcom_file)

    individuals = {}
    sources = {}
    edgelist = []
    G_data = []
    # Add all individuals to the dict
    for entry in root.traverse():
        if entry.tag == "INDI":
            individuals[entry.xref] = entry
            # Family of this individual (not to be confused with
            # entry.children and entry.parent)
            entry.childs = []
            entry.parents = []
    # Parse families and sources
    for entry in root.traverse():
        if entry.tag == "FAM":
            parents = []
            children = []
            husbxref = entry.get_chain("HUSB.value")
            dad = None
            if husbxref:
                dad = individuals[husbxref]
                parents.append((dad, "dad"))
            wifexref = entry.get_chain("WIFE.value")
            mom = None
            if wifexref:
                mom = individuals[wifexref]
                parents.append((mom, "mom"))
            for childxref in entry.get_multi_chain("CHIL.value"):
                child = individuals[childxref]
                children.append(child)
                for parent, ptype in parents:
                    parent.childs.append(child)
                    child.parents.append(parent)
                    edgelist.append((parent.xref, child.xref))
                    # Construct an edge dict
                    edge = {"parent":parent.xref, "child": child.xref,
                            "dad":ptype=="dad", "parent_hiski":False,
                            "child_hiski":False}
                    G_data.append(edge)

        elif entry.tag == "SOUR":
            hiski = entry.get_chain("TITL.hiski")
            if hiski and "kastetut" in hiski:
                # Take simply the first baptism ID
                bap_id = hiski["kastetut"][0]
                #bap_id = "-".join(hiski["kastetut"])
                sources[entry.xref] = bap_id
    print "%d sources available" % len(sources)

    hiski_infos = {}
    xref2hid = {}
    # Make sure that one hiski id is not assigned to multiple xrefs
    used_hids = {}
    n_match = 0
    n_approximates = 0
    n_nomatch = 0
    for ind in individuals.values():
        source_id = ind.get_chain("NAME.SOUR.value")
        # Consider only sources that refer to a HisKi baptism event
        if source_id in sources:
            hiski_id = sources[source_id]
            firstname = ind.get_chain("NAME.GIVN.value")
            if firstname is None:
                firstname = "(NN)"
            birth_date = ind.get_chain("BIRT.DATE.value")
            if birth_date is None:
                n_nomatch += 1
                continue
            birth_year = birth_date.split()[-1]
            try:
                birth_year = int(birth_year)
            except:
                print "Failed to convert birth year:", birth_year, ind.xref
                birth_year = -100
            # Get name in the Hiski DB
            person = db.Person.query.filter(db.Person.id==hiski_id).first()
            hiski_name = person.get_clean_first_name().encode('utf-8')
            dad_full_name = person.get_clean_dad_name().encode('utf-8')
            hiski_birth_year = person.year
            try:
                hiski_birth_year = int(hiski_birth_year)
            except:
                print "Failed to convert hiski birth year:", hiski_birth_year
                hiski_birth_year = -1
            hiski_infos[ind.xref] = (firstname, hiski_name, hiski_id, dad_full_name)
            # Associate the hiski_id to 1) this individual OR to
            # 2) one of his/her children
            best_ind = ind
            if birth_year == hiski_birth_year:
                best_sim = name_similarity(hiski_name, firstname)
            else:
                best_sim = -1
            for kid in ind.childs:
                kid_name = kid.get_chain("NAME.GIVN.value")
                kid_birth_date = kid.get_chain("BIRT.DATE.value")
                if kid_birth_date is None:
                    continue
                kid_birth_year = kid_birth_date.split()[-1]
                try:
                    kid_birth_year = int(kid_birth_year)
                except:
                    print "Failed to convert kid birth year:", kid_birth_year, kid.xref
                    birth_year = -100
                if kid_birth_year == hiski_birth_year:
                    kid_sim = name_similarity(hiski_name, kid_name)
                else:
                    kid_sim = -1
                if kid_sim > best_sim:
                    best_ind = kid
                    best_sim = kid_sim
            if best_sim > 0.6:
                # Match found
                if hiski_id in used_hids:
                    prev_xref, prev_sim = used_hids[hiski_id]
                    if prev_sim < best_sim:
                        # This hiski ID should be rather matched to this xref
                        xref2hid.pop(prev_xref, None)
                        n_match -= 1
                        # XXX n_approximates might be a bit inaccurate after this
                        print "Found a better match: %s->%s (instead of %s->%s)" % \
                                (hiski_id, best_ind.xref, hiski_id, prev_xref)
                        n_match += 1
                        xref2hid[best_ind.xref] = hiski_id
                        used_hids[hiski_id] = (best_ind.xref, best_sim)
                        if best_sim < 1:
                            n_approximates += 1
                else:
                    n_match += 1
                    xref2hid[best_ind.xref] = hiski_id
                    used_hids[hiski_id] = (best_ind.xref, best_sim)
                    if best_sim < 1:
                        n_approximates += 1
            else:
                n_nomatch += 1
            if best_sim < 0.7:
                print "Weak match (sim=%.3f): H:%s - G:%s" % (best_sim, hiski_name, best_ind.get_chain("NAME.GIVN.value").lower())

    print "%d hiski ids matched (%d matched only approximately, %d not matched)" % (n_match, n_approximates, n_nomatch)

    # Replace xref by HisKi ID in G_data when possible
    for edge in G_data:
        if edge["parent"] in xref2hid:
            edge["parent"] = xref2hid[edge["parent"]]
            #edge["parent"] += "?"+xref2hid[edge["parent"]]
            edge["parent_hiski"] = True
        if edge["child"] in xref2hid:
            edge["child"] = xref2hid[edge["child"]]
            #edge["child"] += "?"+xref2hid[edge["child"]]
            edge["child_hiski"] = True

    # Parent-child edges where both have an HisKi ID
    edges = []
    for ind in individuals.values():
        if ind.xref not in xref2hid:
            continue
        parent_id = xref2hid[ind.xref]
        for other in ind.childs:
            if other.xref not in xref2hid:
                continue
            child_id = xref2hid[other.xref]
            if parent_id != child_id:
                edges.append((parent_id, child_id))
            else:
                print "Same hiski id for the parent (%s) and the child (%s)!" % (parent_id, child_id)
                print "Parent info:", str(hiski_infos[ind.xref])
    print "%d parent-child edges" % len(edges)

    # Parent-child edges where only the child has an HisKi ID
    edges2 = []
    sibling_groups = {}
    for ind in individuals.values():
        parent_id = ind.xref
        for other in ind.childs:
            if other.xref not in hiski_infos:
                continue
            sibling_groups[parent_id] = sibling_groups.get(parent_id, 0) + 1
            child_id = hiski_infos[other.xref]
            edges2.append((parent_id, child_id))

    n_groups = sum(1 for sg in sibling_groups.itervalues() if sg > 1)
    print "%d sibling groups in total" % n_groups
    """
    for a,b in edges:
        try:
            a_str = "{} (H:{}) {}".format(a[0], a[1], a[2])
            b_str = "{} (H:{}) {}".format(b[0], b[1], b[2])
        except:
            import extras
            extras.keyboard()
        print a_str + "\t" + b_str
    """

    prev_par = None
    for par,child in edges2:
        if prev_par != par:
            print "-----------------------------------------"
            prev_par = par
        try:
            par_str = par
            child_str = "{} (H:{}) {}\t{}".format(child[0], child[1], child[2], child[3])
        except:
            import extras
            extras.keyboard()
        print par_str + "\t" + child_str

    return edgelist, xref2hid, G_data

if __name__ == "__main__":
    #parse_hiski_caus()
    if len(sys.argv) < 2:
        print "python {} <gedcom-file>".format(sys.argv[0])
        sys.exit()
    parse_hiski_sour(sys.argv[1])
