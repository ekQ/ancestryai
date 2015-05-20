
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
            render();
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
app.factory("handleMissingTranslations", function() {
    return function(translationID) {
        console.warn("Missing translation key: '" + translationID + "'. Copy pasteable line:\n"+
        "    \""+translationID+"\": \""+translationID+"\",\n");
    };
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

function traverse_nodes(nodes) {
    var newlist = [];
    var visit = function(node) {
        node.visited = true;
        newlist.push(node);
    };
    var traverse_up = function(node) {
        if(node.visited)
            return;
        for(var i = 0; i < node.parents.length; i++) {
            traverse_up(node.parents[i]);
        }
        traverse_down(node);
    };
    var traverse_down = function(node) {
        visit(node);
        for(var i = 0; i < node.children.length; i++) {
            traverse_up(node.children[i]);
        }
    };
    for(var i = 0; i < nodes.length; i++) {
        nodes[i].visited = false;
    }
    for(var i = 0; i < nodes.length; i++) {
        if(!nodes[i].visited)
            traverse_up(nodes[i]);
    }
    return newlist;
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

    this.rightmost_subnode = this;
    this.rightmost_child = null;
    this.rightmost_spouse = null;

    // order pointers
    this.leftmost = this;
    this.rightmost = this;
    this.leftmost_sub = this;
    this.rightmost_sub = this;
    this.leftmost_sup = this;
    this.rightmost_sup = this;
    this.leftmost_sub_family = null;
    this.rightmost_sub_family = null;
    this.leftmost_sup_family = null;
    this.rightmost_sup_family = null;
    this.order_reason = "None";
    this.order_fuzzy_index = 0.0;

    // layout
    this.x = _.random(0, 400) + 200;
    this.y = 0;
    this.year = data.birth_date_year;
    this.real_y = this.y;
    this.color_by_name = color_hash(this.family_name);
    this.color_by_sex = color_sex(this.data.sex);
    this.last_open_descendant_year = this.year;


    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.real_y;
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
    this.get_leftmost_parent = function() {
        var leftmost = null;
        var leftmost_index = 0;
        for(var i = 0; i < this.parents.length; i++) {
            var index = Hiski.node_order.indexOf(this.parents[i]);
            if(leftmost === null || index < leftmost_index) {
                leftmost = this.parents[i];
                leftmost_index = index;
            }
        }
        return leftmost;
    };
    this.get_rightmost_parent = function() {
        var rightmost = null;
        var rightmost_index = 0;
        for(var i = 0; i < this.parents.length; i++) {
            var index = Hiski.node_order.indexOf(this.parents[i]);
            if(rightmost === null || index > rightmost_index) {
                rightmost = this.parents[i];
                rightmost_index = index;
            }
        }
        return rightmost;
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
function update_rightmost_subnode(node) {
    var childsub = null;
    if(node.children.length > 0) {
//        node.rightmost_subnode = node.rightmost_child.rightmost_subnode;
        childsub = node.rightmost_child.rightmost_subnode;
    }
    var spousesub = null;
    if(node.spouses.length > 0) {
        if(node.rightmost_spouse === null) {
            console.warn("node.rightmost_spouse was null. Likely from connecting two existing nodes to a family. Anyways, this is a bug.");
        } else {
            spousesub = node.rightmost_spouse.rightmost_subnode;
        }
    }
    if(childsub !== null && spousesub !== null) {
        var childsub_index = Hiski.node_order.indexOf(childsub);
        var spousesub_index = Hiski.node_order.indexOf(spousesub);
        if(childsub_index > spousesub_index) {
            node.rightmost_subnode = childsub;
        } else {
            node.rightmost_subnode = spousesub;
        }
    } else if(childsub !== null) {
        node.rightmost_subnode = childsub;
    } else if(spousesub !== null) {
        node.rightmost_subnode = spousesub;
    }
    for(var i = 0; i < node.parents.length; i++) {
        update_rightmost_subnode(node.parents[i]);
    }
}
function get_rightmost_old(arr) {
    var rightmost = null;
    var rightmost_index = 0;
    for(var i = 0; i < arr.length; i++) {
        var index = Hiski.node_order.indexOf(arr[i]);
        if(rightmost === null || index > rightmost_index) {
            rightmost = arr[i];
            rightmost_index = index;
        }
    }
    return rightmost;
}
function update_rightmost_spouse(node) {
    var update = function(node) {
        node.rightmost_spouse = get_rightmost_old(node.spouses);
    };
    update(node);
    for(var i = 0; i < node.spouses.length; i++) {
        update(node.spouses[i]);
    }
}
function update_rightmost_child(node) {
    var update = function(node) {
        node.rightmost_child = get_rightmost_old(node.children);
    };
    update(node);
    for(var i = 0; i < node.parents.length; i++) {
        update(node.parents[i]);
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

function get_rightmost(arr, fun, old=null) {
    var rightmost = old;
    var rightmost_fuzzy = old === null ? 0.0 : fun(old);
    for(var i = 0; i < arr.length; i++) {
        var fuzzy = fun(arr[i]);
        if(rightmost === null || fuzzy > rightmost_fuzzy) {
            rightmost = arr[i];
            rightmost_fuzzy = fuzzy;
        }
    }
    return rightmost;
}
function get_leftmost(arr, fun, old=null) {
    var leftmost = null;
    var leftmost_fuzzy = old === null ? 0.0 : fun(old);
    for(var i = 0; i < arr.length; i++) {
        var fuzzy = fun(arr[i]);
        if(leftmost === null || fuzzy < leftmost_fuzzy) {
            leftmost = arr[i];
            leftmost_fuzzy = fuzzy;
        }
    }
    return leftmost;
}
function update_relation_order_pointers(relation) {
//    relation.leftmost
    // order pointers
    this.leftmost = null;
    this.rightmost = null;
    this.leftmost_sub = null;
    this.rightmost_sub = null;
    this.leftmost_sup = null;
    this.rightmost_sup = null;
    this.left_parent = null;
    this.right_parent = null;
}
function update_order_pointers(node) {
    update_order_pointers_sub(node);
    update_order_pointers_sup(node);
    // order pointers
    this.leftmost_sub_family = null;
    this.rightmost_sub_family = null;
    this.leftmost_sup_family = null;
    this.rightmost_sup_family = null;
}
function update_order_pointers_sub(node) {
    node.leftmost_sub = get_leftmost(node.children, function(n) {
            return n.leftmost_sub.order_fuzzy_index; }, node);
    node.rightmost_sub = get_rightmost(node.children, function(n) {
            return n.rightmost_sub.order_fuzzy_index; }, node);
    for(var i = 0; i < node.parents.length; i++) {
        update_order_pointers_sub(node.parents[i]);
    }
}
function update_order_pointers_sup(node) {
    node.leftmost_sup = get_leftmost(node.children, function(n) {
            return n.leftmost_sup.order_fuzzy_index; }, node);
    node.rightmost_sup = get_rightmost(node.children, function(n) {
            return n.rightmost_sup.order_fuzzy_index; }, node);
    for(var i = 0; i < node.children.length; i++) {
        update_order_pointers_sub(node.children[i]);
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

    // order pointers
    this.leftmost = null;
    this.rightmost = null;
    this.leftmost_sub = null;
    this.rightmost_sub = null;
    this.leftmost_sup = null;
    this.rightmost_sup = null;
    this.left_parent = null;
    this.right_parent = null;

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
    this.get_any = function() {
        alert("Deprecated?");
        if(this.parents.length > 0)
            return this.parents[0];
        if(this.children.length > 0)
            return this.children[0];
        return null;
    };

    this.x = this.get_preferred_x();
    this.y = this.get_preferred_y();
    this.real_y = this.y;
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
            if(reference !== null) {
                node.x = reference.x;
                node.y = reference.y;
                node.real_y = reference.real_y;
            }

            this.nodes.push(node);
            this.node_dict[node.xref] = node;
            var neighbors = node.get_relation_xrefs();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(this.relation_dict[nxref], node, type);
            }
//            this.node_order.push(node);
            var order_i = 0;
            if(reference) {
                var linktype = find_link_type(node, reference);
                if(linktype == "child") {
                    if(node.siblings.length > 0) {
                        order_i = this.node_order.indexOf(_.last(node.siblings).rightmost_subnode) + 1;
                        node.order_reason = "right of siblings " + _.last(node.siblings).xref +
                                " -> " + _.last(node.siblings).rightmost_subnode.xref;
                    } else if(node.parents.length > 0) {
                        order_i = this.node_order.indexOf(node.get_rightmost_parent()) + 1;
                        node.order_reason = "right of parents " + node.get_rightmost_parent().xref;
//                        order_i = this.node_order.indexOf(node.parents[0].rightmost_subnode) + 1;
//                        node.order_reason = "right of family " + node.parents[0] + " -> " +
//                                node.parents[0].rightmost_subnode.xref;
                    }
                } else if(node.spouses.length > 0) {
/*                    console.warn("adding "+node.xref+", "+node.data.sub_families.length + ", " +
                            node.spouses[0].data.sub_families.length + ", " +
                            node.spouses[0].spouses.length + " -- " + node.name);*/
/*                    if(node.data.sub_families.length == 1 &&
                                node.spouses[0].data.sub_families.length > 1 &&
                                node.spouses[0].spouses.length == 2) {
                        order_i = this.node_order.indexOf(node.spouses[0]);
                        node.order_reason = "left of familyswapper " + node.spouses[0].xref;
                    } else {*/
                        order_i = this.node_order.indexOf(node.spouses[0]) + 1;
                        node.order_reason = "right of spouse " + node.spouses[0].xref;
//                    }
                } else if(node.children.length > 0) {
                    order_i = this.node_order.indexOf(node.children[0]);
                    node.order_reason = "left of children " + node.children[0].xref;
                } else {
                    throw new Error("Eh?");
                }
            }
            if(this.node_order.length == 0) {
                node.order_fuzzy_index = 0.0;
            } else if(order_i == 0) {
                node.order_fuzzy_index = this.node_order[0].order_fuzzy_index - 1.0;
            } else if(order_i == this.node_order.length -1) {
                node.order_fuzzy_index = _.last(this.node_order).order_fuzzy_index + 1.0;
            } else {
//                node.order_fuzzy_index = (this.node_order[order_i - 1].order_fuzzy_index +
//                        this.node_order[order_i].order_fuzzy_index) / 2.0;
            }
            this.node_order.splice(order_i, 0, node);
            update_descendant_year(node, null);
            update_rightmost_child(node);
            update_rightmost_spouse(node);
            update_rightmost_subnode(node);
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
            if(reference !== null) {
                relation.x = reference.x;
                relation.y = reference.y;
                relation.real_y = reference.real_y;
            }
            this.relations.push(relation);
            this.relation_dict[relation.xref] = relation;
            var neighbors = relation.get_node_xrefs();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(relation, this.node_dict[nxref], type);
            }
            if(this.auto_expand_relations) {
                relation.expand_surroundings();
            }
        }
    },
    // links between nodes and relations
    links: [],
    link_dict: {},
    add_link: function(relation, node, type) {
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
//                Hiski.calc_layout();
//                render();
            } else {
                throw new Error("Loading data '"+xref+"' failed");
            }
        });
    },
    delay_running: false,
    delayed_render: function() {
        var timed = function() {
            Hiski.delay_running = false;
            enter();
            Hiski.calc_layout();
            render();
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
        render();
    },
    calc_layout: function() {
        var guess_node_year = function(node) {
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
//        var arr = traverse_nodes(this.node_order);
        var arr = this.node_order;
        for(var i = 0; i < arr.length; i++) {
            arr[i].visited = false;
        }
        for(var i = 0; i < arr.length; i++) {
            var node = arr[i];
            var pos = node_preferred_position(node);
            node.y = pos[1];
            node.real_y = pos[1];
            var maxx = 0;
            var year = guess_node_year(node);
            var endyear = node.last_open_descendant_year + pad_years;
            for(var j = Math.max(0, year - pad_years); j < endyear && j < years_x.length; j++) {
                maxx = Math.max(maxx, years_x[j]);
            }
            node.x = maxx + pad;
            if(node.parents.length > 0 && node.get_leftmost_parent().visited)
                node.x = Math.max(node.x, node.get_leftmost_parent().x);
            for(var j = Math.max(0, year - pad_years); j < endyear && j < years_x.length; j++) {
                if(j < year + pad_years)
                    years_x[j] = node.x;
                else
                    years_x[j] = node.x - pad;
            }
            if(Hiski.layout_mode == 1)
                node.x = i*60+60;
            if(node.parents.length > 0 && !node.get_leftmost_parent().visited) {
                // This really happens at some point when I have hundreds of nodes opened.
                // Might be related to cycles? maybe? not entirely sure.
                // Need some fake data with simpler cycles.
                // Another weirdness are the nodes that still are not getting x coordinate properly.
                console.warn("The node order is not clean anymore. There is some child before its parent. This is a bug and related to cycles (cycle2.ged).");
            }
            node.visited = true;
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
            relation.real_y = pos[1];
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

function d3_init() {
    zoom = d3.behavior.zoom()
            .scaleExtent([0.1, 10])
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

function enter() {
    Hiski.linksvg = Hiski.linksvg
            .data(Hiski.links)
            ;
    var newlinks = Hiski.linksvg.enter()
            .append("path")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .attr("stroke", "#000")
                .classed("link", true)
                .attr("d", function(d) {
                        return line_function(d.get_path_points())
                    })
            ;

    Hiski.nodesvg = Hiski.nodesvg
            .data(Hiski.nodes)
            ;
    var newnodes = Hiski.nodesvg.enter()
            .append("g")
                .classed("node", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+") scale(0.01)"})
            ;
    newnodes.append("circle")
            .attr("r", 20)
            .style("fill", Hiski.node_color_function)
            .on("click", function(d) { d.expand_surroundings(); })
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", -10)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.name;
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "bold")
            .style("font-size", "60%")
            .on("click", function(d) { d.expand_surroundings(); })
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
            .on("click", function(d) { d.expand_surroundings(); })
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
            .on("click", function(d) { d.expand_surroundings(); })
            ;


    Hiski.relationsvg = Hiski.relationsvg
            .data(Hiski.relations)
            ;
    var newrelations = Hiski.relationsvg.enter()
            .append("g")
                .classed("relation", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+") scale(0.01)"})
            ;
    newrelations.append("circle")
            .attr("r", 5)
            .on("click", function(d) { d.expand_surroundings(); })
            ;
}
function render() {
    var duration = 2200;

    Hiski.linksvg
            .transition()
            .duration(duration)
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            ;

    Hiski.nodesvg
            .transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    Hiski.nodesvg.selectAll("circle")
            .style("fill", Hiski.node_color_function)
            ;

    Hiski.relationsvg
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
    d3_init();
    map_init();
    render();
//    Hiski.load("@I01@", null);
//    Hiski.load("@I2131@", null);
//    Hiski.load("@I1307@", null);
    Hiski.load(null, null);
});
