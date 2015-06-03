
import re

reline = re.compile("^ *([0-9]+) +((@[^\s]*@) +)?([^\s]+)( +(.*))?\s*$")

class SpecialHandling:
    def __init__(self):
        self.redate = re.compile(
                "^(?P<beforeafter>BEF\. |AFT\. |ABT\. )?"
                "(?P<full>"
                    "(?P<yearA>[1-9][0-9]*)"
                    "|"
                    "(?P<dayB>[1-9][0-9]?) (?P<monthB>[A-Z]+) (?P<yearB>[1-9][0-9]*)"
                    "|"
                    "BET\. (?P<yearC1>[1-9][0-9]*) - (?P<yearC2>[1-9][0-9]*)"
                ")\s*$")
        self.altredate = re.compile(
                "^(?P<full>"
                    "EST (?P<yearA>[1-9][0-9])"
                    "|"
                    "(?P<monthB>[A-Z]+) (?P<yearB>[1-9][0-9]*)"
                    "|"
                    "BET (?P<yearC1>[1-9][0-9]*) AND (?P<yearC2>[1-9][0-9]*)"
                ")\s*$")
        self.redates = [
            re.compile("(?P<modifier>BEF\\. |AFT\\. |ABT\\. |EST |CAL |ABT |BEF |)"
                "(?P<day>[1-9][0-9]? )?(?P<month>[A-Z]+ )?(?P<year>[0-9]+)\\s*$"),
#            re.compile("(?P<day>[1-9][0-9]? )?(?P<month>[A-Z]+ )?(?P<year>[0-9]+)\\s*$"),
            re.compile(
                "(?P<modifier>BEF\\. |AFT\\. |ABT\\. |EST |CAL |ABT |BEF |)"
                "BET "
                    "(?P<day1>[1-9][0-9]? )?(?P<month1>[A-Z]+ )?(?P<year1>[0-9]+)"
                " AND "
                    "(?P<day2>[1-9][0-9]? )?(?P<month2>[A-Z]+ )?(?P<year2>[0-9]+)"
                "\\s*$"),
            re.compile(
                "(?P<modifier>BEF\\. |AFT\\. |ABT\\. |EST |CAL |ABT |BEF |)"
                "FROM "
                    "(?P<day1>[1-9][0-9]? )?(?P<month1>[A-Z]+ )?(?P<year1>[0-9]+)"
                " TO "
                    "(?P<day2>[1-9][0-9]? )?(?P<month2>[A-Z]+ )?(?P<year2>[0-9]+)"
                "\\s*$"),
            re.compile(
                "(?P<modifier>BEF\\. |AFT\\. |ABT\\. |EST |CAL |ABT |BEF |)"
                "BET\\. "
                    "(?P<day1>[1-9][0-9]? )?(?P<month1>[A-Z]+ )?(?P<year1>[0-9]+)"
                " - "
                    "(?P<day2>[1-9][0-9]? )?(?P<month2>[A-Z]+ )?(?P<year2>[0-9]+)"
                "\\s*$"),
        ]
    def check(self, entry):
        if hasattr(self, entry.tag):
            func = getattr(self, entry.tag)
            func(entry)
    def DATE(self, entry):
        for redate in self.redates:
            match = redate.match(entry.value)
            if match:
                modifier = match.groupdict().get("modifier", None)
                if "year" in match.groupdict():
                    year = int(match.groupdict()["year"])
                elif "year2" in match.groupdict():
                    year = (int(match.groupdict()["year1"]) + int(match.groupdict()["year2"])) / 2
                entry.additional["year"] = year
                entry.additional["year_modifier"] = modifier
                return
        else:
            print "no match: " + entry.value
specials = SpecialHandling()

dropped_xrefs = set([])

