
var ItemView = function(id, controller) {
    this.id = id;
    this.html_id = "ItemView"+id;
    this.tree_id = this.html_id + "Tree";
    this.map_id = this.html_id + "Map";
    this.search_id = this.html_id + "Search";
    this.controller = controller;
    this.mode = "tree";
    item_views.push(this);
    this.close = function() {
        var i = item_views.indexOf(this);
        if(i != -1)
            item_views.splice(i, 1);
    };
    this.set_mode = function(mode) {
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
    var selected_node = Hiski.selected;
    // for map view
    this.map = null;
};
this._next_id = 0;
this.next_id = function() {
    var id = this._next_id;
    this._next_id += 1;
    return id;
};
var item_views = [];

app.controller("ItemViewMenuController", function($scope, $translate) {
        var menu = this;
        menu.item = new ItemView(next_id(), this);
        menu.color = "#ffffff";
        menu.selected_node = Hiski.selected;
        menu.search_by = "firstname";
        menu.search_term = "";
        menu.search_result_term = "";
        menu.search_result_list = [];
        menu.set_color = function(color) {
            menu.color = color;
        };
        menu.set_tab = function(tabname) {
            menu.item.set_mode(tabname);
        };
        $scope.$on("$destroy", function() {
            console.warn("closed item "+menu.item.id);
            menu.item.close();
        });
        menu.redraw = function() {
            $scope.$apply();
        };
        menu.load = function(xref) {
            Hiski.load(xref, null);
        };
        menu.do_search = function() {
            var term = menu.search_term;
            if(menu.search_by == "xref") {
                Hiski.load(term, null);
            } else if(menu.search_by == "firstname") {
                var addr = Hiski.url_root + "json/search/firstname/"+term+"/";
                d3.json(addr, function(json) {
                    if(json) {
                        menu.search_result_list = json["inds"];
                        menu.search_result_term = term;
                        menu.redraw();
                    } else {
                        throw new Error("Loading firstname search '"+term+"' failed");
                    }
                });
            } else if(menu.search_by == "familyname") {
                var addr = Hiski.url_root + "json/search/familyname/"+term+"/";
                d3.json(addr, function(json) {
                    if(json) {
                        menu.search_result_list = json["inds"];
                        menu.search_result_term = term;
                        menu.redraw();
                    } else {
                        throw new Error("Loading familyname search '"+term+"' failed");
                    }
                });
            }
        };
    });
