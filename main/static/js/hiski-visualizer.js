
app = angular.module("HiskiVisualizer", ["pascalprecht.translate"]);
app.controller("TopMenuController", function($scope, $translate) {
        var menu = this;
        menu.blue = function() {
            $(".main").css("background-color", "#ccccff");
        };
        menu.set_color = function(color) {
            $(".topmenu").css("background-color", color);
        };
        menu.toggle_color_mode = function() {
            Hiski.next_color_mode();
//            render(Hiski);
            render_all();
        };
        menu.set_language = function(lang) {
            $translate.use(lang);
        };
        menu.load_random = function() {
            Hiski.load(null, null);
        };
        menu.print_order = function() {
            console.warn("----------------------------------");
            for(var i = 0; i < Hiski.node_order.length; i++) {
                var node = Hiski.node_order[i];
                var second_index = Hiski.nodes.indexOf(node);
                console.warn(i + " (" + second_index + "):  " +
                        node.xref + ",  " +
                        "year: " + node.year + ",  " +
                        "lody: " + node.last_open_descendant_year + ",  " +
                        node.name + "        -- " +
                        node.order_reason);
            }
        };
        menu.toggle_layout = function() {
            Hiski.toggle_layout();
        };
    });
app.config(function($translateProvider) {
    for(key in translations) {
        $translateProvider.translations(key, translations[key]);
    }
    $translateProvider.preferredLanguage("en");
//    $translateProvider.useCookieStorage();
    $translateProvider.useMissingTranslationHandler("handleMissingTranslations");
    // no sanitation strategy, because we should be in full control of all data
    $translateProvider.useSanitizeValueStrategy(null);
});
var missing_trans = {};
app.factory("handleMissingTranslations", function() {
    return function(translationID) {
        if(!(translationID in missing_trans)) {
            missing_trans[translationID] = true;
        }
        var s = "";
        for(var id in missing_trans) {
            s += "\""+id+"\": \""+id+"\",\n";
        }
        console.warn("Missing translation key: '" + translationID + "'. Copy pasteable line for all:\n"+
        s);
//        "    \""+translationID+"\": \""+translationID+"\",\n");
    };
});

var ItemView = function(id, controller) {
    this.id = id;
    this.html_id = "ItemView"+id;
    this.tree_id = this.html_id + "Tree";
    this.map_id = this.html_id + "Map";
    this.search_id = this.html_id + "Search";
    this.controller = controller;
    this.mode = "tree";
    item_views.push(this);
    this.close = function() {
        var i = item_views.indexOf(this);
        if(i != -1)
            item_views.splice(i, 1);
    };
    this.set_mode = function(mode) {
        this.mode = mode;
        if(mode == "tree") {
            enter(this);
            render(this);
        } else if(mode == "map") {
            $("#"+this.map_id).append($("#map"));
            if(Hiski.map === null) {
                map_init();
            }
        }
    };
    // for tree view
    this.tree_ready = false;
    var item_view = this;
    var timeout = 100;
    var poll_dom = function() {
        var svg = d3.select("#"+item_view.tree_id);
        if(svg.empty()) {
            timeout = timeout * 2;
            setTimeout(poll_dom, timeout);
            console.warn("timeout "+timeout);
        } else {
            tree_init(item_view);
            enter(item_view);
            render(item_view);
            item_view.tree_ready = true;
        }
    };
    setTimeout(poll_dom, timeout);
    // for info view
    var selected_node = Hiski.selected;
    // for map view
    this.map = null;
};
this._next_id = 0;
this.next_id = function() {
    var id = this._next_id;
    this._next_id += 1;
    return id;
};
var item_views = [];

