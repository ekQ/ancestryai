
function map_node_transform(d) {
    var pos = new google.maps.LatLng(d.mapy, d.mapx);
    pos = Hiski.map_projection.fromLatLngToDivPixel(pos);
    d.map_projection_x = pos.x;
    d.map_projection_y = pos.y;
    return d3.select(this)
            .attr("cx", pos.x + 1000)
            .attr("cy", pos.y + 1000)
            ;
}

function map_init() {
    Hiski.map = new google.maps.Map(d3.select("#map").node(), {
            zoom: 7,
            center: new google.maps.LatLng(62.9, 27.7),
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            });
    var overlay = new google.maps.OverlayView();
    Hiski.map_overlay = overlay;
    overlay.onAdd = function() {
        var svg = d3.select(this.getPanes().overlayLayer)
                .append("svg")
                .attr("class", "mapsvg")
                ;
        var linelayer = svg.append("g")
                .attr("class", "map-line-layer")
                ;
        var nodelayer = svg.append("g")
                .attr("class", "map-node-layer")
                ;
        var linefunction = d3.svg.line()
                .x(function(d) { return d.map_projection_x + 1000 })
                .y(function(d) { return d.map_projection_y + 1000 })
                .interpolate("linear")
                ;

        // if it is panned over 1000 pixels in a direction, we are out of drawable area of this svg...
        overlay.draw = function() {
            svg.style("margin-left", "-1000px")
                    .style("margin-top", "-1000px")
                    .attr("width", "3000px")
                    .attr("height", "3000px")
                    ;

            var projection = this.getProjection();
            Hiski.map_projection = projection;
            var nodes = nodelayer.selectAll("circle")
                    .data(Hiski.nodes)
                    .each(map_node_transform)
                    ;
            nodes.enter()
                    .append("svg:circle")
                    .attr("r", 4.5)
                    .attr("class", "marker")
                    .each(map_node_transform)
                    ;
            nodes
                    .style("fill", function(d) {
                        return d == Hiski.selected ? "#ffffff" : "#000088";
                    })
                    .style("stroke", "#000000")

            var newlinedata = [];
            if(Hiski.selected !== null) {
                for(var i = 0; i < Hiski.selected.parents.length; i++) {
                    newlinedata.push({
                        p: Hiski.selected.parents[i],
                        c: Hiski.selected,
                        rel: "parent",
                    });
                }
                for(var i = 0; i < Hiski.selected.children.length; i++) {
                    newlinedata.push({
                        p: Hiski.selected.children[i],
                        c: Hiski.selected,
                        rel: "child",
                    });
                }
            }
            var lines = linelayer.selectAll("path")
                    .data(newlinedata)
                    ;
            lines.exit().remove();
            if(Hiski.selected !== null) {
                lines.enter().append("svg:path")
                        .attr("d", function(d) { return linefunction([d.p, d.c]) })
                        .style("stroke", "#000000")
                        .style("stroke-width", 2)
                        ;
                lines
                        .attr("d", function(d) { return linefunction([d.p, d.c]) })
                        .style("stroke", function(d) { return color_selection_relation(d.rel, 1); })
                        ;
                var move_to_front = function(elem) {
                    elem.parentNode.appendChild(elem);
                }
                nodes.each(function(d) {
                    if(d == Hiski.selected)
                        move_to_front(this);
                })
            }
        };
    };
    overlay.setMap(Hiski.map);
}

function update_map() {
    if(Hiski.map === null)
        return;
    Hiski.map_overlay.draw();
}

