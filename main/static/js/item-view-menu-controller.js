/*
Angular controller for a single subview.
*/


/*
Generate unique ids for the subviews and an array to store the subviews for
external access.
*/
var _next_id = 0;
function next_id() {
    var id = this._next_id;
    _next_id += 1;
    return id;
}
function peek_next_id() {
    return _next_id;
}
var item_views = [];

app.controller("ItemViewMenuController", function($scope, $translate) {
        /*
        Controller for a single subview.
        */
        // todo: refactor / cleanup
        item_views.push(this);
        // XXX: maybe we could retrieve this id somehow from the multiview?
        // possibly through dom? Not sure if worth the trouble.
        this.id = next_id();
        this.html_id = "ItemView"+this.id;
        this.tree_id = this.html_id + "Tree";
        this.map_id = this.html_id + "Map";
        this.search_id = this.html_id + "Search";
        this.mode = "tree";
        this.new_mode = "tree";
        this.preclose = function() {
            if(this.mode == "map") {
                $("#map-storage").append($("#map"));
            }
        };
        this.close = function() {
            var i = item_views.indexOf(this);
            if(i != -1)
                item_views.splice(i, 1);
        };
        this.set_new_mode = function() {
            this.set_mode(this.new_mode);
        };
        this.set_mode = function(mode) {
            if(this.mode == "map" && mode != "map") {
                $("#map-storage").append($("#map"));
            }
            this.mode = mode;
            if(mode == "tree") {
                enter(this);
                render(this);
            } else if(mode == "map") {
                $("#"+this.map_id).append($("#map"));
                if(Hiski.map === null) {
                    map_init();
                }
            }
        };
        // for tree view
        this.tree_ready = false;
        this.zoom = null;
        this.container = null;
        var item_view = this;
        var timeout = 100;
        var poll_dom = function() {
            var svg = d3.select("#"+item_view.tree_id);
            if(svg.empty()) {
                timeout = timeout * 2;
                setTimeout(poll_dom, timeout);
                console.warn("timeout "+timeout);
            } else {
                tree_init(item_view);
                enter(item_view);
                render(item_view);
                item_view.tree_ready = true;
            }
        };
        setTimeout(poll_dom, timeout);
        // for info view
        this.selected_node = Hiski.selected;
        // for map view
        this.map = null;

        // angular controller stuff
        var menu = this;

        menu.search_by = "firstname";
        menu.search_term = "";
        menu.search_soundex6 = "";
        menu.search_result_term = "";
        menu.search_result_list = [];
        menu.search_time = "-";

        menu.comment_body = "";

        menu.testnote = Hiski.testnote;
        menu.Hiski = Hiski;

        menu.set_tab = function(tabname) {
            menu.set_mode(tabname);
        };
        $scope.$on("$destroy", function() {
            console.warn("closed item "+menu.id);
            menu.close();
        });
        menu._redraw = function() {
            $scope.$apply();
        };
        menu.load = function(xref) {
            Hiski.load_or_focus(xref, null);
        };
        menu.show_search = function(json, term) {
            menu.search_result_list = json["inds"];
            menu.search_result_term = term;
            menu.search_soundex6 = json["soundex6"];
            menu.search_time = json["time"];
            menu._redraw();
        };
        menu.do_search = function() {
            var term = menu.search_term;
            if(menu.search_by == "xref") {
                Hiski.load(term, null);
            } else if(menu.search_by == "firstname") {
                var addr = Hiski.url_root + "json/search/firstname/"+term+"/";
                d3.json(addr, function(json) {
                    if(json) {
                        menu.show_search(json, term);
                    } else {
                        throw new Error("Loading firstname search '"+term+"' failed");
                    }
                });
            } else if(menu.search_by == "familyname") {
                var addr = Hiski.url_root + "json/search/familyname/"+term+"/";
                d3.json(addr, function(json) {
                    if(json) {
                        menu.show_search(json, term);
                    } else {
                        throw new Error("Loading familyname search '"+term+"' failed");
                    }
                });
            } else if(menu.search_by == "ppfamily") {
                var addr = Hiski.url_root + "json/search/pure-python-family/"+term+"/";
                d3.json(addr, function(json) {
                    if(json) {
                        menu.show_search(json, term);
                    } else {
                        throw new Error("Loading ppfamily search '"+term+"' failed");
                    }
                });
            }
        };
        menu.testzoom = function() {
            if(Hiski.selected !== null)
                locate_node(menu, Hiski.selected, false);
            else if(Hiski.nodes.length > 0)
                locate_node(menu, Hiski.nodes[0], false);
        };
        menu.select_node = function(node) {
            if(node === null)
                return;
            Hiski.select_node(node, false);
        };
        menu.leave_comment = function() {
            $.post(Hiski.url_root + "json/leave/comment/"+Hiski.selected.xref+"/", {
                    content: menu.comment_body,
                    })
                    .done(function(data) {
                        console.warn(data);
                    });
        };
    });


/*
Redraw all the subviews to update their data.
*/
function redraw_views() {
    item_views[0]._redraw();
}
