
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
            .attr("transform", "translate("+item_view.zoom.translate()+")scale("+item_view.zoom.scale()+")")
            ;
    reposition_axis(item_view, item_view.zoom.translate(), item_view.zoom.scale(), true);
}
function reposition_axis(item_view, translate, scale, is_animated) {
    var shift = -translate[0] / scale + 100 / scale;
    if(is_animated) {
        item_view.axis_group
                .transition()
                .duration(1200)
                .attr("transform", "translate("+shift+",0)")
                ;
    } else {
        item_view.axis_group
                .attr("transform", "translate("+shift+",0)")
                ;
    }
}
function tree_init(item_view) {
    item_view.container = null;
    var zoomfun = function() {
        item_view.container
                .attr("transform", "translate("+d3.event.translate+")scale("+d3.event.scale+")");
        reposition_axis(item_view, d3.event.translate, d3.event.scale, false);
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
                .style("cursor", "pointer")
                .on("click", function(d) {
                    Hiski.select_node(d, true);
                    d.expand_surroundings();
                })
            ;
    var dropshadow = "url(\"#"+view.tree_id+"-dropshadow\")";
    newnodes.append("svg:text")
            .attr("y", -7)
            .text(function(d) {
                return d.first_name;
            })
            .style("stroke", "#000000")
            .style("stroke-width", "8")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            ;
    newnodes.append("svg:text")
            .attr("y", 7)
            .text(function(d) {
                return d.family_name;
            })
            .style("stroke", "#000000")
            .style("stroke-width", "8")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            ;
    newnodes.append("circle")
            .attr("r", 25)
            .style("fill", Hiski.node_color_function)
            ;
    /*newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", -7)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.first_name;
            })
            .style("filter", dropshadow)
            .style("font-weight", "bold")
            .style("font-size", "70%")
            ;
    newnodes.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("y", 7)
            .attr("dominant-baseline", "central")
            .text(function(d) {
                return d.family_name;
            })
            .style("filter", dropshadow)
            .style("font-weight", "bold")
            .style("font-size", "70%")
            ;*/
    // create outlines
    newnodes.append("svg:text")
            .attr("y", -7)
            .text(function(d) {
                return d.first_name;
            })
            .style("stroke", "#ffffff")
            .style("stroke-width", "6")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            ;
    newnodes.append("svg:text")
            .attr("y", 7)
            .text(function(d) {
                return d.family_name;
            })
            .style("stroke", "#ffffff")
            .style("stroke-width", "6")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            ;
    //create actual texts
    newnodes.append("svg:text")
            .attr("y", -7)
            .text(function(d) {
                return d.first_name;
            })
            ;
    newnodes.append("svg:text")
            .attr("y", 7)
            .text(function(d) {
                return d.family_name;
            })
            ;
    newnodes.selectAll("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .style("font-weight", "bold")
            .style("font-size", "70%")
            ;
            /*
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
            */


    view.relationsvg = view.relationsvg
            .data(Hiski.relations)
            ;
    var newrelations = view.relationsvg.enter()
            .append("g")
                .classed("relation", true)
                .attr("transform", function(d) { return "translate("+d.get_x()+","+d.get_y()+") scale(0.01)"})
                .style("cursor", "pointer")
                .on("click", function(d) {
                    if(d.next_to_hidden()) {
                        d.expand_surroundings();
                    } else if(d.next_to_selected()) {
                        Hiski.hide_relative(Hiski.selected, d);
                    }
                })
            ;
    newrelations.append("circle")
            .attr("r", 5)
            .style("cursor", "pointer")
            ;
    newrelations.append("svg:text")
            .attr("text-anchor", "middle")
            .attr("dominany-baseline", "central")
            .attr("y", 4)
            .text(function(d) {
                return d.next_to_hidden() ? "+" : "";
            })
            .style("font-weight", "bold")
            .style("font-size", "80%")
            .style("fill", function(d) { return d.next_to_selected() ? "#000000" : "#ffffff" })
            ;
}


function render_all() {
    Hiski.update_selection_relations();
    for(var i = 0; i < item_views.length; i++) {
        if(item_views[i].mode != "tree")
            continue;
        if(item_views[i].tree_ready)
            render(item_views[i]);
    }
    if(Hiski.map) {
        update_map();
    }
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
                    if(_.contains(Hiski.selected_path, d.relation.xref) && _.contains(Hiski.selected_path, d.node.xref))
                        //return "#ffeeee";
                        return "#880000";
                    if(d.relation.selection_relation == "next-to-selected")
                        return "#ffffff";
                    return d.get_color();
                })
            .style("stroke-width", function(d) {
                    if(_.contains(Hiski.selected_path, d.relation.xref) && _.contains(Hiski.selected_path, d.node.xref))
                        return 5;
                    return d.node == Hiski.selected ? 4 : 2;
                })
            ;
    var move_to_front = function(elem) {
        elem.parentNode.appendChild(elem);
    }
    view.linksvg.each(function(d) {
        if(d.relation.selection_relation == "next-to-selected")
            move_to_front(this);
        else if(_.contains(Hiski.selected_path, d.relation.xref) && _.contains(Hiski.selected_path, d.node.xref))
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
            .style("stroke", function(d) {
                if(d == Hiski.selected)
                    return "#ffffff";
                if(_.contains(Hiski.selected_path, d.xref))
                    return "#ffffff";
                return "#000000";
            })
            .style("stroke-width", function(d) { return d == Hiski.selected ? 3 : 1 })
            ;
    view.nodesvg.each(function(d) {
        if(d == Hiski.selected)
            move_to_front(this);
    })

    if(Hiski.lastselected != Hiski.selected) {
        view.relationsvg.selectAll("circle")
                .style("stroke", "#ffffff")
                .style("fill", "#000000")
                ;
    }
    view.relationsvg.selectAll("circle")
//            .attr("r", 5)
            .attr("r", function(d) {
                return d.next_to_hidden() ? 8 : 5;
            })
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
            .style("fill", function(d) {
                if(_.contains(Hiski.selected_path, d.xref))
                    return "#ffeeee";
                if(d.next_to_selected())
                    return "#ffffff";
                return "#000000";
            })
            .style("stroke", function(d) {
                if(_.contains(Hiski.selected_path, d.xref))
                    return "#000000";
                if(d.next_to_selected())
                    return "#000000";
                return "#ffffff";
            })
//            .attr("r", function(d) { return next_to_selected(d) ? 8 : 5 })
            ;
    view.relationsvg.selectAll("text")
            .text(function(d) {
                if(d.next_to_hidden())
                    return "+";
                if(d.next_to_selected())
                    return "-";
                return "";
            })
            .style("fill", function(d) { return d.next_to_selected() ? "#000000" : "#ffffff" })
            ;
}

