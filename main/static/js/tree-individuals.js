/*
"class" and some related functions for individuals.
*/


function color_hash(str) {
    /*
    Generate a colour from a string by hashing the string.
    */
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
    /*
    Generate a colour from a sex.
    */
    if(sex == "F")
        return "#ffcccc";
    if(sex == "M")
        return "#ccccff";
//    alert("unhandled sex: '"+sex+"'");
    return "#dddddd";
}
function endsWith(str, suffix) {
    /*
    Checks if a given string ends with a given suffix.
    */
    if(!str)
        return false;
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


function Node(data) {
    /*
    "class" for an individual.
    */
    /* identifying and source data */
    this.type = "node";
    this.data = data;
    this.xref = data.xref;
    this.name = data.name;
    this.first_name = this.name.split("/")[0];
    this.family_name = this.name.split("/")[1];

    /* graph and person relations */
    this.relations = [];
    this.parents = [];
    this.spouses = [];
    this.children = [];
    this.siblings = [];


    /* order pointers */
    this.rightmost_subnode = null;
    this.leftmost_parent = null;
    this.rightmost_parent = null;
    this.rightmost_spouse = null;
    this.leftmost_child = null;
    this.order_reason = "None";
    this.order_fuzzy_index = null;

    /* layout related fields */
    this.x = _.random(0, 400) + 200;
    this.y = 0;
    this.year = data.birth_date_year;
    this.guessed_year = null;
    this.color_by_name = color_hash(this.family_name);
    this.color_by_soundex = color_hash(
            // because fooin and fooinen were mixed a lot in my sample data
            endsWith(this.family_name, "nen") ?
                this.data.soundex6family.replace(/5(0*)$/, "0$1") :
                this.data.soundex6family
            );
    this.color_by_sex = color_sex(this.data.sex);
    this.last_open_descendant_year = this.year;
    this.timetraveller = false;
    this.visible = true;
    this.is_visible = function() { return this.visible; }

    /* map related */
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
        /*
        Returns all connected relations and whether this node is a spouse or
        child in that relation.
        */
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
        /*
        Load and add all relations connected to this node. If relation
        autoexpand is on, then the relations will be expanded immediately on
        load.
        */
        var arr = this.get_relation_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
    this.expandable = function() {
        /*
        Returns whether this node still has some relations that are not loaded
        yet.
        */
        var arr = this.get_relation_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var xref = arr[i][0];
            if(!(xref in Hiski.relation_dict))
                return true;
        }
        return false;
    };
}


/*
Functions for updating order pointers. They update the field they tell to
update. If a recursive check is needed, the update will be called recursively
to other nodes.
*/

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
function update_leftmost_child(node) {
    var leftmost = null;
    var leftmost_fuzzy = 0.0;
    for(var i = 0; i < node.children.length; i++) {
        if(leftmost == null || node.children[i].order_fuzzy_index < leftmost_fuzzy) {
            leftmost = node.children[i];
            leftmost_fuzzy = node.children[i].order_fuzzy_index;
        }
    }
    node.leftmost_child = leftmost;
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
function update_rightmost_spouse(node) {
    var rightmost = node.order_fuzzy_index !== null ? node : null;
    var rightmost_fuzzy = node.order_fuzzy_index;
    for(var i = 0; i < node.spouses.length; i++) {
        if(rightmost == null || node.spouses[i].order_fuzzy_index > rightmost_fuzzy) {
            rightmost = node.spouses[i];
            rightmost_fuzzy = node.spouses[i].order_fuzzy_index;
        }
    }
    node.rightmost_spouse = rightmost;
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




function guess_node_year(node, field) {
    /*
    Guess a year for a node, so that we can place it somewhere in the layout.
    */
    field = (typeof field === "undefined") ? "year" : field;
    var year = null;
    if(node[field] !== null) {
        // We already have a guess or knowledge, use that
        year = node[field];
    } else {
        if(node.spouses.length > 0) {
            // same as spouse's
            for(var i = 0; i < node.spouses.length; i++) {
                if(node.spouses[i][field] !== null) {
                    year = node.spouses[i][field];
                    break;
                }
            }
        }
        if(year === null && node.siblings.length > 0) {
            // same as sibling's
            for(var i = 0; i < node.siblings.length; i++) {
                if(node.siblings[i][field] !== null) {
                    year = node.siblings[i][field];
                    break;
                }
            }
        }
        if(year === null) {
            // between parents' and children's or 20 before after either if
            // both don't exist yet.
            var parent_max = null;
            if(node.parents.length > 0) {
                for(var i = 0; i < node.parents.length; i++) {
                    if(parent_max === null) {
                        parent_max = node.parents[i][field];
                    } else if(node.parents[i][field] !== null) {
                        parent_max = Math.max(parent_max, node.parents[i][field]);
                    }
                }
            }
            var child_min = null;
            if(node.children.length > 0) {
                for(var i = 0; i < node.children.length; i++) {
                    if(child_min === null) {
                        child_min = node.children[i][field];
                    } else if(node.children[i][field] !== null) {
                        child_min = Math.min(child_min, node.children[i][field]);
                    }
                }
            }
            if(parent_max !== null) {
                if(child_min !== null) {
                    year = (parent_max + child_min) / 2;
                } else {
                    // guessing the parents were about 20 on birth
                    year = parent_max + 20;
                }
            } else {
                if(child_min !== null) {
                    // guessing the parents were about 20 on birth
                    year = child_min - 20;
                }
            }
        }
    }
    if(year === null) {
        // we couldn't guess anything
        if(field == "year") {
            // next, guess based on surrounding guesses
            year = guess_node_year(node, "guessed_year");
        } else {
            // still unable to guess. Just place it awkwardly to year 0
            console.warn("Still unable to guess year for '"+node.xref+"' after looking at family members.");
            year = 0;
        }
    } else {
        node.guessed_year = year;
    }
    return year;
}
