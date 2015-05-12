
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

    this.get_relations = function() {
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
        var arr = this.get_relations();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
}

function Relation(data) {
    this.type = "relation";
    this.data = data;
    this.xref = data.xref;

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
        var arr = this.get_nodes();
        for(var i = 0; i < arr.length; i++) {
            var xref = arr[i][0];
            var type = arr[i][1];
            if(xref in Hiski.node_dict) {
                if(type == "child") {
                    sumchildren += Hiski.node_dict[xref].get_x();
                    numchildren += 1;
                } else {
                    sumspouse += Hiski.node_dict[xref].get_x();
                    numspouse += 1;
                }
            }
        }
        if(numspouse == 0 && numchildren == 0)
            return this.x;
        if(numspouse == 0) {
            var avgchildren = sumchildren / numchildren;
            return avgchildren;
        } else if(numchildren == 0) {
            var avgspouse = sumspouse / numspouse;
            return avgspouse;
        }
        var avgchildren = sumchildren / numchildren;
        var avgspouse = sumspouse / numspouse;
        return (avgchildren + avgspouse) / 2;
    };
    this.get_preferred_y = function() {
        var arr = this.get_nodes();
        var minchild = null;
        var maxspouse = null;
        for(var i = 0; i < arr.length; i++) {
            var xref = arr[i][0];
            var type = arr[i][1];
            if(xref in Hiski.node_dict) {
                var val = Hiski.node_dict[xref].get_y();
                if(type == "child") {
                    if(minchild === null)
                        minchild = val;
                    else
                        minchild = Math.min(minchild, val);
                } else {
                    if(maxspouse === null)
                        maxspouse = val;
                    else
                        maxspouse = Math.max(maxspouse, val);
                }
            }
        }
        if(minchild === null && maxspouse === null)
            return this.y;
        if(maxspouse === null) {
            return minchild - 40;
        } else if(minchild === null) {
            return maxspouse + 40;
        }
        return (minchild + maxspouse) / 2;
    };

    this.get_nodes = function() {
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
    this.get_children_xref = function() {
        var res = [];
        for(var i = 0; i < this.data.children.length; i++) {
            var obj = this.data.children[i];
            if(obj.tag == "CHIL") {
                res.push(obj.value);
            }
        }
        return res;
    };
    this.get_children = function() {
        var res = [];
        var arr = this.get_children_xref();
        for(var i = 0; i < arr.length; i++) {
            var xref = arr[i];
            if(xref in Hiski.node_dict)
                res.push(Hiski.node_dict[xref]);
            else
                res.push(null);
        }
        return res;
    };
    this.get_husband_xref = function() {
        for(var i = 0; i < this.data.children.length; i++) {
            var obj = this.data.children[i];
            if(obj.tag == "HUSB")
                return obj.value;
        }
        return null;
    };
    this.get_husband = function() {
        var xref = this.get_husband_xref();
        return xref in Hiski.node_dict ? Hiski.node_dict[xref] : null;
    };
    this.get_wife_xref = function() {
        for(var i = 0; i < this.data.children.length; i++) {
            var obj = this.data.children[i];
            if(obj.tag == "WIFE")
                return obj.value;
        }
        return null;
    };
    this.get_wife = function() {
        var xref = this.get_wife_xref();
        return xref in Hiski.node_dict ? Hiski.node_dict[xref] : null;
    };
    this.expand_surroundings = function() {
        var arr = this.get_nodes();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
    this.get_any = function() {
        var husband = this.get_husband();
        if(husband)
            return husband;
        var wife = this.get_wife();
        if(wife)
            return wife;
        var arr = this.get_children();
        for(var i = 0; i < arr.length; i++)
            if(arr[i])
                return arr[i];
        return null;
    };

    this.x = this.get_preferred_x();
    this.y = this.get_preferred_y();
    this.real_y = this.y;

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
        if(this.type == "child") {
            points.push([0,relation_size + pad]);
            points.push([0,relation_size + pad + straight]);
            points.push([xdiff, ydiff - node_size - pad - straight]);
            points.push([xdiff, ydiff - node_size - pad]);
        } else {
            points.push([0,-relation_size - pad]);
            points.push([0,-relation_size - pad - straight]);
            points.push([xdiff, ydiff + node_size + pad + straight]);
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
    add_node: function(node, reference) {
        if(node.xref in this.node_dict) {
            // update existing?
        } else {
            var nodeobj = new Node(node);

            var anyone_i = 0;
            if(reference) {
                var anyone = reference.get_any();
                console.warn(anyone);
                anyone_i = this.node_order.indexOf(anyone);
            }
            console.warn(anyone_i);
            this.node_order.splice(anyone_i+1, 0, nodeobj);

            this.nodes.push(nodeobj);
            this.node_dict[nodeobj.xref] = nodeobj;
            this.forcenodes.push(nodeobj);
            var neighbors = nodeobj.get_relations();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(this.relation_dict[nxref], nodeobj, type);
            }
//            this.node_order.push(nodeobj);
        }
    },
    // relations / families
    relations: [],
    relation_dict: {},
    add_relation: function(relation) {
        if(relation.xref in this.relation_dict) {
            // update existing?
        } else {
            var relationobj = new Relation(relation);
            this.relations.push(relationobj);
            this.relation_dict[relationobj.xref] = relationobj;
            this.forcenodes.push(relationobj);
            var neighbors = relationobj.get_nodes();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(relationobj, this.node_dict[nxref], type);
            }
        }
    },
    // links between nodes and relations
    links: [],
    link_dict: {},
    add_link: function(relationobj, nodeobj, type) {
        if(!relationobj || !nodeobj)
            return;
        var linkid = create_link_id(relationobj, nodeobj);
        if(linkid in this.link_dict) {
            // update existing or ignore?
        } else {
            linkobj = new Link(relationobj, nodeobj, type);
            this.links.push(linkobj);
            this.link_dict[linkobj.id] = linkobj;
            this.forcelinks.push({source: relationobj, target: nodeobj});
        }
    },
    // other
    add_entry: function(entry, reference) {
        if(entry.tag == "FAM") {
            this.add_relation(entry);
        } else if(entry.tag == "INDI") {
            this.add_node(entry, reference);
        } else {
            console.warn("Unhandled tag '"+entry.tag+"'");
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
                console.warn("Loading data '"+xref+"' failed");
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
    console.warn(zoom.scale());
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
