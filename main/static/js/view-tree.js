
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

function locate_node_on_all(node) {
    for(var i = 0; i < item_views.length; i++) {
        if(item_views[i].mode != "tree")
            continue;
        locate_node(item_views[i], node, true);
    }
}
function locate_node(item_view, node, check_offset) {
    var elem = $("#"+item_view.tree_id);
    var width = elem.width();
    var height = elem.height();
    var x = -node.x * item_view.zoom.scale() + width / 2;
    var y = -node.y * item_view.zoom.scale() + height / 2;
    var pos = item_view.zoom.translate();
    var offset = Math.max(Math.abs((x - pos[0])*2 / width), Math.abs((y - pos[1])*2 / height));
    // if the node is within this ratio from the center of the view, do not
    // move the view. 0.0 means always move and 1.0 means move only if outside
    // of the view.
    var offset_limit = 0.0;
    if(offset < offset_limit && check_offset) {
        return;
    }
    item_view.zoom.translate([x, y]);
    item_view.container
            .transition()
            .duration(1200)
            .attr("transform", "translate("+item_view.zoom.translate()+")scale("+item_view.zoom.scale()+")");
}
function tree_init(item_view) {
    item_view.container = null;
    var zoomfun = function() {
        item_view.container
                .attr("transform", "translate("+d3.event.translate+")scale("+d3.event.scale+")");
    }
    item_view.zoom = d3.behavior.zoom()
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
            .call(item_view.zoom)
            ;
    var background = item_view.tree_drawable.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("fill", "#ccddcc")
            .style("pointer-events", "all")
            ;
    item_view.container = item_view.tree_drawable.append("g")
            .classed("container", true)
            ;
    var layers = ["debug", "links", "nodes", "relations"];
    item_view.container.selectAll("g.layer")
            .data(layers)
            .enter()
            .append("g")
            .attr("class", function(d) { return d; })
            .classed("layer", true)
            ;
    item_view.linksvg = item_view.container.selectAll("g.layer.links").selectAll("path.link");
    item_view.nodesvg = item_view.container.selectAll("g.layer.nodes").selectAll("g.node");
    item_view.relationsvg = item_view.container.selectAll("g.layer.relations").selectAll("g.relation");

    var maxyear = 2020;
    item_view.axis = d3.svg.axis()
            .scale(d3.scale.linear()
                    .domain([0, maxyear])
                    .range([0, maxyear * Hiski.year_pixel_ratio]))
                    .ticks(maxyear / 10)
            .orient("left")
            .tickFormat(d3.format("d"))
            ;
    item_view.axis_group = item_view.container.append("g").call(item_view.axis);
}

function enter_all() {
    for(var i = 0; i < item_views.length; i++) {
        if(item_views[i].mode != "tree")
            continue;
        if(item_views[i].tree_ready)
            enter(item_views[i]);
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
                    Hiski.select_node(d, true);
                    d.expand_surroundings();
                })
            ;
    var dropshadow = "url(\"#"+view.tree_id+"-dropshadow\")";
    newnodes.append("circle")
            .attr("r", 25)
            .style("fill", Hiski.node_color_function)
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", -18)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.first_name;
            })
            .style("filter", dropshadow)
            .style("font-weight", "bold")
            .style("font-size", "60%")
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", -5)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.family_name;
            })
            .style("filter", dropshadow)
            .style("font-weight", "bold")
            .style("font-size", "60%")
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 10)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.data.birth_date_string;
            })
            .style("filter", dropshadow)
            .style("font-weight", "normal")
            .style("font-size", "50%")
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 20)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.data.death_date_string;
            })
            .style("filter", dropshadow)
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
    if(Hiski.map) {
        update_map();
    }
    Hiski.lastselected = Hiski.selected;
}
function render(view) {
    var duration = 2200;
    var short_duration = 300;

    view.linksvg
            .transition()
            .duration(duration)
            .attr("d", function(d) {
                    return line_function(d.get_path_points())
                })
            .style("visibility", function(d) { return d.is_visible() ? "visible" : "hidden" })
            ;
    view.linksvg
            .style("stroke", function(d) {
                    return d.node == Hiski.selected ? "#ffffff" : d.get_color();
                })
            .style("stroke-width", function(d) {
                    return d.node == Hiski.selected ? 4 : 2;
                })
            ;
    var move_to_front = function(elem) {
        elem.parentNode.appendChild(elem);
    }
    view.linksvg.each(function(d) {
        if(d.node == Hiski.selected)
            move_to_front(this);
    })

    view.nodesvg
            .transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            .style("visibility", function(d) { return d.is_visible() ? "visible" : "hidden" })
            ;
    view.nodesvg.selectAll("circle")
//            .transition()
//            .duration(short_duration)
            .style("fill", Hiski.node_color_function)
            .style("stroke", function(d) { return d == Hiski.selected ? "#ffffff" : "#000000" })
            .style("stroke-width", function(d) { return d == Hiski.selected ? 3 : 1 })
            ;
    view.nodesvg.each(function(d) {
        if(d == Hiski.selected)
            move_to_front(this);
    })

    var next_to_selected = function(d) {
        if(Hiski.selected === null)
            return false;
        for(var i = 0; i < Hiski.selected.relations.length; i++) {
            if(Hiski.selected.relations[i] == d)
                return true;
        }
        return false;
    }
    if(Hiski.lastselected != Hiski.selected) {
        view.relationsvg.selectAll("circle")
                .style("stroke", "#ffffff")
                .style("fill", "#000000")
                ;
    }
    view.relationsvg.selectAll("circle")
            .attr("r", 5)
            ;
    view.relationsvg
            .transition()
            // shorter duration here makes no sense, but the desync makes no sense either
            .duration(duration)
            .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+")"})
            .style("visibility", function(d) { return d.is_visible() ? "visible" : "hidden" })
            .selectAll("circle")
//            .transition()
//            .duration(short_duration)
            ;
    view.relationsvg.selectAll("circle")
            .style("fill", function(d) { return next_to_selected(d) ? "#ffffff" : "#000000" })
            .style("stroke", function(d) { return next_to_selected(d) ? "#000000" : "#ffffff" })
//            .attr("r", function(d) { return next_to_selected(d) ? 8 : 5 })
            ;
}

