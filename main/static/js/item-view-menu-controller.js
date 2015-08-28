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
            this.new_mode = mode;
            if(this.mode == mode)
                return;
            if(this.mode == "map" && mode != "map") {
                $("#map-storage").append($("#map"));
            }
            if(mode == "map") {
                for(var i = 0; i < item_views.length; i++) {
                    if(item_views[i].mode == "map") {
                        item_views[i].set_mode("tree");
                    }
                }
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
        menu.search_soundex = "";
        menu.search_result_term = "";
        menu.search_result_list = [];
        menu.search_time = "-";
        menu.search_triplets = [{
            relation: "self",
            search_type: "firstname",
            search_term: "",
        }];
        menu.search_state = "idle";

        menu.pathsearch_mode = "last-selection";
        menu.pathsearch_state = "idle";
        menu.pathsearch_xref = "";
        menu.pathsearch_time = "-";
        menu.pathsearch_from = null;
        menu.pathsearch_to = null;
        menu.pathsearch_list = [];
        menu.pathsearch_celebrity_xref = null;

        menu.comment_type = "other";
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
        menu.celebrity_select_and_load = function(xref) {
            this.pathsearch_celebrity_xref = xref;
            Hiski.load_or_focus(xref, null);
        };
        menu.show_search = function(json, term) {
            menu.search_result_list = json["inds"];
            menu.search_result_term = term;
            menu.search_soundex = json["soundex"];
            menu.search_time = json["time"];
            menu._redraw();
        };
        menu.do_multi_search = function() {
            var search_json = JSON.stringify(menu.search_triplets);
            var addr = Hiski.url_root + "json/multi-search/";
            menu.search_state = "loading";
            d3.json(addr, function(json) {
                    menu.search_state = "idle";
                    if(json) {
                        menu.show_search(json, "");
                    } else {
                        throw new Error("Loading firstname search '"+term+"' failed");
                    }
                })
                .header("Content-Type","application/json")
                .send("POST", search_json)
                ;
        };
        menu.add_search_triplet = function() {
            menu.search_triplets.push({
                relation: "self",
                search_type: "firstname",
                search_term: "",
            });
        };
        menu.check_if_remove_triplet = function(triplet) {
            if(triplet.relation == "remove") {
                var index = menu.search_triplets.indexOf(triplet);
                menu.search_triplets.splice(index, 1);
                if(menu.search_triplets.length == 0) {
                    menu.add_search_triplet();
                }
            }
        };


        menu.do_pathsearch = function() {
            var xref = null;
            if(menu.pathsearch_mode == "last-selection") {
                if(Hiski.lastselected == null) {
                    menu.pathsearch_error = "no-selection";
                } else {
                    xref = Hiski.lastselected.xref;
                }
            } else if(menu.pathsearch_mode == "xref") {
                xref = menu.pathsearch_xref;
            } else if(menu.pathsearch_mode == "celebrity") {
                xref = menu.pathsearch_celebrity_xref;
            }
            if(Hiski.selected == null) {
                console.warn("No nodes selected");
                menu.pathsearch_error = "no-selection";
            } else if(xref != null) {
                var addr = Hiski.url_root + "json/people-path/"+xref+"/"+Hiski.selected.xref+"/";
                menu.pathsearch_state = "loading";
                d3.json(addr, function(json) {
                    if(json) {
                        var flat = [];
                        // preload the nodes to assure the load order
                        for(var i = 0; i < json.inds.length; i++) {
                            var ind = json.inds[i];
                            Hiski.preloaded_entries[ind.xref] = ind;
                        }
                        // load the nodes from the preloaded dictionary
                        for(var i = 0; i < json.xrefs.length; i++) {
                            var xref = json.xrefs[i][1];
                            Hiski.load(xref, null, Hiski.selected);
                            flat.push(xref);
                        }
                        // load the families and expand their surroundings
                        for(var i = 0; i < json.xrefs.length; i++) {
                            var xref = json.xrefs[i][0];
                            if(xref !== null) {
                                Hiski.load(xref, null, Hiski.selected);
                                flat.push(xref);
                            }
                        }
                        Hiski.selected_path = flat;
                        Hiski.delayed_render();
                        menu.pathsearch_results = json["inds"];
                        menu.pathsearch_time = json["time"];
                        if(json["result"]) {
                            menu.pathsearch_from = json["inds"][0];
                            menu.pathsearch_to = json["inds"][json["inds"].length - 1];
                            menu.pathsearch_list = json["inds"];
                            menu.pathsearch_error = null;
                        } else {
                            menu.pathsearch_from = null;
                            menu.pathsearch_to = null;
                            menu.pathsearch_list = [];
                            menu.pathsearch_error = json["error"];
                        }
                        if(json["message"]) {
                            console.warn(json["message"]);
                        }
                        menu.pathsearch_state = "idle";
                    } else {
                        throw new Error("Loading path search '"+term+"' '"+Hiski.selected.xref+"' failed");
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
            if(!menu.comment_body) {
                // todo: tell this to the user somehow
                console.warn("content not filled.");
                return;
            }
            var xref = Hiski.selected.xref;
            $.post(Hiski.url_root + "json/leave/comment/"+xref+"/", {
                    content: menu.comment_body,
                    comment_type: menu.comment_type,
                    author_name: Hiski.comment_name,
                    author_email: Hiski.comment_email,
                    })
                    .done(function(data) {
                        Hiski.load_comments_for(xref);
                        menu.comment_body = "";
                        menu.comment_type = "other";
                    });
        };

        if(this.id < initial_views.view_modes.length) {
            this.set_mode(initial_views.view_modes[this.id]);
        } else {
            this.set_mode("tree");
        }
    });


/*
Redraw all the subviews to update their data.
*/
function redraw_views() {
    item_views[0]._redraw();
}
