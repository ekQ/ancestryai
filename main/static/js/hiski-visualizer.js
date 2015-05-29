

function add_debug_toggle() {
    var buffer = "aaaaa";
    d3.select("body")
            .on("keydown", function() {
                buffer += d3.event.key;
                if(buffer.length > 5)
                    buffer = buffer.slice(buffer.length - 5);
                if(buffer == "debug" && !Hiski.debug_mode) {
                    Hiski.debug_mode = true;
                    for(var i = 0; i < item_views.length; i++) {
                        item_views[i].debug_mode = true;
                    }
                    redraw_views();
                }
            })
            ;
}


$(document).ready(function() {
//    map_init();
    render_all();
//    Hiski.load("@I01@", null);
//    Hiski.load("@I2131@", null);
//    Hiski.load("@I1307@", null);
//    Hiski.load(null, null);
    Hiski.load("@first@", null);
    d3.json(Hiski.url_root + "json/setting/testnote/", function(json) {
        if(json && json.result == true) {
            Hiski.testnote = json.testnote;
            for(var i = 0; i < item_views.length; i++) {
                item_views[i].testnote = Hiski.testnote;
                redraw_views();
            }
        } else {
//            throw new Error("Loading testnote failed");
        }
    });
    add_debug_toggle();
});
