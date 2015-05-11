
//i18n.init(function(t) {});

app = angular.module("HiskiVisualizer", ["pascalprecht.translate"]);
app.controller("TopMenuController", function($scope, $translate) {
        var topMenu = this;
        topMenu.blue = function() {
            $(".main").css("background-color", "#ccccff");
        };
        topMenu.set_language = function(lang) {
            $translate.use(lang);
        };
    });
app.config(function($translateProvider) {
    for(key in translations) {
        $translateProvider.translations(key, translations[key]);
        console.warn(key + " added?");
    }
    $translateProvider.preferredLanguage("en");
    // no sanitation strategy, because we should be in full control of all data
    $translateProvider.useSanitizeValueStrategy(null);
//    $translateProvider.useCookieStorage();
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
    this.y = 0;//(this.get_field_obj("BIRT.DATE").year - 1750)*3 - 100;
    this.y = (this.get_field_obj("BIRT.DATE").year - 1750)*3 - 200;
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
            Hiski.load(value);
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
                    sumchildren += Hiski.node_dict[xref].get_y();
                    numchildren += 1;
                } else {
                    sumspouse += Hiski.node_dict[xref].get_y();
                    numspouse += 1;
                }
            }
        }
        if(numspouse == 0 && numchildren == 0)
            return this.y;
        if(numspouse == 0) {
            var avgchildren = sumchildren / numchildren;
            return avgchildren - 40;
        } else if(numchildren == 0) {
            var avgspouse = sumspouse / numspouse;
            return avgspouse + 40;
        }
        var avgchildren = sumchildren / numchildren;
        var avgspouse = sumspouse / numspouse;
        return (avgchildren + avgspouse) / 2;
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
            Hiski.load(value);
        }
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
    add_node: function(node) {
        if(node.xref in this.node_dict) {
            // update existing?
        } else {
            var nodeobj = new Node(node);
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
            // for force layout
/*            var newindex = _.indexOf(this.nodes, nodeobj);
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                if(!(nxref in this.relation_dict))
                    continue;
                var arr = this.relation_dict[nxref].get_nodes();
                for(var j = 0; j < arr.length; j++) {
                    var nn = arr[j];
                    var otherxref = nn[0];
                    if(!(otherxref in this.node_dict))
                        continue;
                    var othernodeobj = this.node_dict[otherxref];
                    var otherindex = _.indexOf(this.nodes, othernodeobj);
                    this.force_links.push({"source": nodeobj, "target": othernodeobj});
                }
            }*/
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
    // force layout stuff
    forcenodes: [],
    forcelinks: [],
/*    force_links: [],
    layout: null,*/
    // other
    add_entry: function(entry) {
        if(entry.tag == "FAM") {
            this.add_relation(entry);
        } else if(entry.tag == "INDI") {
            this.add_node(entry);
        } else {
            console.warn("Unhandled tag '"+entry.tag+"'");
        }
    },
    load: function(xref) {
        if(xref in this.node_dict)
            return;
        if(xref in this.relation_dict)
            return;
        d3.json(this.url_root + "json/load/"+xref+"/", function(json) {
            if(json) {
                Hiski.add_entry(json.entry);
                Hiski.calc_layout();
                render();
            } else {
                console.warn("Loading data '"+xref+"' failed");
            }
        });
    },

    calc_layout: function() {
        return;
        node_preferred_position = function(node) {
            var x = node.x;
            var y = (node.get_field_obj("BIRT.DATE").year - 1750)*3 - 200;
            return [x, y];
        };
        relation_preferred_position = function(relation) {
            var x = relation.get_preferred_x();
            var y = relation.get_preferred_y();
            return [x, y];
        };
        for(var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            var pos = node_preferred_position(node);
            node.x = pos[0];
            node.y = pos[1];
            node.real_y = pos[1];
        }
        for(var i = 0; i < this.relations.length; i++) {
            var relation = this.relations[i];
            var pos = relation_preferred_position(relation);
            relation.x = pos[0];
            relation.y = pos[1];
            relation.real_y = pos[1];
        }
/*        var node_distance = 80;
        for(var i = 0; i < this.relations.length; i++) {
            var relation = this.relations[i];
            var husband = relation.get_husband();
            var wife = relation.get_wife();
            if(husband && wife) {
//                if(Math.abs(husband.x - wife.x) < node_distance) {
//                    var avg = (husband.x + wife.x) / 2;
                    var avg = relation.get_x();
                    if(husband.x < wife.x) {
                        husband.x = avg - node_distance / 2;
                        wife.x = avg + node_distance / 2;
                    } else {
                        husband.x = avg - node_distance / 2;
                        wife.x = avg + node_distance / 2;
                    }
//                }
            }
            var children = relation.get_children();
            for(var j = 0; j < children.length; j++) {
                var child = children[j];
                if(!child)
                    continue;
                child.x = relation.get_x() + node_distance * (j - children.length/2.0);
            }
        }*/
        for(var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            node.x = 800.0 / (this.nodes.length + 1) * (i + 1);
        }
    },
};


function d3_init() {
    svg = d3.select("svg#tree");
    var layers = ["debug", "links", "nodes", "relations"];
    svg.selectAll("g.layer")
            .data(layers)
            .enter()
            .append("g")
            .attr("class", function(d) { return d; })
            .classed("layer", true)
            ;
    Hiski.linksvg = svg.selectAll("g.layer.links").selectAll("g.link");
    Hiski.nodesvg = svg.selectAll("g.layer.nodes").selectAll("g.node");
    Hiski.relationsvg = svg.selectAll("g.layer.relations").selectAll("g.relation");

//    Hiski.forcenodes = [];
//    Hiski.forcelinks = [];
    Hiski.forcenodesvg = svg.selectAll("g.layer.debug").selectAll(".forcenode");
    Hiski.forcelinksvg = svg.selectAll("g.layer.debug").selectAll(".forcelink");

    Hiski.layout = d3.layout.force()
            .nodes(Hiski.forcenodes)
            .links(Hiski.forcelinks)
            .charge(function(d) {
                    return d.type == "relation" ? 1800 : -1800;
                })
            .chargeDistance(60)
            .linkDistance(2)
            .friction(0.8)
            .gravity(0.02)
            .linkStrength(0.01)
            .size([800,600])
            .on("tick", forcetick)
            ;
/*    setTimeout(function() {
        var gety = function() { return this.forcey; };
        var a = {id: "aa", x:200, y:200, forcey:200, get_y:gety},
            b = {id: "bb", x:300, y:300, forcey:210, get_y:gety},
            c = {id: "cc", x:200, y:300, forcey:220, get_y:gety};
        Hiski.forcenodes.push(a, b, c);
        Hiski.forcelinks.push({source:a, target:b}, {source:a, target:c});
        forcestart();
    }, 1000);*/
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


    forcestart();
}
function forcestart() {
    Hiski.forcelinksvg = Hiski.forcelinksvg
            .data(Hiski.layout.links(), function(d) { return d.source.xref + "-" + d.target.xref; })
            ;
    Hiski.forcelinksvg.enter()
            .insert("line", ".forcenode")
                .attr("class", "forcelink")
                .attr("stroke", "#000")
            ;
    Hiski.forcelinksvg.exit()
            .remove()
            ;

    Hiski.forcenodesvg = Hiski.forcenodesvg
            .data(Hiski.layout.nodes(), function(d) { return d.xref; })
            ;
    Hiski.forcenodesvg.enter()
            .append("circle")
                .attr("class", function(d) { return ".forcenode " + d.xref; })
                .attr("r", 8)
//                .attr("cx", function(d) { return d.x; })
                .attr("cx", function(d) { return d.x > 0 && d.x < 800 ? d.x : 10; })
                .attr("cy", function(d) { return d.y > 0 && d.y < 800 ? d.y : 10; })
            ;
    Hiski.forcenodesvg.exit()
            .remove()
            ;

    Hiski.layout.start();
}
function forcetick() {
    Hiski.forcenodesvg
            .attr("cx", function(d) { return d.x > 0 && d.x < 800 ? d.x : 10; })
            .attr("cy", function(d) {
                    d.y = d.get_y();
                    if(d.type == "relation")
                        d.y = d.get_preferred_y();
                    return d.y > 0 && d.y < 800 ? d.y : 10;
                })
            ;
    Hiski.forcelinksvg
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; })
            ;
    Hiski.nodesvg
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    Hiski.relationsvg
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    Hiski.linksvg
            .attr("transform", function(d) {
                    var x = d.relation.get_x();
                    var y = d.relation.get_y();
                    return "translate("+x+","+y+")";
                })
            ;
    Hiski.linksvg.selectAll("path")
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            ;
}

$(document).ready(function() {
    //infoviz_init();
    d3_init();
    render();
    Hiski.load("@I01@");
});