app.controller("ItemViewMenuController", function($scope, $translate) {
        var menu = this;
        menu.item = new ItemView(next_id(), this);
        menu.color = "#ffffff";
        menu.selected_node = Hiski.selected;
        menu.search_by = "name";
        menu.search_term = "";
        menu.set_color = function(color) {
            menu.color = color;
        };
        menu.set_tab = function(tabname) {
            menu.item.set_mode(tabname);
        };
        $scope.$on("$destroy", function() {
            console.warn("closed item "+menu.item.id);
            menu.item.close();
        });
        menu.redraw = function() {
            $scope.$apply();
        };
        menu.do_search = function() {
            if(menu.search_by == "xref") {
                Hiski.load(menu.search_term, null);
            } else if(menu.search_by == "name") {
            }
        };
    });

app.controller("MultiViewController", function($scope, $translate) {
        var multi_view = this;
        this.columns = [
            ];
        var create_item = function() {
            return null;
            //var item = new ItemView(multi_view.next_id());
        }
        this.add_column = function() {
            multi_view.columns.push({
                    items: [
                        create_item()
                    ]
                });
        };
        this.add_item = function(column_i) {
            multi_view.columns[column_i].items.push(create_item());
        };
        this.close_item = function(column_i, item_i) {
            console.warn("close "+column_i+","+item_i);
            if(multi_view.columns[column_i].items.length == 1) {
                multi_view.close_column(column_i);
                return;
            }
            multi_view.columns[column_i].items.splice(item_i, 1);
        };
        this.close_column = function(column_i) {
            console.warn("close "+column_i+",*");
            multi_view.columns.splice(column_i, 1);
            if(multi_view.columns.length == 0) {
                multi_view.add_column();
            }
        };

        this.add_column();
    });

function color_hash(str) {
    var hash = 0;
    var chr;
    if(str.length == 0)
        return "#000000";
    var len = str.length;
    for(var i = 0; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash = hash & 0xffffff;
    }
    var s = hash.toString(16);
    while(s.length < 6)
        s = "0" + s;
    return "#" + s;
}
function color_sex(sex) {
    if(sex == "F")
        return "#ffcccc";
    if(sex == "M")
        return "#ccccff";
//    alert("unhandled sex: '"+sex+"'");
    return "#dddddd";
}


function Node(data) {
    // identifying and source data
    this.type = "node";
    this.data = data;
    this.xref = data.xref;
    this.name = data.name;
    this.first_name = this.name.split("/")[0];
    this.family_name = this.name.split("/")[1];

    // graph and person relations
    this.relations = [];
    this.parents = [];
    this.spouses = [];
    this.children = [];
    this.siblings = [];


    // order pointers
    this.rightmost_subnode = null;
    this.leftmost_parent = null;
    this.rightmost_parent = null;
    this.order_reason = "None";
    this.order_fuzzy_index = 0.0;

    // layout
    this.x = _.random(0, 400) + 200;
    this.y = 0;
    this.year = data.birth_date_year;
    this.color_by_name = color_hash(this.family_name);
    this.color_by_sex = color_sex(this.data.sex);
    this.last_open_descendant_year = this.year;


    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.y;
    };

    this.get_relation_xrefs = function() {
        res = [];
        for(var i = 0; i < this.data.sub_families.length; i++) {
            res.push([this.data.sub_families[i], "spouse"]);
        }
        for(var i = 0; i < this.data.sup_families.length; i++) {
            res.push([this.data.sup_families[i], "child"]);
        }
        return res;
    };
    this.expand_surroundings = function() {
        var arr = this.get_relation_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
    this.expandable = function() {
        var arr = this.get_relation_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var xref = arr[i][0];
            if(!(xref in Hiski.relation_dict))
                return true;
        }
        return false;
    };
}

