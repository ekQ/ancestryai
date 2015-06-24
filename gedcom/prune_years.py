import sys
from gedcom import read_file, reprint


if __name__ == "__main__":
    root = read_file(sys.argv[1])
    for entry in root.traverse():
        if entry.tag == "INDI":
            years = []
            years.append(entry.get_chain("BIRT.DATE.year"))
            # I think CHAN was actually when the gedcom was updated there? (in our case)
#            years.append(entry.get_chain("CHAN.DATE.year"))
            for year in years:
                if year > 1930:
                    entry.drop()
    reprint(root)


