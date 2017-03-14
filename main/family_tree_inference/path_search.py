import cPickle as pickle
import time

print "Loading the graph..."
t0 = time.time()
nodes = pickle.load(open('main/family_tree_inference/plain_graph3.pckl', 'rb'))
print "Loaded in {:.2f} seconds.".format(time.time() - t0)

def search_path(xref1, xref2):
    try:
	xref1 = int(xref1)
	xref2 = int(xref2)
    except:
        print u"Failed converting xrefs ({}, {}) to integers.".format(xref1, xref2)
        return False
    if xref1 not in nodes or xref2 not in nodes or nodes[xref1][2] != nodes[xref2][2]:
        return False
    routing = {}
    visited = set()
    buf = [xref1]
    path_found = False
    while len(buf) > 0:
        cur = buf.pop(0)
        for neigh in nodes[cur][1] + nodes[cur][0]:
            if neigh in visited:
                continue
            routing[neigh] = cur
            if neigh == xref2:
                buf = []
                path_found = True
                break
            buf.append(neigh)
            visited.add(neigh)
    #print "Path found:", path_found
    if not path_found:
        return False

    path = []
    cur = xref2
    while routing[cur] != xref1:
        path.append(routing[cur])
        cur = routing[cur]
    path = [xref1] + path[::-1] + [xref2]
    print "Found path:", path
    print "Visited {} nodes.".format(len(visited))
    return path

# The following two functions are adopted with modification from NetworkX
# (see networkx/algorithms/shortest_paths/unweighted.py) which has the
# following license:

'''
Copyright (C) 2004-2012, NetworkX Developers
Aric Hagberg <hagberg@lanl.gov>
Dan Schult <dschult@colgate.edu>
Pieter Swart <swart@lanl.gov>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.

  * Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following
    disclaimer in the documentation and/or other materials provided
    with the distribution.

  * Neither the name of the NetworkX Developers nor the names of its
    contributors may be used to endorse or promote products derived
    from this software without specific prior written permission.


THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
'''

def bidirectional_search_path(xref1, xref2):
    try:
	xref1 = int(xref1)
	xref2 = int(xref2)
    except:
        print u"Failed converting xrefs ({}, {}) to integers.".format(xref1, xref2)
        return False
    if xref1 not in nodes or xref2 not in nodes or nodes[xref1][2] != nodes[xref2][2]:
        return False

    pred, succ, w = _bidirectional_path_search_helper(xref1, xref2, nodes)
    
    # build path from pred+w+succ
    path=[]
    # from source to w
    while w is not None:
        path.append(w)
        w=pred[w]
    path.reverse()
    # from w to target
    w=succ[path[-1]]
    while w is not None:
        path.append(w)
        w=succ[w]

    #print "Found path:", path
    return path


def _bidirectional_path_search_helper(xref1, xref2, nodes):
    # predecesssor and successors in search
    pred={xref1:None}
    succ={xref2:None}

    # initialize fringes, start with forward
    forward_fringe=[xref1]
    reverse_fringe=[xref2]

    while forward_fringe and reverse_fringe:
        if len(forward_fringe) <= len(reverse_fringe):
            this_level=forward_fringe
            forward_fringe=[]
            for v in this_level:
                for w in nodes[v][1] + nodes[v][0]:
                    if w not in pred:
                        forward_fringe.append(w)
                        pred[w]=v
                    if w in succ:  return pred,succ,w # found path
        else:
            this_level=reverse_fringe
            reverse_fringe=[]
            for v in this_level:
                for w in nodes[v][1] + nodes[v][0]:
                    if w not in succ:
                        succ[w]=v
                        reverse_fringe.append(w)
                    if w in pred:  return pred,succ,w # found path