function link_node_to(node, relation, type) {
    if(type == "child") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.parents.push(relation.parents[i]);
            relation.parents[i].children.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.siblings.push(relation.children[i]);
            relation.children[i].siblings.push(node);
        }
        relation.children.push(node);
    } else if(type == "wife") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.spouses.push(relation.parents[i]);
            relation.parents[i].spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.wife = node;
        relation.parents.push(node);
    } else if(type == "husband") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.spouses.push(relation.parents[i]);
            relation.parents[i].spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.husband = node;
        relation.parents.push(node);
    } else if(type == "parent") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.spouses.push(relation.parents[i]);
            relation.parents[i].spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.parents.push(node);
    }
    relation.nodes.push(node);
    node.relations.push(relation);
}
function find_link_type(node, relation) {
    if(_.indexOf(relation.data.children, node.xref) != -1) {
        return "child";
    }
    if(_.indexOf(relation.data.parents, node.xref) != -1) {
        return "parent";
    }
    throw new Error("No node '"+obj.xref+"' in relation '"+relation.xref+"'");
}
function update_leftmost_parent(node) {
    var leftmost = null;
    var leftmost_fuzzy = 0.0;
    for(var i = 0; i < node.parents.length; i++) {
        if(leftmost == null || node.parents[i].order_fuzzy_index < leftmost_fuzzy) {
            leftmost = node.parents[i];
            leftmost_fuzzy = node.parents[i].order_fuzzy_index;
        }
    }
    node.leftmost_parent = leftmost;
}
function update_rightmost_parent(node) {
    var rightmost = null;
    var rightmost_fuzzy = 0.0;
    for(var i = 0; i < node.parents.length; i++) {
        if(rightmost == null || node.parents[i].order_fuzzy_index > rightmost_fuzzy) {
            rightmost = node.parents[i];
            rightmost_fuzzy = node.parents[i].order_fuzzy_index;
        }
    }
    node.rightmost_parent = rightmost;
}
function update_rightmost_subnode(node) {
    var rightmost = node.rightmost_subnode;
    if(rightmost === null)
        rightmost = node;
    var rightmost_fuzzy = rightmost.order_fuzzy_index;
    for(var i = 0; i < node.spouses.length; i++) {
        var other = node.spouses[i].rightmost_subnode;
        var fuzzy = other.order_fuzzy_index;
        if(fuzzy > rightmost_fuzzy) {
            rightmost = other;
            rightmost_fuzzy = fuzzy;
        }
    }
    for(var i = 0; i < node.children.length; i++) {
        var other = node.children[i].rightmost_subnode;
        var fuzzy = other.order_fuzzy_index;
        if(fuzzy > rightmost_fuzzy) {
            rightmost = other;
            rightmost_fuzzy = fuzzy;
        }
    }
    if(rightmost != node.rightmost_subnode) {
        node.rightmost_subnode = rightmost;
        for(var i = 0; i < node.spouses.length; i++) {
            update_rightmost_subnode(node.spouses[i]);
        }
        for(var i = 0; i < node.parents.length; i++) {
            update_rightmost_subnode(node.parents[i]);
        }
    }
}
function update_descendant_year(node, newyear) {
    var year = node.last_open_descendant_year;
    if(newyear === null) {
        for(var i = 0; i < node.children.length; i++) {
            year = Math.max(node.children[i].last_open_descendant_year, year);
        }
        node.last_open_descendant_year = year;
        for(var i = 0; i < node.parents.length; i++) {
            update_descendant_year(node.parents[i], year);
        }
    } else {
        node.last_open_descendant_year = Math.max(year, newyear);
        for(var i = 0; i < node.parents.length; i++) {
            update_descendant_year(node.parents[i], year);
        }
    }
}


