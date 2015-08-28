
var Hiski = {
    /*
    Main object of the program. Contains state, data and layout calculation, as
    well as functions related to those.
    */
    url_root: "/",
    /* nodes / people */
    // nodes in the order of adding them
    nodes: [],
    // xref to node dictionary
    node_dict: {},
    // nodes in the order of the layout constraints
    node_order: [],
    // nodes that were loaded during search, but not yet added
    preloaded_entries: {},
    add_node: function(node_data, reference, anchor) {
        /*
        Adds a node based on given json data. Places the node initially to the
        coordinates of the reference from where it will be animated to its
        correct position. Returns the node in question.
        */
        if(node_data.xref in this.node_dict) {
            // update existing?
            return this.node_dict[node_data.xref];
        } else {
            var node = new Node(node_data);
            // take initial coordinates from the reference, which this was opened from
            if(reference !== null) {
                node.x = reference.x;
                node.y = reference.y;
            } else if(anchor !== null && anchor !== undefined) {
                node.x = anchor.x;
                node.y = anchor.y;
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
            // update order pointers required in the next step
            update_leftmost_parent(node);
            update_leftmost_child(node);
            update_rightmost_parent(node);
            update_rightmost_spouse(node);
            update_rightmost_sibling(node);
            // find location in node_order for the new node
            var order_i = 0;
            if(reference) {
                var linktype = find_link_type(node, reference);
                if(linktype == "child") {
                    if(node.siblings.length > 0) {
                        // find the oldest loaded little sibling of node
                        var little_sibling = null;
                        // disabled for now for better looking trees
/*                        for(var i = 0; i < node.siblings.length; i++) {
                            if(node.siblings[i].year > node.year) {
                                if(little_sibling == null ||
                                            node.siblings[i].year < little_sibling.year ||
                                            (node.siblings[i].year == little_sibling.year &&
                                                node.siblings[i].order_fuzzy_index < little_sibling.order_fuzzy_index)) {
                                    little_sibling = node.siblings[i];
                                }
                            }
                        }*/
                        if(little_sibling != null) {
                            // little sibling found, position to the left of that
                            // XXX: this causes messiness with spouses at
                            // times. Could try to prevent that somehow
                            // Additionally, the layout might like reverse
                            // order a bit more, but I'm not sure about that.
                            // Aand, repositioning at least currently ignores
                            // the little sibling order.
                            order_i = this.node_order.indexOf(little_sibling);
                            node.order_reason = "left of little sibling " + little_sibling.xref;
                        } else {
                            // little sibling not found, position to the right of other siblings
//                            order_i = this.node_order.indexOf(_.last(node.siblings).rightmost_subnode) + 1;
//                            node.order_reason = "right of siblings " + _.last(node.siblings).xref +
//                                    " -> " + _.last(node.siblings).rightmost_subnode.xref;
                            order_i = this.node_order.indexOf(node.rightmost_sibling.rightmost_subnode) + 1;
                            node.order_reason = "right of siblings " + node.rightmost_sibling.xref +
                                    " -> " + node.rightmost_sibling.rightmost_subnode.xref;
                        }
                    } else if(node.parents.length == 1) {
                        order_i = this.node_order.indexOf(node.rightmost_parent.rightmost_subnode) + 1;
                        node.order_reason = "right of the only parent's other subfamilies " + node.rightmost_parent.xref + " -> " + node.rightmost_parent.rightmost_subnode.xref;
                    } else if(node.parents.length > 1) {
                        order_i = this.node_order.indexOf(node.rightmost_parent) + 1;
                        node.order_reason = "right of parents " + node.rightmost_parent.xref;
                    }
                } else if(node.children.length > 0) {
                    order_i = this.node_order.indexOf(node.leftmost_child);
                    node.order_reason = "left of children " + node.children[0].xref;
                } else if(node.spouses.length > 0) {
                    // todo: family swapper
                    order_i = this.node_order.indexOf(node.rightmost_spouse.rightmost_subnode) + 1;
                    node.order_reason = "right of spouse's other subfamilies " + node.spouses[0].xref + " -> " + node.rightmost_spouse.rightmost_subnode.xref;
                } else {
                    throw new Error("Eh?");
                }
            }
            // write the node's fuzzy index and store the node into node_order
            node.order_fuzzy_index = this.new_fuzzy_index_for_position(order_i);
            node.order_fuzzy_index = this.check_fuzzy_index_at(order_i, node.order_fuzzy_index);
            this.node_order.splice(order_i, 0, node);
            // update the rest of the order pointers from this nodes and those
            // around that need to be updated.
            update_descendant_year(node, null);
            update_rightmost_subnode(node);
            update_rightmost_sibling(node);
            for(var i = 0; i < node.children.length; i++) {
                update_leftmost_parent(node.children[i]);
                update_rightmost_parent(node.children[i]);
            }
            for(var i = 0; i < node.parents.length; i++) {
                update_leftmost_child(node.parents[i]);
            }
            update_rightmost_spouse(node);
            for(var i = 0; i < node.spouses.length; i++) {
                update_rightmost_spouse(node.spouses[i]);
            }
            // queue for expanding if the feature is on
            this.queue_for_expand(node);
            // todo: move comment loading to elsewhere
            this.load_comments_for(node.xref);
            return node;
        }
    },
    new_fuzzy_index_for_position: function(order_i) {
        /*
        Returns the fuzzy index for a node to be added in order_i position.
        */
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
    regenerate_fuzzy_indices: function() {
        /*
        Regenerates fuzzy indices. Needs to be called when we are out of float
        precision.
        */
        for(var i = 0; i < this.node_order.length; i++) {
            this.node_order[i].order_fuzzy_index = i * 1.0;
        }
        console.warn("fuzzy indices regenerated.");
    },
    check_fuzzy_index_at: function(order_i, fuzzy_index) {
        /*
        Checks that we won't have duplicate fuzzy_indices if we have the given
        index to the given position. Regenerates the indices if there would be
        duplicate (which would be due to running out of precision).
        */
        for(var i = Math.max(order_i - 1, 0); i < order_i + 1 && i < this.node_order.length; i++) {
            if(this.node_order[i].order_fuzzy_index == fuzzy_index) {
                this.regenerate_fuzzy_indices();
                return this.new_fuzzy_index_for_position(order_i);
            }
        }
        return fuzzy_index;
    },
    reposition_node: function(node) {
        /*
        Reposition node, if it breaks the constraint of children being to the
        right of parents. Recurses to the nodes that needs further checking due
        to changes.
        */
        this.reset_node_visited();
        this._reposition_node(node);
    },
    _reposition_node: function(node) {
        /*
        Recursive function for the reposition_node only. Do not call from elsewhere.
        */
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
                // update order pointers
                update_rightmost_subnode(node);
                for(var i = 0; i < node.children.length; i++) {
                    update_leftmost_parent(node.children[i]);
                    update_rightmost_parent(node.children[i]);
                }
                for(var i = 0; i < node.parents.length; i++) {
                    update_leftmost_child(node.parents[i]);
                }
                // recurse
                for(var i = 0; i < node.children.length; i++) {
                    this._reposition_node(node.children[i]);
                }
            }
        }
    },
    /* autoexpansion variables and functions */
    // delay in ms, -1 to disable
    node_auto_expand_delay: -1,
    node_auto_expand_queue: [],
    node_auto_expander_on: false,
    queue_for_expand: function(node) {
        /*
        Adds node to queue, if it can be expanded
        */
        if(!node.expandable())
            return;
        Hiski.node_auto_expand_queue.push(node);
        Hiski.start_node_autoexpansion(false);
    },
    start_node_autoexpansion: function(by_button) {
        /*
        Start autoexpander, if it weren't already running and we have a delay
        set for it.
        */
        var expander = function() {
            /*
            Expands nodes automatically with set delay in between.
            */
            if(Hiski.node_auto_expand_delay == -1) {
                Hiski.node_auto_expander_on = false;
                return;
            }
            var node2 = Hiski.node_auto_expand_queue.pop();
            locate_node_on_all(node2);
            node2.expand_surroundings();
            if(Hiski.node_auto_expand_queue.length > 0) {
                setTimeout(expander, Hiski.node_auto_expand_delay);
            } else {
                Hiski.node_auto_expander_on = false;
            }
        };
        if(Hiski.node_auto_expand_queue.length >= 1 &&
                    Hiski.node_auto_expand_delay != -1 &&
                    !Hiski.node_auto_expander_on) {
            Hiski.node_auto_expander_on = true;
            if(by_button)
                expander();
            else
                setTimeout(expander, Hiski.node_auto_expand_delay);
        }
    },
    /* relations / families */
    // expand relations immediately when they are added
    auto_expand_relations: true,
    // relations in the order of adding them
    relations: [],
    // xref to relation dictionary
    relation_dict: {},
    add_relation: function(relation_data, reference, anchor) {
        /*
        Add a relation based on given json data. Returns the relation in
        question.
        */
        if(relation_data.xref in this.relation_dict) {
            // update existing?
            return this.relation_dict[relation_data.xref];
        } else {
            var relation = new Relation(relation_data);
            // take initial coordinates from reference, from which this was opened
            if(reference !== null) {
                relation.x = reference.x;
                relation.y = reference.y;
            } else if(anchor != null && anchor != undefined) {
                relation.x = anchor.x;
                relation.y = anchor.y;
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
            // update order pointers for related nodes
            for(var i = 0; i < relation.children.length; i++) {
                update_leftmost_parent(relation.children[i]);
                update_rightmost_parent(relation.children[i]);
            }
            for(var i = 0; i < relation.parents.length; i++) {
                update_descendant_year(relation.parents[i], null);
                update_rightmost_subnode(relation.parents[i]);
                update_rightmost_spouse(relation.parents[i]);
                update_leftmost_child(relation.parents[i]);
            }
            // expand surrounding nodes immediately
            if(this.auto_expand_relations) {
                relation.expand_surroundings();
            }
            return relation;
        }
    },
    /* links between nodes and relations */
    // links in the order of adding them
    links: [],
    // identifier to link dictionary
    link_dict: {},
    add_link: function(relation, node, type) {
        /*
        Add a link between relation and node.
        */
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
            // XXX: updating order pointers here could be possible, but would
            // require refactoring add_node
        }
    },
    /* other */
    add_entry: function(entry, reference, anchor) {
        /*
        Adds a relation or node depending on which kind of json is given.
        */
        if(entry.tag == "FAM") {
            return this.add_relation(entry, reference, anchor);
        } else if(entry.tag == "INDI") {
            return this.add_node(entry, reference, anchor);
        } else {
            throw new Error("Unhandled tag '"+entry.tag+"'");
        }
    },
    load_or_focus: function(xref, reference) {
        /*
        Focus the node of given xref, if it exists, otherwise locate it.
        */
        this.load(xref, reference);
        if(xref in this.node_dict) {
            this.zoom_to = this.node_dict[xref];
            this.delayed_render();
        }
    },
    load: function(xref, reference, anchor) {
        /*
        Loads the node of given xref, if it didn't exist yet. Takes the data
        from preloaded_entries and adds that, if it was preloaded on for example
        a search.
        */
        if(xref in this.node_dict) {
            if(!this.node_dict[xref].is_visible()) {
                this.open_fold(this.node_dict[xref]);
            }
            return;
        }
        if(xref in this.relation_dict) {
            return;
        }
        if(xref in this.preloaded_entries) {
            Hiski.add_entry(this.preloaded_entries[xref], reference, anchor);
            Hiski.delayed_render();
            return;
        }
        if(xref == "@first@") {
            // replace xref here to set first node to something specific
            //xref = "@I0523@";
        }
        var addr = this.url_root + "json/load/"+xref+"/";
        if(xref === null)
            addr = this.url_root + "json/load-any/";
        Hiski.delay_queue_count += 1;
        d3.json(addr, function(json) {
            if(json && json.result == true) {
                if(json.entry.xref in Hiski.node_dict || json.entry.xref in Hiski.relation_dict) {
                    console.warn("The node already existed, doing nothing.");
                    Hiski.delay_queue_count -= 1;
                    return;
                }
                Hiski.preloaded_entries[json.entry.xref] = json.entry;
                var entry = Hiski.add_entry(json.entry, reference, anchor);
                if(reference === null) {
                    Hiski.zoom_to = entry;
                }
                Hiski.delay_queue_count -= 1;
                Hiski.delayed_render();
            } else {
                Hiski.delay_queue_count -= 1;
                throw new Error("Loading data '"+xref+"' failed");
            }
        });
    },
    delay_running: false,
    delay_queue_count: 0,
    delay_queue_fallback_value: 0,
    delay_render_delay: 500,
    delayed_render: function() {
        /*
        delayed rendering, which gives a bit time for other pending nodes to
        get loaded
        */
        delay_queue_fallback_value = 20;
        var timed = function() {
            if(Hiski.delay_queue_count == 0 || Hiski.delay_queue_fallback_value == 0) {
                Hiski.delay_running = false;
                enter_all();
                Hiski.calc_layout();
                redraw_views();
                render_all();
            } else {
                delay_queue_fallback_value -= 1;
                setTimeout(timed, Hiski.delay_render_delay);
            }
        };
        if(!Hiski.delay_running) {
            Hiski.delay_running = true;
            setTimeout(timed, Hiski.delay_render_delay);
        }
    },

    /* custom layout stuff */
    layout_mode: "compact",
    year_pixel_ratio: 6,
    calc_and_render_layout: function() {
        /*
        Calculates node positions and renders all subviews showing the tree view.
        */
        Hiski.calc_layout();
        render_all();
    },
    reset_node_visited: function() {
        /*
        Resets node visited flag for traversal algorithms.
        */
        for(var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].visited = false;
        }
    },
    calc_layout: function() {
        // todo: refactor
        var node_preferred_position = function(node) {
            var x = node.x;
            var year = guess_node_year(node);
            var y = year * Hiski.year_pixel_ratio;
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
        // initialize reservation buffer
        for(var i = 0; i < 3000; i++) {
            years_x.push(x);
        }
        // position nodes
        this.reset_node_visited();
        var arr = this.node_order;
        for(var i = 0; i < arr.length; i++) {
            var node = arr[i];
            if(!node.is_visible())
                continue;
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
            if(Hiski.layout_mode == "node-order")
                node.x = i*60+80;
            if(node.parents.length > 0 && node.rightmost_parent.visible && !node.rightmost_parent.visited && !node.timetraveller) {
                // abort layout calculation and reposition nodes, when a child is left of its parents
                Hiski.reposition_node(node);
                Hiski.calc_layout();
                return;
            }
            node.visited = true;
            if(node.x == 0 || node.x == undefined || node.x == NaN || node.x < 50) {
                console.warn("Node has x coordinate '"+node.x+"', which seems to be a bug, but I don't know what it is related to.");
            }
            if(node.x < 90 && Hiski.layout_mode == "compact") {
                console.warn("Node has invalid x coordinate " + node.x + ", " + maxx + ", " + year + ", " + endyear);
            }
        }
        if(Hiski.layout_mode == "load-order") {
            for(var i = 0; i < this.nodes.length; i++) {
                this.nodes[i].x = i*60 + 80;
            }
        }
        // position relations
        for(var i = 0; i < this.relations.length; i++) {
            var relation = this.relations[i];
            var pos = relation_preferred_position(relation);
            relation.x = pos[0];
            relation.y = pos[1];
        }
        // separate overlapping relations
        var relations_copy = [];
        var i = this.relations.length;
        while(i--) { relations_copy[i] = this.relations[i]; }
        relations_copy.sort(function(a,b) {
            if(a.y != b.y)
                return a.y - b.y;
            if(a.x != b.x)
                return a.x - b.x;
            var apfis = a.parent_fuzzy_index_sum();
            var bpfis = b.parent_fuzzy_index_sum();
            if(apfis != bpfis)
                return apfis - bpfis;
            if(a.children.length > 0 && b.children.length > 0)
                return a.children[0].order_fuzzy_index - b.children[0].order_fuzzy_index;
            if(b.children.length > 0)
                return 1;
            if(a.children.length > 0)
                return -1;
            return 0;
        });
        var lastx = null;
        var lasty = null;
        var lasti = 0;
        var relation_separation_pad = 14;
        for(var i = 0; i < relations_copy.length; i++) {
            var x = relations_copy[i].x;
            var y = relations_copy[i].y;
            if(lastx === null || (Math.abs(x - lastx) > 10) || (Math.abs(y - lasty) > 10) || (i == relations_copy.length - 1)) {
                var width = i - lasti + ((i == relations_copy.length - 1 && Math.abs(x - lastx) < 10 && Math.abs(y - lasty) < 10) ? 1 : 0);
                if(width > 1) {
                    for(var j = lasti; j < lasti + width; j++) {
                        relations_copy[j].x = relations_copy[j].x + (j - lasti - (width - 1) / 2) * relation_separation_pad;
                    }
                }
                lastx = x;
                lasty = y;
                lasti = i;
            }
        }

        // if zooming to somewhere, do it
        if(this.zoom_to !== null) {
            locate_node_on_all(this.zoom_to);
            this.zoom_to = null;
        }
    },
    color_mode: "family-name",
    node_color_function: function(d) {
        /*
        Returns the node colour depending on the corresponding setting.
        */
        if(Hiski.color_mode == "family-name") {
            return d.color_by_name;
        } else if(Hiski.color_mode == "soundex") {
            return d.color_by_soundex;
        } else if(Hiski.color_mode == "sex") {
            return d.color_by_sex;
        } else if(Hiski.color_mode == "expendability") {
            return d.expandable() ? "#ccffcc" : "#dddddd";
        } else if(Hiski.color_mode == "family-relation") {
            return d.selection_relation_color();
        }
        return "#ff0000";
    },
    toggle_hide_selected: function() {
        this.hide_descendants(this.selected);
        return;
        // todo: rethink
        if(this.selected) {
            if(this.selected.type == "node") {
                this.selected.visible = !this.selected.visible;
            }
        }
        this.calc_layout();
        render_all();
    },
    next_fold: 1,
    hide_descendants: function(node, family) {
        this.reset_node_visited();
        var buffer = [];
        if(typeof family !== "undefined") {
            for(var i = 0; i < family.children.length; i++)
                buffer.push([family.children[i], false]);
            for(var i = 0; i < node.children.length; i++)
                buffer.push([node.children[i], true]);
        }
        buffer.push([node, false]);
        var prebuffer = [node];
        var fold_id = this.next_fold++;
        while(prebuffer.length > 0) {
            var cur = prebuffer.shift();
            for(var i = 0; i < cur.parents.length; i++) {
                buffer.push([cur.parents[i], true]);
                prebuffer.push(cur.parents[i]);
            }
        }
        while(buffer.length > 0) {
            var arr = buffer.shift();
            var cur = arr[0];
            if(cur.visited)
                continue;
            if(!cur.is_visible())
                continue;
            var mode = arr[1];
            for(var i = 0; i < cur.parents.length; i++) {
                buffer.push([cur.parents[i], mode]);
            }
            for(var i = 0; i < cur.children.length; i++) {
                buffer.splice(0, 0, [cur.children[i], mode]);
            }
            cur.visible = mode;
            cur.visited = true;
            if(mode == false)
                cur.fold = fold_id;
        }
        node.visible = true;
        node.fold = 0;
        this.calc_layout();
        render_all();
    },
    hide_ancestors: function(node, family) {
        this.reset_node_visited();
        var buffer = [];
        if(typeof family !== "undefined") {
            for(var i = 0; i < family.parents.length; i++)
                buffer.push([family.parents[i], false]);
            for(var i = 0; i < node.parents.length; i++)
                buffer.push([node.parents[i], true]);
        }
        buffer.push([node, false]);
        var prebuffer = [node];
        var fold_id = this.next_fold++;
        while(prebuffer.length > 0) {
            var cur = prebuffer.shift();
            for(var i = 0; i < cur.children.length; i++) {
                buffer.push([cur.children[i], true]);
                prebuffer.push(cur.children[i]);
            }
        }
        while(buffer.length > 0) {
            var arr = buffer.shift();
            var cur = arr[0];
            if(cur.visited)
                continue;
            if(!cur.is_visible())
                continue;
            var mode = arr[1];
            for(var i = 0; i < cur.children.length; i++) {
                buffer.push([cur.children[i], mode]);
            }
            for(var i = 0; i < cur.parents.length; i++) {
                buffer.splice(0, 0, [cur.parents[i], mode]);
            }
            cur.visible = mode;
            cur.visited = true;
            if(mode == false)
                cur.fold = fold_id;
        }
        node.visible = true;
        node.fold = 0;
        this.calc_layout();
        render_all();
    },
    hide_relative: function(node, family) {
        for(var i = 0; i < family.parents.length; i++) {
            if(family.parents[i] == node)
                return this.hide_descendants(node, family);
        }
        for(var i = 0; i < family.children.length; i++) {
            if(family.children[i] == node)
                return this.hide_ancestors(node, family);
        }
    },
    hide_besides_path: function() {
        if(this.selected_path.length < 3)
            return;
        var fold_id = this.next_fold++;
        for(var i = 0; i < this.node_order.length; i++) {
            if(this.node_order[i].fold == 0) {
                this.node_order[i].fold = fold_id;
                this.node_order[i].visible = false;
            }
        }
        // every second in the list is an individual
        for(var i = 0; i < this.selected_path.length / 2; i++) {
            var node = this.node_dict[this.selected_path[i]];
            node.fold = 0;
            node.visible = true;
        }
        this.calc_layout();
        render_all();
    },
    open_fold: function(node) {
        var fold = node.fold;
        if(fold == 0)
            return;
        this.reset_node_visited();
        var buffer = [node];
        while(buffer.length > 0) {
            var cur = buffer.shift();
            if(cur.visited)
                continue;
            if(cur.fold != fold)
                continue;
            cur.fold = 0;
            cur.visible = true;
            for(var i = 0; i < cur.parents.length; i++) {
                buffer.push(cur.parents[i]);
            }
            for(var i = 0; i < cur.children.length; i++) {
                buffer.push(cur.children[i]);
            }
        }
        this.calc_layout();
        render_all();
    },

    /* map related */
    map: null,
    map_id: "map",
    map_overlay: null,
    overlay_nodes: null,
    map_projection: null,

    /* selection */
    selected: null,
    lastselected: null,
    selected_path: [],
    select_node: function(node, redraw) {
        /*
        selects the given node and redraws subviews if redraw is true. The
        redraw flag exists to be able to not trigger redraw during angular
        digest, which is followed by a redraw anyway.
        */
        if(this.lastselected != this.selected)
            this.lastselected = this.selected;
        this.selected = node;
//        this.selected_path = [];
        for(var i = 0; i < item_views.length; i++) {
            item_views[i].selected_node = node;
        }
        if(redraw) {
            redraw_views();
        }
        render_all();
    },
    update_selection_relations: function() {
        for(var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].selection_relation = "";
        }
        for(var i = 0; i < this.relations.length; i++) {
            this.relations[i].selection_relation = "";
        }
        if(this.selected == null)
            return;
        for(var i = 0; i < this.selected.relations.length; i++) {
            this.selected.relations[i].set_selection_relation("next-to-selected");
        }
        var relation_terms = ["selected", {
            children: ["child", {
                children: ["grandchild", {
                }],
            }],
            parents: ["parent", {
                parents: ["grandparent", {
                }],
                children: ["sibling", {
                }],
            }],
            spouses: ["spouse", {
            }],
        }];
        this.reset_node_visited();
        var buffer = [[this.selected, relation_terms]];
        while(buffer.length > 0) {
            var arr = buffer.shift();
            var cur = arr[0];
            if(cur.visited)
                continue;
            cur.visited = true;
            var terms = arr[1][1];
            cur.set_selection_relation(arr[1][0]);
            if(terms.parents !== undefined) {
                for(var i = 0; i < cur.parents.length; i++) {
                    buffer.push([cur.parents[i], terms.parents]);
                }
            }
            if(terms.children !== undefined) {
                for(var i = 0; i < cur.children.length; i++) {
                    buffer.push([cur.children[i], terms.children]);
                }
            }
            if(terms.spouses !== undefined) {
                for(var i = 0; i < cur.spouses.length; i++) {
                    buffer.push([cur.spouses[i], terms.spouses]);
                }
            }
        }
    },
    zoom_to: null,

    testnote: null,
    debug_mode: false,
    at_entrance: true,

    /* Comment related */
    // Commentator information
    comment_name: "",
    comment_email: "",
    // Load comments for node
    load_comments_for: function(xref) {
        var addr = this.url_root + "json/load/comments/"+xref+"/";
        if(xref == null)
            return;
        if(!(xref in Hiski.node_dict))
            return;
        d3.json(addr, function(json) {
            if(json && json.result == true) {
                Hiski.node_dict[xref].comments = json.comments;

                Hiski.delayed_render();
                redraw_views();
            } else {
                throw new Error("Loading data '"+xref+"' failed");
            }
        });
    },

    /* Celebrities */
    celebrity_nodes: [],
    set_celebrities: function(inds) {
        for(var i = 0; i < inds.length; i++) {
            this.preloaded_entries[inds[i].xref] = inds[i];
        }
        this.celebrity_nodes = inds;
    },
};

