/*
"class" and some related functions for families
*/

function Relation(data) {
    /*
    "class" for a family
    */
    /* identifying and source data */
    this.type = "relation";
    this.data = data;
    this.xref = data.xref;

    /* graph relations */
    this.nodes = [];
    this.children = [];
    this.parents = [];
    this.wife = null;
    this.husband = null;

    /* layout */
    this.is_visible = function() {
        for(var i = 0; i < this.nodes.length; i++)
            if(this.nodes[i].is_visible())
                return true;
        return false;
    };
    this.next_to_hidden = function() {
        for(var i = 0; i < this.nodes.length; i++)
            if(!this.nodes[i].is_visible())
                return true;
        return false;
    };

    this.next_to_selected = function() {
        if(Hiski.selected === null)
            return false;
        for(var i = 0; i < Hiski.selected.relations.length; i++) {
            if(Hiski.selected.relations[i] == this)
                return true;
        }
        return false;
    };

    this.get_x = function() {
        return this.x;
    };
    this.get_y = function() {
        return this.y;
    };
    this.get_preferred_x = function() {
        /*
        Gets the preferred x position for this relation in the normal layout.
        This is based on the parents' and children's positions.
        */
        var sumspouse = 0.0;
        var numspouse = 0;
        var sumchildren = 0.0;
        var numchildren = 0;
        for(var i = 0; i < this.children.length; i++) {
            if(!this.children[i].is_visible())
                continue;
            sumchildren += this.children[i].get_x();
            numchildren += 1;
        }
        for(var i = 0; i < this.parents.length; i++) {
            if(!this.parents[i].is_visible())
                continue;
            sumspouse += this.parents[i].get_x();
            numspouse += 1;
        }
        if(numspouse == 0 && numchildren == 0)
            return this.x;
        if(numspouse == 0) {
            return sumchildren / numchildren;
        } else if(numchildren == 0) {
            return sumspouse / numspouse;
        }
        return ((sumchildren / numchildren) + (sumspouse / numspouse)) / 2;
    };
    this.get_preferred_y = function() {
        /*
        Gets the preferred y position for this relation in the normal layout.
        This is based on the parents' and children's positions.
        */
        var minchild = null;
        var maxspouse = null;
        for(var i = 0; i < this.children.length; i++) {
            if(!this.children[i].is_visible())
                continue;
            minchild = Math.min(minchild === null ? 2000000000 : minchild,
                    this.children[i].get_y());
        }
        for(var i = 0; i < this.parents.length; i++) {
            if(!this.parents[i].is_visible())
                continue;
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
        /*
        Get all the nodes connected to this relation.
        */
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
        /*
        Load and add all the nodes connected to this relation.
        */
        var arr = this.get_node_xrefs();
        for(var i = 0; i < arr.length; i++) {
            var value = arr[i][0];
            Hiski.load(value, this);
        }
    };

    this.parent_fuzzy_index_sum = function() {
        var sum = 0;
        for(var i = 0; i < this.parents.length; i++)
            sum += this.parents[i].order_fuzzy_index;
        return sum;
    };

    this.x = this.get_preferred_x();
    this.y = this.get_preferred_y();
    this.y_space = 40;
}


