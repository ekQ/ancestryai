
i18n.init(function(t) {});

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
    this.data = data;
    this.xref = data.xref;

    this.get_field = get_field;
    this.get_field_obj = get_field_obj;

    this.x = _.random(0, 400);
    this.y = (this.get_field_obj("BIRT.DATE").year - 1750)*3 - 400;
    this.name = this.get_field("NAME");

    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.y;
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
    this.data = data;
    this.xref = data.xref;

    this.get_field = get_field;
    this.get_field_obj = get_field_obj;

    this.x = _.random(0, 400);
    this.y = _.random(0, 400);

    this.get_x = function() {
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
    this.get_y = function() {
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
        res = [];
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
        var arr = this.get_nodes();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value);
        }
    };
}

function create_link_id(relation, node) {
    return relation.xref + node.xref;
}
function Link(relation, node, type) {
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
            var neighbors = nodeobj.get_relations();
            for(var i = 0; i < neighbors.length; i++) {
                var n = neighbors[i];
                var nxref = n[0];
                var type = n[1];
                this.add_link(this.relation_dict[nxref], nodeobj, type);
            }
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
        }
    },
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
                render();
            } else {
                console.warn("Loading data '"+xref+"' failed");
            }
        });
    },
};

angular.module("HiskiVisualizer", [])
    .controller("TopMenuController", function($scope) {
        var topMenu = this;
        topMenu.blue = function() {
            $(".main").css("background-color", "#ccccff");
        };
    });

function d3_init() {
    svg = d3.select("svg#tree");
    var layers = ["links", "nodes", "relations"];
    svg.selectAll("g.layer")
            .data(layers)
            .enter()
            .append("g")
            .attr("class", function(d) { return d; })
            .classed("layer", true)
            ;
}
function render() {
    svg = d3.select("svg#tree");
    var linklayer = svg.selectAll("g.layer.links");
    var links = linklayer.selectAll("g.link")
            .data(Hiski.links)
            .attr("transform", function(d) {
                    var x = d.relation.get_x();
                    var y = d.relation.get_y();
                    return "translate("+x+","+y+")";
                })
            ;
    var newlinks = links.enter()
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
    links.selectAll("path")
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            ;


    var nodelayer = svg.selectAll("g.layer.nodes");
    var nodes = nodelayer.selectAll("g.node")
            .data(Hiski.nodes)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    var newnodes = nodes.enter()
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
            .style("font-size", "80%")
            .on("click", function(d) { d.expand_surroundings(); })
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 10)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.get_field("BIRT.DATE");
            })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "normal")
            .style("font-size", "60%")
            .on("click", function(d) { d.expand_surroundings(); })
            ;


    var relationlayer = svg.selectAll("g.layer.relations");
    var relations = relationlayer.selectAll("g.relation")
            .data(Hiski.relations)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            ;
    var newrelations = relations.enter()
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
    //infoviz_init();
    d3_init();
    render();
    Hiski.load("@I01@");
});