function Relation(data) {
    // identifying and source data
    this.type = "relation";
    this.data = data;
    this.xref = data.xref;

    // graph relations
    this.nodes = [];
    this.children = [];
    this.parents = [];
    this.wife = null;
    this.husband = null;

    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.y;
    };
    this.get_preferred_x = function() {
        var sumspouse = 0.0;
        var numspouse = 0;
        var sumchildren = 0.0;
        var numchildren = 0;
        for(var i = 0; i < this.children.length; i++) {
            sumchildren += this.children[i].get_x();
            numchildren += 1;
        }
        for(var i = 0; i < this.parents.length; i++) {
            sumspouse += this.parents[i].get_x();
            numspouse += 1;
        }
        if(numspouse == 0 && numchildren == 0)
            return this.x;
        if(numspouse == 0) {
            return sumchildren / numchildren;
        } else if(numchildren == 0) {
            return sumspouse / numspouse;
        }
        return ((sumchildren / numchildren) + (sumspouse / numspouse)) / 2;
    };
    this.get_preferred_y = function() {
        var minchild = null;
        var maxspouse = null;
        for(var i = 0; i < this.children.length; i++) {
            minchild = Math.min(minchild === null ? 2000000000 : minchild,
                    this.children[i].get_y());
        }
        for(var i = 0; i < this.parents.length; i++) {
            maxspouse = Math.max(maxspouse === null ? -2000000000 : maxspouse,
                    this.parents[i].get_y());
        }
        if(minchild === null && maxspouse === null)
            return this.y;
        if(maxspouse === null) {
            return minchild - 50;
        } else if(minchild === null) {
            return maxspouse + 50;
        }
        this.y_space = (minchild - maxspouse) / 2;
        return (minchild + maxspouse) / 2;
    };

    this.get_node_xrefs = function() {
        var res = [];
        for(var i = 0; i < this.data.children.length; i++) {
            res.push([this.data.children[i], "child"]);
        }
        for(var i = 0; i < this.data.parents.length; i++) {
            res.push([this.data.parents[i], "parent"]);
        }
        return res;
    };
    this.expand_surroundings = function() {
        var arr = this.get_node_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
    this.x = this.get_preferred_x();
    this.y = this.get_preferred_y();
    this.y_space = 40;
}

function create_link_id(relation, node) {
    return relation.xref + node.xref;
}
function Link(relation, node, type) {
    this.type = "link";
    this.relation = relation;
    this.node = node;
    this.type = type;

    this.id = create_link_id(relation, node);

    this.get_path_points = function() {
        var points = [];
        var node_size = 20;
        var relation_size = 5;
        var pad = 0;
        var straight = 4;
        var y_space = this.relation.y_space - node_size - relation_size - straight*2 - pad*2;
        if(this.type == "child") {
            points.push([this.relation.get_x(), this.relation.get_y()]);
            points.push([this.relation.get_x(), this.relation.get_y() + relation_size + pad]);
            points.push([this.relation.get_x(), this.relation.get_y() + relation_size + pad + straight]);
            points.push([this.node.get_x(),     this.relation.get_y() + relation_size + y_space]);
            points.push([this.node.get_x(),     this.node.get_y() - node_size - pad]);
            points.push([this.node.get_x(),     this.node.get_y()]);
        } else {
            points.push([this.relation.get_x(), this.relation.get_y()]);
            points.push([this.relation.get_x(), this.relation.get_y() -relation_size - pad]);
            points.push([this.relation.get_x(), this.relation.get_y() -relation_size - pad - straight]);
            points.push([this.node.get_x(),     this.relation.get_y() -relation_size - y_space]);
            points.push([this.node.get_x(),     this.node.get_y() + node_size + pad]);
            points.push([this.node.get_x(),     this.node.get_y()]);
        }
        return points;
    };
    this.get_color = function() {
        // todo: if they have lighter colours, they should also have a different z-order
        var distance = Math.abs(this.relation.get_x() - this.node.get_x());
        if(distance < 1000)
            return "#000000";
        else if(distance < 3000)
            return "#888888";
        else if(distance < 6000)
            return "#cccccc";
        else
            return "#e3e3e3";
    };
}
var line_function = d3.svg.line()
        .x(function(d) { return d[0]; })
        .y(function(d) { return d[1]; })
        .interpolate("basis")
        ;

