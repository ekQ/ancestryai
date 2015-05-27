
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
                item_views[i].redraw();
            }
        } else {
//            throw new Error("Loading testnote failed");
        }
    });
});
