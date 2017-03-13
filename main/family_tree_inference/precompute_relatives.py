import time
import sys
import cPickle as pickle
import json

from save_plain_graph import Node


def get_relatives(all_nodes, person_id, relationpath):
    # Take a copy of the path to avoid modifying it.
    relationpath = relationpath[:]
    buf = [person_id]
    visited = set([person_id])
    while len(relationpath) > 0:
        direction = relationpath.pop(0)
        new_buf = []
        for pid in buf:
            if direction == "up":
                for pid2 in all_nodes[pid].parents:
                    if pid2 not in visited:
                        new_buf.append(pid2)
                        visited.add(pid2)
            elif direction == "down":
                for pid2 in all_nodes[pid].kids:
                    if pid2 not in visited:
                        new_buf.append(pid2)
                        visited.add(pid2)
            else:
                raise Exception("Bad direction: {}".format(direction))
        buf = new_buf
    return buf


relationpaths = {
        "parent": ["up"],
        "child": ["down"],
        "sibling": ["up", "down"],
        "grandparent": ["up","up"],
        "grandchild": ["down","down"],
        }


print "Loading graph..."
t0 = time.time()
nodes = pickle.load(open('../../recons_data/plain_graph.pckl', 'rb'))
print "Loaded in {:.2f} seconds.".format(time.time() - t0)

t0 = time.time()
fout = open('precomputed_relatives_rows.json', 'w')
for i, person_id in enumerate(nodes.iterkeys()):
    if i % 100000 == 0:
        print "Person", i
    #if i == 100000:
    #    break
    for relation_name, relationpath in relationpaths.iteritems():
        for relative_id in get_relatives(nodes, person_id, relationpath):
            fout.write(json.dumps({"xref": str(person_id),
                                   "relative_xref": str(relative_id),
                                   "relation": relation_name}) + '\n')
fout.close()
print "Computing relatives took {:.2f} seconds.".format(time.time() - t0)
