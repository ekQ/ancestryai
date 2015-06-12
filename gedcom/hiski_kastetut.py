# -*- coding: utf-8 -*-
import sys
import re
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

def parse_hiski_sour():
    if len(sys.argv) < 3:
        print "python {} edgelist <gedcom-file>".format(sys.argv[0])
        sys.exit()
    root = read_file(sys.argv[2])
    if sys.argv[1] == "edgelist":
        individuals = {}
        edges = []
        edges2 = [] # Edges where only the child has an HisKI ID
        sources = {}
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
            elif entry.tag == "SOUR":
                hiski = entry.get_chain("TITL.hiski")
                if hiski and "kastetut" in hiski:
                        # Take simply the first baptism ID
                        bap_id = "-".join(hiski["kastetut"])
                        sources[entry.xref] = bap_id
        print "%d sources available" % len(sources)

        hiski_infos = {}
        for ind in individuals.values():
            source_id = ind.get_chain("NAME.SOUR.value")
            if source_id in sources:
                hiski_id = sources[source_id]
                firstname = ind.get_chain("NAME.GIVN.value")
                if firstname is None:
                    firstname = "(NN)"
                # Get name in the Hiski DB
                person = db.Person.query.filter(db.Person.id==hiski_id).first()
                hiski_name = person.name.encode('utf-8')
                dad_full_name = person.get_clean_dad_name().encode('utf-8')
                hiski_infos[ind.xref] = (firstname, hiski_name, hiski_id, dad_full_name)
        print "%d individual hiski ids available" % len(hiski_infos)

        # Parent-child edges where both have an HisKi ID
        for ind in individuals.values():
            if ind.xref not in hiski_infos:
                continue
            parent_id = hiski_infos[ind.xref]
            for other in ind.childs:
                if other.xref not in hiski_infos:
                    continue
                child_id = hiski_infos[other.xref]
                if parent_id[2] != child_id[2] and parent_id[0].startswith(parent_id[1]) and child_id[0].startswith(child_id[1]):
                    edges.append((parent_id, child_id))

        # Parent-child edges where only the child has an HisKi ID
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

if __name__ == "__main__":
    #parse_hiski_caus()
    parse_hiski_sour()
