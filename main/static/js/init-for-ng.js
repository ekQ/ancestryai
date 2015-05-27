
app = angular.module("HiskiVisualizer", ["pascalprecht.translate"]);
app.controller("TopMenuController", function($scope, $translate) {
        var menu = this;
        menu.blue = function() {
            $(".main").css("background-color", "#ccccff");
        };
        menu.set_color = function(color) {
            $(".topmenu").css("background-color", color);
        };
        menu.toggle_color_mode = function() {
            Hiski.next_color_mode();
//            render(Hiski);
            render_all();
        };
        menu.set_language = function(lang) {
            $translate.use(lang);
        };
        menu.load_random = function() {
            Hiski.load(null, null);
        };
        menu.print_order = function() {
            console.warn("----------------------------------");
            for(var i = 0; i < Hiski.node_order.length; i++) {
                var node = Hiski.node_order[i];
                var second_index = Hiski.nodes.indexOf(node);
                console.warn(i + " (" + second_index + "):  " +
                        node.xref + ",  " +
                        "year: " + node.year + ",  " +
                        "lody: " + node.last_open_descendant_year + ",  " +
                        node.name + "        -- " +
                        node.order_reason);
            }
        };
        menu.toggle_layout = function() {
            Hiski.toggle_layout();
        };
        menu.toggle_autoexpand = function() {
            Hiski.node_auto_expand_delay = Hiski.node_auto_expand_delay == -1 ? 3000 : -1;
            Hiski.start_node_autoexpansion();
        };
    });
app.config(function($translateProvider) {
    for(key in translations) {
        $translateProvider.translations(key, translations[key]);
    }
    $translateProvider.preferredLanguage("en");
//    $translateProvider.useCookieStorage();
    $translateProvider.useMissingTranslationHandler("handleMissingTranslations");
    // no sanitation strategy, because we should be in full control of all data
    $translateProvider.useSanitizeValueStrategy(null);
});
var missing_trans = {};
app.factory("handleMissingTranslations", function() {
    return function(translationID) {
        if(!(translationID in missing_trans)) {
            missing_trans[translationID] = true;
        }
        var s = "";
        for(var id in missing_trans) {
            s += "\""+id+"\": \""+id+"\",\n";
        }
        console.warn("Missing translation key: '" + translationID + "'. Copy pasteable line for all:\n"+
        s);
//        "    \""+translationID+"\": \""+translationID+"\",\n");
    };
});