class Entry:
    def __init__(self, level, xref, tag, value):
        self.level = level
        self.xref = xref
        self.tag = tag
        self.value = value

        self.children = {}
        self.parent = None

        self.additional = {}
        self.dropped = False

    def add_child(self, child):
        if child.tag not in self.children:
            self.children[child.tag] = []
        self.children[child.tag].append(child)
        child.parent = self

    def traverse(self):
        """
        DFS traversal of all descendants.
        """
        buf = [self]
        while buf:
            cur = buf.pop()
            if cur.dropped:
                continue
            if cur.value in dropped_xrefs:
                continue
            yield cur
            for tag, lst in sorted(cur.children.items(), reverse=True):
                for entry in lst:
                    buf.append(entry)
    def drop(self):
        self.dropped = True
        if self.xref:
            dropped_xrefs.add(self.xref)

    def as_dict(self):
        children = []
        for tag, lst in self.children.items():
            for entry in lst:
                children.append(entry.as_dict())
        obj = {
            "level": self.level,
            "xref": self.xref,
            "tag": self.tag,
            "value": self.value,
            "children": children,
        }
        obj.update(self.additional)
        return obj

    def by_tag(self, tag):
        return self.children.get(tag, [])
    def by_xref(self, xref):
        for tag, lst in self.children.items():
            for entry in lst:
                if entry.xref == xref:
                    return entry
        return None
    def first_tag(self, tag):
        lst = self.by_tag(tag)
        return lst[0] if lst else None
    def get_multi_chain(self, chain):
        # TODO Describe chain argument
        if not chain:
            return [self]
        tag = self
        res = []
        key = chain.split(".")[0]
        rest = ".".join(chain.split(".")[1:])
        if key in ["level", "xref", "tag", "value", "children", "parent"]:
            res.append(getattr(tag, key))
        elif key == key.lower():
            res.append(tag.additional.get(key, None))
        else:
            tags = tag.by_tag(key)
            if tags:
                for t in tags:
                    res.extend(t.get_multi_chain(rest))
        return res
    def get_chain(self, chain):
        tag = self
        for key in chain.split("."):
            if key in ["level", "xref", "tag", "value", "children", "parent"]:
                tag = getattr(tag, key)
            elif key == key.lower():
                tag = tag.additional.get(key, None)
            else:
                tag = tag.first_tag(key)
                if not tag:
                    return None
        return tag

    def create_child(self, xref, tag, value):
        child = Entry(self.level + 1, xref, tag, value)
        self.add_child(child)
    def edit_chain(self, chain, value):
        key = chain.split(".")[0]
        rest = ".".join(chain.split(".")[1:])
        if key in ["level", "xref", "tag", "value", "children", "parent"]:
            setattr(self, key, value)
        elif key == key.lower():
            self.additional[key] = value
        else:
            nexttag = self.first_tag(key)
            if not nexttag:
                self.create_child(None, key, None)
                nexttag = self.first_tag(key)
            return nexttag.edit_chain(rest, value)
        return True


def read_file(filename):
    f = open(filename)
    lines = f.readlines()
    f.close()
    return read_lines(lines)

def read_string(s):
    return read_lines(s.split("\n"))

def read_lines(lines):
    tagstack = [Entry(-1, None, "ROOT", None)]
    lasttag = None
    for i_, line in enumerate(lines):
        i = i_ + 1
        line = line.rstrip("\n\r")
        if not line:
            continue
        match = reline.match(line)
        if match:
            level, _, xref, tag, _, value = match.groups()
            level = int(level)
            if level < 0:
                raise Exception("invalid level on line {}".format(i))
            entry = Entry(level, xref, tag, value)
            while tagstack and entry.level <= tagstack[-1].level:
                tagstack.pop()
            if entry.level != tagstack[-1].level + 1:
                raise Exception("expected level {}, got {} on line {}".format(tagstack[-1].level+1, entry.level, i))
            if entry.tag == "CONC":
                if lasttag.value and entry.value:
                    lasttag.value += entry.value
                elif entry.value:
                    lasttag.value = entry.value
                continue
            if entry.tag == "CONT":
                if lasttag.value and entry.value:
                    lasttag.value += "\n" + entry.value
                else:
                    lasttag.value = "\n" + entry.value
                continue
            if lasttag:
                specials.check(lasttag)
            tagstack[-1].add_child(entry)
            tagstack.append(entry)
            lasttag = entry
        else:
            raise Exception("no regexp match on line {}".format(i))
    if lasttag:
        specials.check(lasttag)
    return tagstack[0]


def reform(root):
    s = ""
    for entry in root.traverse():
        if entry.tag == "ROOT":
            continue
        value = entry.value if entry.value else ""
        parts = value.split("\n")
        s += "{}{} {} {}\n".format(
                entry.level,
                " "+entry.xref if entry.xref else "",
                entry.tag,
                parts[0],
                )
        for p in parts[1:]:
            s += "{}{} {} {}\n".format(
                    entry.level + 1,
                    "",
                    "CONT",
                    p,
                    )
    return s

def reprint(root):
    print reform(root)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print "python {} <gedcom-file>".format(sys.argv[0])
        print "python {} reprint <gedcom-file>".format(sys.argv[0])
        print "python {} count <gedcom-file>".format(sys.argv[0])
        sys.exit()
    if len(sys.argv) < 3:
        root = read_file(sys.argv[1])
        for entry in root.traverse():
            print "{}{:2}     {:8}     {:6}     '{}'".format(
                    "  "*entry.level,
                    entry.level,
                    entry.xref or "--",
                    entry.tag or "--",
                    entry.value or "--",
                    )
    elif sys.argv[1] == "reprint":
        root = read_file(sys.argv[2])
        reprint(root)
    elif sys.argv[1] == "count":
        root = read_file(sys.argv[2])
        inds = 0
        fams = 0
        for entry in root.traverse():
            if entry.tag == "INDI":
                inds += 1
            if entry.tag == "FAM":
                fams += 1
        print "{} individuals".format(inds)
        print "{} families".format(fams)
