
function color_hash(str) {
    var hash = 0;
    var chr;
    if(str.length == 0)
        return "#000000";
    var len = str.length;
    for(var i = 0; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash = hash & 0xffffff;
    }
    var s = hash.toString(16);
    while(s.length < 6)
        s = "0" + s;
    return "#" + s;
}
function color_sex(sex) {
    if(sex == "F")
        return "#ffcccc";
    if(sex == "M")
        return "#ccccff";
//    alert("unhandled sex: '"+sex+"'");
    return "#dddddd";
}


function Node(data) {
    // identifying and source data
    this.type = "node";
    this.data = data;
    this.xref = data.xref;
    this.name = data.name;
    this.first_name = this.name.split("/")[0];
    this.family_name = this.name.split("/")[1];

    // graph and person relations
    this.relations = [];
    this.parents = [];
    this.spouses = [];
    this.children = [];
    this.siblings = [];


    // order pointers
    this.rightmost_subnode = null;
    this.leftmost_parent = null;
    this.rightmost_parent = null;
    this.order_reason = "None";
    this.order_fuzzy_index = 0.0;

    // layout
    this.x = _.random(0, 400) + 200;
    this.y = 0;
    this.year = data.birth_date_year;
    this.color_by_name = color_hash(this.family_name);
    this.color_by_sex = color_sex(this.data.sex);
    this.last_open_descendant_year = this.year;

    // map related
    this.mapx = _.random(0, 400000) / 1000.0;
    this.mapy = _.random(0, 160000) / 1000.0 - 80.0;
    this.map_projection_x = null;
    this.map_projection_y = null;


    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.y;
    };

    this.get_relation_xrefs = function() {
        res = [];
        for(var i = 0; i < this.data.sub_families.length; i++) {
            res.push([this.data.sub_families[i], "spouse"]);
        }
        for(var i = 0; i < this.data.sup_families.length; i++) {
            res.push([this.data.sup_families[i], "child"]);
        }
        return res;
    };
    this.expand_surroundings = function() {
        var arr = this.get_relation_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
    this.expandable = function() {
        var arr = this.get_relation_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var xref = arr[i][0];
            if(!(xref in Hiski.relation_dict))
                return true;
        }
        return false;
    };
}

function update_leftmost_parent(node) {
    var leftmost = null;
    var leftmost_fuzzy = 0.0;
    for(var i = 0; i < node.parents.length; i++) {
        if(leftmost == null || node.parents[i].order_fuzzy_index < leftmost_fuzzy) {
            leftmost = node.parents[i];
            leftmost_fuzzy = node.parents[i].order_fuzzy_index;
        }
    }
    node.leftmost_parent = leftmost;
}
function update_rightmost_parent(node) {
    var rightmost = null;
    var rightmost_fuzzy = 0.0;
    for(var i = 0; i < node.parents.length; i++) {
        if(rightmost == null || node.parents[i].order_fuzzy_index > rightmost_fuzzy) {
            rightmost = node.parents[i];
            rightmost_fuzzy = node.parents[i].order_fuzzy_index;
        }
    }
    node.rightmost_parent = rightmost;
}
function update_rightmost_subnode(node) {
    var rightmost = node.rightmost_subnode;
    if(rightmost === null)
        rightmost = node;
    var rightmost_fuzzy = rightmost.order_fuzzy_index;
    for(var i = 0; i < node.spouses.length; i++) {
        var other = node.spouses[i].rightmost_subnode;
        var fuzzy = other.order_fuzzy_index;
        if(fuzzy > rightmost_fuzzy) {
            rightmost = other;
            rightmost_fuzzy = fuzzy;
        }
    }
    for(var i = 0; i < node.children.length; i++) {
        var other = node.children[i].rightmost_subnode;
        var fuzzy = other.order_fuzzy_index;
        if(fuzzy > rightmost_fuzzy) {
            rightmost = other;
            rightmost_fuzzy = fuzzy;
        }
    }
    if(rightmost != node.rightmost_subnode) {
        node.rightmost_subnode = rightmost;
        for(var i = 0; i < node.spouses.length; i++) {
            update_rightmost_subnode(node.spouses[i]);
        }
        for(var i = 0; i < node.parents.length; i++) {
            update_rightmost_subnode(node.parents[i]);
        }
    }
}
function update_descendant_year(node, newyear) {
    var year = node.last_open_descendant_year;
    if(newyear === null) {
        for(var i = 0; i < node.children.length; i++) {
            year = Math.max(node.children[i].last_open_descendant_year, year);
        }
        node.last_open_descendant_year = year;
        for(var i = 0; i < node.parents.length; i++) {
            update_descendant_year(node.parents[i], year);
        }
    } else {
        node.last_open_descendant_year = Math.max(year, newyear);
        for(var i = 0; i < node.parents.length; i++) {
            update_descendant_year(node.parents[i], year);
        }
    }
}

