
i18n.init(function(t) {});

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
var line_function = d3.svg.line()
        .x(function(d) { return d[0]; })
        .y(function(d) { return d[1]; })
        .interpolate("basis")
        ;

function d3init() {
    svg = d3.select("svg#tree");
    var node_data = [
        {
            name: "Aaaaargh",
            id: 1,
            year: 20,
            x: 60,
        },
        {
            name: "Foooo",
            id: 2,
            year: 41,
            x: 130,
        },
        {
            name: "Bar",
            id: 3,
            year: 18,
            x: 140,
        }
    ];
    for(id in node_data) {
        var node = node_data[id];
        node.y = node.year * 4;
    }
    var node_dict = [];
    for(id in node_data) {
        var node = node_data[id];
        node_dict[node.id] = node;
    }
    var relation_data = [
        {
            id: 1,
            husband_id: 1,
            wife_id: 3,
            children_ids: [
                2,
            ],
        },
    ];
    for(id in relation_data) {
        var relation = relation_data[id];
        relation.husband = node_dict[relation.husband_id];
        relation.wife = node_dict[relation.wife_id];
        relation.children = [];
        for(cid in relation.children_ids) {
            child_id = relation.children_ids[cid];
            relation.children.push(node_dict[child_id]);
        }
        relation.x = (relation.husband.x + relation.wife.x) / 2.0;
        relation.y = (relation.husband.y + relation.wife.y) / 2.0 + 40;
    }
    var link_data = [];
    for(id in relation_data) {
        var relation = relation_data[id];
        link_data.push({
            relation: relation,
            node: relation.husband,
            type: "husband",
        });
        link_data.push({
            relation: relation,
            node: relation.wife,
            type: "wife",
        });
        for(cid in relation.children) {
            child = relation.children[cid];
            link_data.push({
                relation: relation,
                node: child,
                type: "child",
            });
        }
    }
    var nodes = svg.selectAll("g.node")
            .data(node_data)
            ;
    var newnodes = nodes.enter()
            .append("g")
            .classed("node", true)
            .attr("transform", function(d) { return "translate("+d.x+","+d.y+")"})
            ;
    newnodes.append("circle")
            .attr("r", 20)
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .text(function(d) { return d.name })
            .style("filter", "url(#dropshadow)")
            .style("font-weight", "bold")
            .style("font-size", "80%")
            ;

    var relations = svg.selectAll("g.relation")
            .data(relation_data)
            ;
    var newrelations = relations.enter()
            .append("g")
            .classed("relation", true)
            .attr("transform", function(d) { return "translate("+d.x+","+d.y+")"})
/*            .attr("transform", function(d) {
                    var x = (node_dict[d.husband].x + node_dict[d.wife].x) / 2;
                    var y = (node_dict[d.husband].year + node_dict[d.wife].year) * 4 / 2 + 40;
                    return "translate("+x+","+y+")";
                })*/
            ;
    newrelations.append("circle")
            .attr("r", 5)
            ;

    var links = svg.selectAll("g.link")
            .data(link_data)
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
            .attr("d", function(d) { return line_function(get_path_points(d)) })
            .attr("stroke", "#000")
            .attr("stroke-width", 2)
            .attr("fill", "none")
            ;
}

$(document).ready(function() {
    //infoviz_init();
    d3init();
});
