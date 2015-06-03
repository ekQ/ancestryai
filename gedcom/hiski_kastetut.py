
import sys
import re
from gedcom import *

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

if __name__ == "__main__":
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

        graph = []
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


