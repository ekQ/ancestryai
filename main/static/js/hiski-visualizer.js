
i18n.init(function(t) {});

function Node(data) {
    this.data = data;
    this.xref = data.xref;

    this.get = function(field) {
        for(var i in this.data.children) {
            var obj = this.data.children[i];
            if(obj.tag == field)
                return obj.value;
        }
        return null;
    };

    this.x = _.random(0, 400);
    this.y = _.random(0, 400);
    this.name = this.get("NAME");

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

    this.x = _.random(0, 400);
    this.y = _.random(0, 400);

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
        var xdiff = this.node.x - this.relation.x;
        var ydiff = this.node.y - this.relation.y;
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

function get_path_points(link) {
    var points = [];
    var xdiff = link.node.x - link.relation.x;
    var ydiff = link.node.y - link.relation.y;
    var node_size = 20;
    var relation_size = 5;
    var pad = 0;
    var straight = 4;
    if(link.type == "child") {
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

function render() {
    svg = d3.select("svg#tree");
    var nodes = svg.selectAll("g.node")
            .data(Hiski.nodes)
            ;
    var newnodes = nodes.enter()
            .append("g")
            .classed("node", true)
            .attr("transform", function(d) { return "translate("+d.x+","+d.y+")"})
            ;
    newnodes.append("circle")
            .attr("r", 20)
            .on("click", function(d) { d.expand_surroundings(); })
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text(function(d) { return d.name })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "bold")
            .style("font-size", "80%")
            .on("click", function(d) { d.expand_surroundings(); })
            ;

    var relations = svg.selectAll("g.relation")
            .data(Hiski.relations)
            ;
    var newrelations = relations.enter()
            .append("g")
            .classed("relation", true)
            .attr("transform", function(d) { return "translate("+d.x+","+d.y+")"})
            ;
    newrelations.append("circle")
            .attr("r", 5)
            .on("click", function(d) { d.expand_surroundings(); })
            ;

    var links = svg.selectAll("g.link")
            .data(Hiski.links)
            ;
    var newlinks = links.enter()
            .append("g")
            .classed("link", true)
            .attr("transform", function(d) {
                    var x = d.relation.x;
                    var y = d.relation.y;
                    return "translate("+x+","+y+")";
                })
            ;
    newlinks.append("path")
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            .attr("stroke", "#000")
            .attr("stroke-width", 2)
            .attr("fill", "none")
            ;
}

$(document).ready(function() {
    //infoviz_init();
    render();
    Hiski.load("@I01@");
});
