
function Relation(data) {
    // identifying and source data
    this.type = "relation";
    this.data = data;
    this.xref = data.xref;

    // graph relations
    this.nodes = [];
    this.children = [];
    this.parents = [];
    this.wife = null;
    this.husband = null;

    // layout
    this.is_visible = function() {
        for(var i = 0; i < this.nodes.length; i++)
            if(this.nodes[i].is_visible())
                return true;
        return false;
    }

    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.y;
    };
    this.get_preferred_x = function() {
        var sumspouse = 0.0;
        var numspouse = 0;
        var sumchildren = 0.0;
        var numchildren = 0;
        for(var i = 0; i < this.children.length; i++) {
            sumchildren += this.children[i].get_x();
            numchildren += 1;
        }
        for(var i = 0; i < this.parents.length; i++) {
            sumspouse += this.parents[i].get_x();
            numspouse += 1;
        }
        if(numspouse == 0 && numchildren == 0)
            return this.x;
        if(numspouse == 0) {
            return sumchildren / numchildren;
        } else if(numchildren == 0) {
            return sumspouse / numspouse;
//        } else if(numspouse > 1) {
//            return sumspouse / numspouse;
        }
        return ((sumchildren / numchildren) + (sumspouse / numspouse)) / 2;
    };
    this.get_preferred_y = function() {
        var minchild = null;
        var maxspouse = null;
        for(var i = 0; i < this.children.length; i++) {
            minchild = Math.min(minchild === null ? 2000000000 : minchild,
                    this.children[i].get_y());
        }
        for(var i = 0; i < this.parents.length; i++) {
            maxspouse = Math.max(maxspouse === null ? -2000000000 : maxspouse,
                    this.parents[i].get_y());
        }
        if(minchild === null && maxspouse === null)
            return this.y;
        if(maxspouse === null) {
            return minchild - 50;
        } else if(minchild === null) {
            return maxspouse + 50;
        }
        this.y_space = (minchild - maxspouse) / 2;
        return (minchild + maxspouse) / 2;
    };

    this.get_node_xrefs = function() {
        var res = [];
        for(var i = 0; i < this.data.children.length; i++) {
            res.push([this.data.children[i], "child"]);
        }
        for(var i = 0; i < this.data.parents.length; i++) {
            res.push([this.data.parents[i], "parent"]);
        }
        return res;
    };
    this.expand_surroundings = function() {
        var arr = this.get_node_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };
    this.x = this.get_preferred_x();
    this.y = this.get_preferred_y();
    this.y_space = 40;
}


