
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