var Hiski = {
    url_root: "/",
    // nodes / people
    nodes: [],
    node_dict: {},
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
                    } else if(node.parents.length > 0) {
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
            if(this.node_order.length == 0) {
                node.order_fuzzy_index = 0.0;
            } else if(order_i == 0) {
                node.order_fuzzy_index = this.node_order[0].order_fuzzy_index - 1.0;
            } else if(order_i == this.node_order.length) {
                node.order_fuzzy_index = _.last(this.node_order).order_fuzzy_index + 1.0;
            } else {
                node.order_fuzzy_index = (this.node_order[order_i - 1].order_fuzzy_index +
                        this.node_order[order_i].order_fuzzy_index) / 2.0;
            }
            this.node_order.splice(order_i, 0, node);
            // update layout related summarised data
            update_descendant_year(node, null);
            update_rightmost_subnode(node);
            for(var i = 0; i < node.children.length; i++) {
                update_leftmost_parent(node.children[i]);
                update_rightmost_parent(node.children[i]);
            }
            // queue for expanding if the feature is on
            if(this.node_auto_expand_delay != -1) {
                this.queue_for_expand(node);
            }
        }
    },
    node_auto_expand_delay: -1, // -1 to disable
    node_auto_expand_queue: [],
    queue_for_expand: function(node) {
        var expander = function() {
            var node2 = Hiski.node_auto_expand_queue.pop();
            node2.expand_surroundings();
            if(Hiski.node_auto_expand_queue.length > 0) {
                setTimeout(expander, Hiski.node_auto_expand_delay);
            }
        };
        if(!node.expandable())
            return;
        Hiski.node_auto_expand_queue.push(node);
        if(Hiski.node_auto_expand_queue.length == 1) {
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
        var addr = this.url_root + "json/load/"+xref+"/";
        if(xref === null)
            addr = this.url_root + "json/load-any/";
        d3.json(addr, function(json) {
            if(json) {
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
    calc_layout: function() {
        var guess_node_year = function(node) {
            // guess some year for node in order to know where to display it
            var year = null;
            if(node.year !== null) {
                year = node.year;
            } else {
                if(node.spouses.length > 0) {
                    for(var i = 0; i < node.spouses.length; i++) {
                        if(node.spouses[i].year !== null) {
                            year = node.spouses[i].year;
                            break;
                        }
                    }
                }
                if(year === null && node.siblings.length > 0) {
                    for(var i = 0; i < node.siblings.length; i++) {
                        if(node.siblings[i].year !== null) {
                            year = node.siblings[i].year;
                            break;
                        }
                    }
                }
                if(year === null) {
                    var parent_max = null;
                    if(node.parents.length > 0) {
                        for(var i = 0; i < node.parents.length; i++) {
                            if(parent_max === null) {
                                parent_max = node.parents[i].year;
                            } else if(node.parents[i].year !== null) {
                                parent_max = Math.max(parent_max, node.parents[i].year);
                            }
                        }
                    }
                    var child_min = null;
                    if(node.children.length > 0) {
                        for(var i = 0; i < node.children.length; i++) {
                            if(child_min === null) {
                                child_min = node.children[i].year;
                            } else if(node.children[i].year !== null) {
                                child_min = Math.min(child_min, node.children[i].year);
                            }
                        }
                    }
                    if(parent_max !== null) {
                        if(child_min !== null) {
                            year = (parent_max + child_min) / 2;
                        } else {
                            // guessing the parents were about 30 on birth
                            year = parent_max + 20;
                        }
                    } else {
                        if(child_min !== null) {
                            // guessing the parents were about 30 on birth
                            year = child_min - 20;
                        }
                    }
                }
            }
            if(year === null) {
                console.warn("Still unable to guess year for '"+node.xref+"' after looking at family members.");
                year = 0;
            }
            return year;
        };
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
        var arr = this.node_order;
        for(var i = 0; i < arr.length; i++) {
            arr[i].visited = false;
        }
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
            node.x = maxx + pad;
            if(node.parents.length > 0 && node.leftmost_parent.visited)
                node.x = Math.max(node.x, node.leftmost_parent.x);
            for(var j = Math.max(0, year - pad_years); j < year + pad_years; j++) {
                years_x[j] = node.x;
            }
            if(Hiski.layout_mode == 1)
                node.x = i*60+60;
            if(node.parents.length > 0 && !node.leftmost_parent.visited) {
                // This really happens at some point when I have hundreds of nodes opened.
                // Might be related to cycles? maybe? not entirely sure.
                // Need some fake data with simpler cycles.
                // Another weirdness are the nodes that still are not getting x coordinate properly.
                console.warn("The node order is not clean anymore. There is some child before its parent. This is a bug and related to cycles (cycle2.ged).");
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


    selected: null,
};

var container = null;
var zoom = null;
function zoomed() {
    container.attr("transform", "translate("+d3.event.translate+")scale("+d3.event.scale+")");
}
function dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
}
function dragged(d) {
    d3.select(this)
            .attr("cx", d.x = d3.event.x)
            .attr("cy", dy = d3.event.y);
}
function dragended(d) {
    d3.select(this).classed("dragging", false);
}

function tree_init(item_view) {
    var container = null;
    var zoomfun = function() {
        container.attr("transform", "translate("+d3.event.translate+")scale("+d3.event.scale+")");
    }
    var zoom = d3.behavior.zoom()
            .scaleExtent([0.05, 10])
            .on("zoom", zoomfun)
            ;
    var drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended)
            ;
    item_view.tree_drawable = d3.select("#"+item_view.tree_id)
            .append("g")
            .classed("zoomnpan", true)
            .call(zoom)
            ;
    var background = item_view.tree_drawable.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("fill", "none")
            .style("pointer-events", "all")
            ;
    container = item_view.tree_drawable.append("g")
            .classed("container", true)
            ;
    var layers = ["debug", "links", "nodes", "relations"];
    container.selectAll("g.layer")
            .data(layers)
            .enter()
            .append("g")
            .attr("class", function(d) { return d; })
            .classed("layer", true)
            ;
    item_view.linksvg = container.selectAll("g.layer.links").selectAll("path.link");
    item_view.nodesvg = container.selectAll("g.layer.nodes").selectAll("g.node");
    item_view.relationsvg = container.selectAll("g.layer.relations").selectAll("g.relation");
}

function d3_init() {
    zoom = d3.behavior.zoom()
            .scaleExtent([0.05, 10])
            .on("zoom", zoomed)
            ;
    var drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended)
            ;

    svg = d3.select("svg#tree")
            .append("g")
            .classed("zoomnpan", true)
            .call(zoom)
            ;
    var background = svg.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("fill", "none")
            .style("pointer-events", "all")
            ;
    container = svg.append("g")
            .classed("container", true)
            ;
    var layers = ["debug", "links", "nodes", "relations"];
    container.selectAll("g.layer")
            .data(layers)
            .enter()
            .append("g")
            .attr("class", function(d) { return d; })
            .classed("layer", true)
            ;
    Hiski.linksvg = container.selectAll("g.layer.links").selectAll("path.link");
    Hiski.nodesvg = container.selectAll("g.layer.nodes").selectAll("g.node");
    Hiski.relationsvg = container.selectAll("g.layer.relations").selectAll("g.relation");
}
function enter_all() {
    for(var i = 0; i < item_views.length; i++) {
        if(item_views[i].mode != "tree")
            continue;
        if(item_views[i].tree_ready)
            enter(item_views[i]);
    }
}
function select_node(d) {
    Hiski.selected = d;
    for(var i = 0; i < item_views.length; i++) {
        item_views[i].controller.selected_node = d;
        if(item_views[i].mode == "info") {
            item_views[i].controller.redraw();
            continue;
        }
    }
}
function enter(view) {
    view.linksvg = view.linksvg
            .data(Hiski.links)
            ;
    var newlinks = view.linksvg.enter()
            .append("path")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .attr("stroke", "#000")
                .classed("link", true)
                .attr("d", function(d) {
                        return line_function(d.get_path_points())
                    })
            ;

    view.nodesvg = view.nodesvg
            .data(Hiski.nodes)
            ;
    var newnodes = view.nodesvg.enter()
            .append("g")
                .classed("node", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+") scale(0.01)"})
                .on("click", function(d) {
                    Hiski.selected = d;
                    select_node(d);
                    d.expand_surroundings();
                })
            ;
    newnodes.append("circle")
            .attr("r", 20)
            .style("fill", Hiski.node_color_function)
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", -10)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.name + "--";
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "bold")
            .style("font-size", "60%")
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 5)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.data.birth_date_string;
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "normal")
            .style("font-size", "50%")
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 15)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.data.death_date_string;
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "normal")
            .style("font-size", "50%")
            ;


    view.relationsvg = view.relationsvg
            .data(Hiski.relations)
            ;
    var newrelations = view.relationsvg.enter()
            .append("g")
                .classed("relation", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+") scale(0.01)"})
            ;
    newrelations.append("circle")
            .attr("r", 5)
            .on("click", function(d) { d.expand_surroundings(); })
            ;
}
function render_all() {
    for(var i = 0; i < item_views.length; i++) {
        if(item_views[i].mode != "tree")
            continue;
        if(item_views[i].tree_ready)
            render(item_views[i]);
    }
}
function render(view) {
    var duration = 2200;

    view.linksvg
            .transition()
            .duration(duration)
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            .style("stroke", function(d) {
                    return d.get_color();
                })
            ;

    view.nodesvg
            .transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    view.nodesvg.selectAll("circle")
            .style("fill", Hiski.node_color_function)
            ;

    view.relationsvg
            .transition()
            // shorter duration here makes no sense, but the desync makes no sense either
            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
}

