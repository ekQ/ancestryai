
app = angular.module("HiskiVisualizer", ["pascalprecht.translate"]);
app.controller("TopMenuController", function($scope, $translate) {
        var menu = this;
        menu.blue = function() {
            $(".main").css("background-color", "#ccccff");
        };
        menu.set_color = function(color) {
            $(".topmenu").css("background-color", color);
        };
        menu.set_language = function(lang) {
            $translate.use(lang);
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


function get_field_obj(field) {
    var subs = field.split(".");
    var data = this.data;
    for(var si = 0; si < subs.length; si++) {
        var sval = subs[si];
        var ok = false;
        for(var i = 0; i < data.children.length; i++) {
            var obj = data.children[i];
            if(obj.tag == sval) {
                data = obj;
                ok = true;
                break;
            }
        }
        if(!ok)
            return null;
    }
    return data;
}
function get_field(field) {
    var data = this.get_field_obj(field);
    if(data)
        return data.value;
    return null;
}

function Node(data) {
    this.type = "node";
    this.data = data;
    this.xref = data.xref;

    this.relations = [];
    this.parents = [];
    this.spouses = [];
    this.children = [];
    this.siblings = [];

    this.rightmost_subnode = this;

    this.get_field = get_field;
    this.get_field_obj = get_field_obj;

    this.x = _.random(0, 400) + 200;
    this.y = 0;//(this.get_field_obj("BIRT.DATE").year - 1750)*4 - 100;
    this.y = (this.get_field_obj("BIRT.DATE").year - 1750)*4 - 600;
    this.year = this.get_field_obj("BIRT.DATE").year;
    this.name = this.get_field("NAME");
    this.real_y = this.y;

    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.real_y;
    };

    this.get_relation_xrefs = function() {
        res = [];
        for(var i = 0; i < this.data.children.length; i++) {
            var obj = this.data.children[i];
            if(obj.tag == "FAMC") {
                res.push([obj.value, "child"]);
            } else if(obj.tag == "FAMS") {
                res.push([obj.value, "spouse"]);
            }
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
}

function link_node_to(node, relation, type) {
    if(type == "child") {
        if(relation.wife !== null) {
            node.parents.push(relation.wife);
            relation.wife.children.push(node);
        }
        if(relation.husband !== null) {
            node.parents.push(relation.husband);
            relation.husband.children.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.siblings.push(relation.children[i]);
            relation.children[i].siblings.push(node);
        }
        relation.children.push(node);
    } else if(type == "wife") {
        if(relation.husband !== null) {
            node.spouses.push(relation.husband);
            relation.husband.spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.wife = node;
        relation.parents.push(node);
    } else if(type == "husband") {
        if(relation.wife !== null) {
            node.spouses.push(relation.wife);
            relation.wife.spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.husband = node;
        relation.parents.push(node);
    }
    relation.nodes.push(node);
    node.relations.push(relation);
}
function find_link_type(node, relation) {
    for(var i = 0; i < relation.data.children.length; i++) {
        var obj = relation.data.children[i];
        if(obj.value == node.xref) {
            if(obj.tag == "HUSB")
                return "husband";
            if(obj.tag == "WIFE")
                return "wife";
            if(obj.tag == "CHIL")
                return "child";
        }
    }
    throw new Error("No node '"+obj.xref+"' in relation '"+relation.xref+"'");
}
function update_rightmost_subnode(node) {
    if(node.children.length > 0) {
        node.rightmost_subnode = _.last(node.children).rightmost_subnode;
    }
    for(var i = 0; i < node.parents.length; i++) {
        update_rightmost_subnode(node.parents[i]);
    }
}

function Relation(data) {
    this.type = "relation";
    this.data = data;
    this.xref = data.xref;

    this.nodes = [];
    this.children = [];
    this.parents = [];
    this.wife = null;
    this.husband = null;

    this.get_field = get_field;
    this.get_field_obj = get_field_obj;

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
            return minchild - 40;
        } else if(minchild === null) {
            return maxspouse + 40;
        }
        this.y_space = (minchild - maxspouse) / 2;
        return (minchild + maxspouse) / 2;
    };

    this.get_node_xrefs = function() {
        var res = [];
        for(var i = 0; i < this.data.children.length; i++) {
            var obj = this.data.children[i];
            if(obj.tag == "CHIL") {
                res.push([obj.value, "child"]);
            } else if(obj.tag == "HUSB") {
                res.push([obj.value, "husband"]);
            } else if(obj.tag == "WIFE") {
                res.push([obj.value, "wife"]);
            }
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
        if(this.husband !== null)
            return this.husband;
        if(this.wife !== null)
            return this.wife;
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
        var xdiff = this.node.get_x() - this.relation.get_x();
        var ydiff = this.node.get_y() - this.relation.get_y();
        var node_size = 20;
        var relation_size = 5;
        var pad = 0;
        var straight = 4;
        var y_space = this.relation.y_space - node_size - relation_size - straight*2 - pad*2;
        if(this.type == "child") {
            points.push([0,     relation_size + pad]);
            points.push([0,     relation_size + pad + straight]);
            points.push([xdiff, relation_size + y_space]);
            points.push([xdiff, ydiff - node_size - pad]);
        } else {
            points.push([0,     -relation_size - pad]);
            points.push([0,     -relation_size - pad - straight]);
            points.push([xdiff, -relation_size - y_space]);
            points.push([xdiff, ydiff + node_size + pad]);
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
                    if(node.parents.length > 0) {
                        order_i = this.node_order.indexOf(node.parents[0].rightmost_subnode) + 1;
                    } else if(node.siblings.length > 0) {
                        order_i = this.node_order.indexOf(_.last(node.siblings).rightmost_subnode) + 1;
                    }
                } else if(node.spouses.length > 0) {
                    order_i = this.node_order.indexOf(node.spouses[0]) + 1;
                } else if(node.children.length > 0) {
                    order_i = this.node_order.indexOf(node.children[0]);
                } else {
                    throw new Error("Eh?");
                }
            }
            this.node_order.splice(order_i, 0, node);
            update_rightmost_subnode(node);
        }
    },
    // relations / families
    relations: [],
    relation_dict: {},
    add_relation: function(relation_data) {
        if(relation_data.xref in this.relation_dict) {
            // update existing?
        } else {
            var relation = new Relation(relation_data);
            this.relations.push(relation);
            this.relation_dict[relation.xref] = relation;
            var neighbors = relation.get_node_xrefs();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(relation, this.node_dict[nxref], type);
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
            this.add_relation(entry);
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
        d3.json(this.url_root + "json/load/"+xref+"/", function(json) {
            if(json) {
                Hiski.add_entry(json.entry, reference);
                Hiski.calc_layout();
                render();
            } else {
                throw new Error("Loading data '"+xref+"' failed");
            }
        });
    },

    // custom layout stuff
    node_order: [],
    calc_layout: function() {
        var node_preferred_position = function(node) {
            var x = node.x;
            var y = (node.get_field_obj("BIRT.DATE").year - 1750)*4 - 600;
            return [x, y];
        };
        var relation_preferred_position = function(relation) {
            var x = relation.get_preferred_x();
            var y = relation.get_preferred_y();
            return [x, y];
        };
        var x = 100;
        var pad = 80;
        var pad_years = 10;
        var years_x = [];
        for(var i = 0; i < 3000; i++) {
            years_x.push(x);
        }
        for(var i = 0; i < this.node_order.length; i++) {
            var node = this.node_order[i];
            var pos = node_preferred_position(node);
            node.y = pos[1];
            var maxx = 0;
            for(var j = node.year - pad_years; j < node.year + pad_years; j++) {
                maxx = Math.max(maxx, years_x[j]);
            }
            node.x = maxx + pad;
            for(var j = node.year - pad_years; j < node.year + pad_years; j++) {
                years_x[j] = node.x;
            }
            node.real_y = pos[1];
        }
        for(var i = 0; i < this.relations.length; i++) {
            var relation = this.relations[i];
            var pos = relation_preferred_position(relation);
            relation.x = pos[0];
            relation.y = pos[1];
            relation.real_y = pos[1];
        }
    },
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
    Hiski.linksvg = container.selectAll("g.layer.links").selectAll("g.link");
    Hiski.nodesvg = container.selectAll("g.layer.nodes").selectAll("g.node");
    Hiski.relationsvg = container.selectAll("g.layer.relations").selectAll("g.relation");
}

function render() {
    var duration = 2800;
    Hiski.linksvg = Hiski.linksvg
            .data(Hiski.links)
            ;
    Hiski.linksvg
//            .transition()
//            .duration(duration)
            .attr("transform", function(d) {
                    var x = d.relation.get_x();
                    var y = d.relation.get_y();
                    return "translate("+x+","+y+")";
                })
            ;
    var newlinks = Hiski.linksvg.enter()
            .append("g")
                .classed("link", true)
                .attr("transform", function(d) {
                        var x = d.relation.get_x();
                        var y = d.relation.get_y();
                        return "translate("+x+","+y+")";
                    })
            ;
    newlinks.append("path")
            .attr("stroke-width", 2)
            .attr("fill", "none")
            .attr("stroke", "#000")
            ;
    Hiski.linksvg.selectAll("path")
//            .transition()
//            .duration(duration)
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            ;


    Hiski.nodesvg = Hiski.nodesvg
            .data(Hiski.nodes)
            ;
    Hiski.nodesvg
//            .transition()
//            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    var newnodes = Hiski.nodesvg.enter()
            .append("g")
                .classed("node", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    newnodes.append("circle")
            .attr("r", 20)
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
                return d.get_field("BIRT.DATE");
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "normal")
            .style("font-size", "45%")
            .on("click", function(d) { d.expand_surroundings(); })
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 15)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.get_field("DEAT.DATE");
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "normal")
            .style("font-size", "45%")
            .on("click", function(d) { d.expand_surroundings(); })
            ;


    Hiski.relationsvg = Hiski.relationsvg
            .data(Hiski.relations)
            ;
    Hiski.relationsvg
//            .transition()
//            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    var newrelations = Hiski.relationsvg.enter()
            .append("g")
                .classed("relation", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    newrelations.append("circle")
            .attr("r", 5)
            .on("click", function(d) { d.expand_surroundings(); })
            ;


}

$(document).ready(function() {
    d3_init();
    render();
    Hiski.load("@I01@", null);
});
