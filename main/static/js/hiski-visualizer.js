

function add_debug_toggle() {
    var buffer = "aaaaa";
    var buffer2 = "abcdeabcde";
    d3.select("body")
            .on("keydown", function() {
                buffer += d3.event.key;
                buffer2 += d3.event.keyCode;
                if(buffer.length > 5)
                    buffer = buffer.slice(buffer.length - 5);
                if(buffer2.length > 10)
                    buffer2 = buffer2.slice(buffer2.length - 10);
                if((buffer == "debug" || buffer2 == "6869668571") && !Hiski.debug_mode) {
                    Hiski.debug_mode = true;
                    redraw_views();
                }
            })
            ;
}


$(document).ready(function() {
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
    d3.json(Hiski.url_root + "json/celebrities/", function(json) {
        if(json && json.result == true) {
            Hiski.set_celebrities(json.inds);
        } else {
            throw new Error("Loading celebrities failed");
        }
    });
    d3.json(Hiski.url_root + "json/parishes/", function(json) {
        if(json && json.result == true) {
            Hiski.set_parishes(json.parishes);
        } else {
            throw new Error("Loading parishes failed");
        }
    });
    add_debug_toggle();
});