function map_init() {
    Hiski.map = new google.maps.Map(d3.select("#map").node(), {
            zoom: 8,
            center: new google.maps.LatLng(37., 12.),
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            });
    var overlay = new google.maps.OverlayView();
    var fakedata = [
        {xx: 37.1, yy: 12.1},
        {xx: 37.01, yy: 12.01},
        {xx: 37.001, yy: 12.001},
        {xx: 37.0001, yy: 12.0001},
        {xx: 37., yy: 12.},
    ];
    overlay.onAdd = function() {
        var layer = d3.select(this.getPanes().overlayLayer)
                .append("svg")
                .attr("class", "foobar")
                ;

        // if it is panned over 1000 pixels in a direction, we are out of drawable area of this svg...
        overlay.draw = function() {
            layer.style("margin-left", "-1000px")
                    .style("margin-top", "-1000px")
                    .attr("width", "3000px")
                    .attr("height", "3000px")
                    ;

            var projection = this.getProjection();
            var padding = 10;
            var marker = layer.selectAll("circle")
                    .data(fakedata)
                    .each(transform)
                .enter()
                    .append("svg:circle")
                    .attr("r", 4.5)
                    .each(transform)
                    .attr("class", "marker")
                    ;
            function transform(d) {
                d = new google.maps.LatLng(d.xx, d.yy);
                d = projection.fromLatLngToDivPixel(d);
                return d3.select(this)
                        .attr("cx", d.x + 1000)
                        .attr("cy", d.y + 1000)
                        ;
            }
        };
    };
    overlay.setMap(Hiski.map);
}

$(document).ready(function() {
//    map_init();
    render_all();
//    Hiski.load("@I01@", null);
//    Hiski.load("@I2131@", null);
//    Hiski.load("@I1307@", null);
    Hiski.load(null, null);
});
