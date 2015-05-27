
var Hiski = {
    url_root: "/",
    // nodes / people
    nodes: [],
    node_dict: {},
    preloaded_nodes: {},
    add_node: function(node_data, reference) {
        if(node_data.xref in this.node_dict) {
            // update existing?
        } else {
            var node = new Node(node_data);
            // take initial coordinates from the reference, which this was opened from
            if(reference !== null) {
                node.x = reference.x;
                node.y = reference.y;
            }
            this.nodes.push(node);
            this.node_dict[node.xref] = node;
            // add links to related relations
            var neighbors = node.get_relation_xrefs();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(this.relation_dict[nxref], node, type);
            }
            // update left and rightmost parent
            update_leftmost_parent(node);
            update_rightmost_parent(node);
            // find location in node_order for the new node
            var order_i = 0;
            if(reference) {
                var linktype = find_link_type(node, reference);
                if(linktype == "child") {
                    if(node.siblings.length > 0) {
                        order_i = this.node_order.indexOf(_.last(node.siblings).rightmost_subnode) + 1;
                        node.order_reason = "right of siblings " + _.last(node.siblings).xref +
                                " -> " + _.last(node.siblings).rightmost_subnode.xref;
                    } else if(node.parents.length == 1) {
                        order_i = this.node_order.indexOf(node.rightmost_parent.rightmost_subnode) + 1;
                        node.order_reason = "right of the only parent's other subfamilies " + node.rightmost_parent.xref + " -> " + node.rightmost_parent.rightmost_subnode.xref;
                    } else if(node.parents.length > 1) {
                        order_i = this.node_order.indexOf(node.rightmost_parent) + 1;
                        node.order_reason = "right of parents " + node.rightmost_parent.xref;
                    }
                } else if(node.spouses.length > 0) {
                    // todo: family swapper
                    order_i = this.node_order.indexOf(node.spouses[0]) + 1;
                    node.order_reason = "right of spouse " + node.spouses[0].xref;
                } else if(node.children.length > 0) {
                    order_i = this.node_order.indexOf(node.children[0]);
                    node.order_reason = "left of children " + node.children[0].xref;
                } else {
                    throw new Error("Eh?");
                }
            }
            // write the node's fuzzy index and store the node into node_order
            node.order_fuzzy_index = this.new_fuzzy_index_for_position(order_i);
            this.node_order.splice(order_i, 0, node);
            // update layout related summarised data
            update_descendant_year(node, null);
            update_rightmost_subnode(node);
            for(var i = 0; i < node.children.length; i++) {
                update_leftmost_parent(node.children[i]);
                update_rightmost_parent(node.children[i]);
            }
            // queue for expanding if the feature is on
            this.queue_for_expand(node);
        }
    },
    new_fuzzy_index_for_position: function(order_i) {
        if(this.node_order.length == 0) {
            return 0.0;
        } else if(order_i == 0) {
            return this.node_order[0].order_fuzzy_index - 1.0;
        } else if(order_i == this.node_order.length) {
            return _.last(this.node_order).order_fuzzy_index + 1.0;
        } else {
            return (this.node_order[order_i - 1].order_fuzzy_index +
                    this.node_order[order_i].order_fuzzy_index) / 2.0;
        }
    },
    reposition_node: function(node) {
        this.reset_node_visited();
        this._reposition_node(node);
    },
    _reposition_node: function(node) {
        if(node.visited) {
            console.warn("The data has a timetraveller, cutting node repositioning");
            node.timetraveller = true;
            return;
        }
        node.visited = true;
        if(node.rightmost_parent != null) {
            if(node.order_fuzzy_index < node.rightmost_parent.order_fuzzy_index) {
                // child left of parent and need to be moved
                var current_i = this.node_order.indexOf(node);
                this.node_order.splice(current_i, 1);
                var order_i = this.node_order.indexOf(node.rightmost_parent) + 1;
                node.order_reason = "repositioned to right of parent " + node.rightmost_parent.xref;
                node.order_fuzzy_index = this.new_fuzzy_index_for_position(order_i);
                this.node_order.splice(order_i, 0, node);
                // update pointers
                update_rightmost_subnode(node);
                for(var i = 0; i < node.children.length; i++) {
                    update_leftmost_parent(node.children[i]);
                    update_rightmost_parent(node.children[i]);
                }
                // recurse
                for(var i = 0; i < node.children.length; i++) {
                    // todo: cut the search if we have time traveller
                    this._reposition_node(node.children[i]);
                }
            }
        }
    },
    node_auto_expand_delay: -1, // -1 to disable
    node_auto_expand_queue: [],
    queue_for_expand: function(node) {
        if(!node.expandable())
            return;
        Hiski.node_auto_expand_queue.push(node);
        Hiski.start_node_autoexpansion();
    },
    start_node_autoexpansion: function() {
        var expander = function() {
            if(Hiski.node_auto_expand_delay == -1)
                return;
            var node2 = Hiski.node_auto_expand_queue.pop();
            node2.expand_surroundings();
            if(Hiski.node_auto_expand_queue.length > 0) {
                setTimeout(expander, Hiski.node_auto_expand_delay);
            }
        };
        if(Hiski.node_auto_expand_queue.length == 1 && Hiski.node_auto_expand_delay != -1) {
            setTimeout(expander, Hiski.node_auto_expand_delay);
        }
    },
    // relations / families
    auto_expand_relations: true,
    relations: [],
    relation_dict: {},
    add_relation: function(relation_data, reference) {
        if(relation_data.xref in this.relation_dict) {
            // update existing?
        } else {
            var relation = new Relation(relation_data);
            // take initial coordinates from reference, from which this was opened
            if(reference !== null) {
                relation.x = reference.x;
                relation.y = reference.y;
            }
            this.relations.push(relation);
            this.relation_dict[relation.xref] = relation;
            // add links to related nodes
            var neighbors = relation.get_node_xrefs();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(relation, this.node_dict[nxref], type);
            }
            // expand and surrounding nodes immediately
            if(this.auto_expand_relations) {
                relation.expand_surroundings();
            }
        }
    },
    // links between nodes and relations
    links: [],
    link_dict: {},
    add_link: function(relation, node, type) {
        // if relation or node didn't exist, do nothing
        if(!relation || !node)
            return;
        link_node_to(node, relation, find_link_type(node, relation));
        var linkid = create_link_id(relation, node);
        if(linkid in this.link_dict) {
            // update existing or ignore?
        } else {
            linkobj = new Link(relation, node, type);
            this.links.push(linkobj);
            this.link_dict[linkobj.id] = linkobj;
        }
    },
    // other
    add_entry: function(entry, reference) {
        if(entry.tag == "FAM") {
            this.add_relation(entry, reference);
        } else if(entry.tag == "INDI") {
            this.add_node(entry, reference);
        } else {
            throw new Error("Unhandled tag '"+entry.tag+"'");
        }
    },
    load: function(xref, reference) {
        if(xref in this.node_dict)
            return;
        if(xref in this.relation_dict)
            return;
        if(xref in this.preloaded_nodes) {
            Hiski.add_entry(this.preloaded_nodes[xref], reference);
            Hiski.delayed_render();
            return;
        }
        var addr = this.url_root + "json/load/"+xref+"/";
        if(xref === null)
            addr = this.url_root + "json/load-any/";
        d3.json(addr, function(json) {
            if(json && json.result == true) {
                if(json.entry.xref in Hiski.node_dict || json.entry.xref in Hiski.relation_dict) {
                    console.warn("The node already existed, doing nothing.");
                    return;
                }
                Hiski.add_entry(json.entry, reference);
                Hiski.delayed_render();
            } else {
                throw new Error("Loading data '"+xref+"' failed");
            }
        });
    },
    delay_running: false,
    delayed_render: function() {
        // delayed rendering, which gives a bit time for other pending nodes to get loaded
        var timed = function() {
            Hiski.delay_running = false;
//            enter(Hiski);
            enter_all();
            Hiski.calc_layout();
//            render(Hiski);
            render_all();
        };
        if(!Hiski.delay_running) {
            Hiski.delay_running = true;
            setTimeout(timed, 300);
        }
    },

    // custom layout stuff
    node_order: [],
    layout_mode: 0,
    toggle_layout: function() {
        Hiski.layout_mode = (Hiski.layout_mode + 1) % 3;
        Hiski.calc_layout();
//        render(Hiski);
        render_all();
    },
    reset_node_visited: function() {
        for(var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].visited = false;
        }
    },
    calc_layout: function() {
        var node_preferred_position = function(node) {
            var x = node.x;
            var year = guess_node_year(node);
            var y = (year - 1750) * 5 - 600;
            return [x, y];
        };
        var relation_preferred_position = function(relation) {
            var x = relation.get_preferred_x();
            var y = relation.get_preferred_y();
            return [x, y];
        };
        var x = 100;
        var pad = 80;
        var pad_years = 9;
        var years_x = [];
        for(var i = 0; i < 3000; i++) {
            years_x.push(x);
        }
        this.reset_node_visited();
        var arr = this.node_order;
        for(var i = 0; i < arr.length; i++) {
            var node = arr[i];
            var pos = node_preferred_position(node);
            node.y = pos[1];
            var maxx = 0;
            var year = guess_node_year(node);
            var endyear = Math.max(year, node.last_open_descendant_year + pad_years);
            for(var j = Math.max(0, year - pad_years); j < endyear && j < years_x.length; j++) {
                maxx = Math.max(maxx, years_x[j]);
            }
            for(var j = 0; j < node.spouses.length; j++) {
                if(!node.spouses[j].visited)
                    continue;
                maxx = Math.max(maxx, node.spouses[j].x);
            }
            for(var j = 0; j < node.siblings.length; j++) {
                if(!node.siblings[j].visited)
                    continue;
                maxx = Math.max(maxx, node.siblings[j].x);
            }
            node.x = maxx + pad;
            if(node.parents.length > 0 && node.leftmost_parent.visited)
                node.x = Math.max(node.x, node.leftmost_parent.x);
            for(var j = Math.max(0, year - pad_years); j < year + pad_years; j++) {
                years_x[j] = node.x;
            }
            if(Hiski.layout_mode == 1)
                node.x = i*60+60;
            if(node.parents.length > 0 && !node.rightmost_parent.visited && !node.timetraveller) {
                // abort layout calculation and reposition nodes, when a child is left of its parents
                Hiski.reposition_node(node);
                Hiski.calc_layout();
                return;
            }
            node.visited = true;
            if(node.x == 0 || node.x == undefined || node.x == NaN || node.x < 50) {
                console.warn("Node has x coordinate '"+node.x+"', which seems to be a bug, but I don't know what it is related to.");
            }
            if(node.x < 90 && Hiski.layout_mode == 0) {
                console.warn("Node has invalid x coordinate " + node.x + ", " + maxx + ", " + year + ", " + endyear);
            }
        }
        if(Hiski.layout_mode == 2) {
            for(var i = 0; i < this.nodes.length; i++) {
                this.nodes[i].x = i*60 + 60;
            }
        }
        for(var i = 0; i < this.relations.length; i++) {
            var relation = this.relations[i];
            var pos = relation_preferred_position(relation);
            relation.x = pos[0];
            relation.y = pos[1];
        }
    },
    color_mode: 0,
    next_color_mode: function() {
        this.color_mode = (this.color_mode + 1) % 3;
    },
    node_color_function: function(d) {
/*        if(d == Hiski.selected) {
            return "#ffffff";
        } else*/
        if(Hiski.color_mode == 0) {
            return d.color_by_name;
        } else if(Hiski.color_mode == 1) {
            return d.color_by_sex;
        } else if(Hiski.color_mode == 2) {
            return d.expandable() ? "#ccffcc" : "#dddddd";
        }
        return "#ff0000";
    },

    // map related
    map: null,
    map_id: "map",
    map_overlay: null,
    overlay_nodes: null,
    map_projection: null,


    selected: null,
    lastselected: null,

    testnote: null,
};

