
function link_node_to(node, relation, type) {
    if(type == "child") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.parents.push(relation.parents[i]);
            relation.parents[i].children.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.siblings.push(relation.children[i]);
            relation.children[i].siblings.push(node);
        }
        relation.children.push(node);
    } else if(type == "wife") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.spouses.push(relation.parents[i]);
            relation.parents[i].spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.wife = node;
        relation.parents.push(node);
    } else if(type == "husband") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.spouses.push(relation.parents[i]);
            relation.parents[i].spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.husband = node;
        relation.parents.push(node);
    } else if(type == "parent") {
        for(var i = 0; i < relation.parents.length; i++) {
            node.spouses.push(relation.parents[i]);
            relation.parents[i].spouses.push(node);
        }
        for(var i = 0; i < relation.children.length; i++) {
            node.children.push(relation.children[i]);
            relation.children[i].parents.push(node);
        }
        relation.parents.push(node);
    }
    relation.nodes.push(node);
    node.relations.push(relation);
}
function find_link_type(node, relation) {
    if(_.indexOf(relation.data.children, node.xref) != -1) {
        return "child";
    }
    if(_.indexOf(relation.data.parents, node.xref) != -1) {
        return "parent";
    }
    throw new Error("No node '"+obj.xref+"' in relation '"+relation.xref+"'");
}

function create_link_id(relation, node) {
    return relation.xref + node.xref;
}
function Link(relation, node, type) {
    this.type = "link";
    this.relation = relation;
    this.node = node;
    this.type = type;

    this.id = create_link_id(relation, node);

    this.is_visible = function() {
        if(this.node.is_visible() && this.relation.is_visible())
            return true;
        return false;
    }

    this.get_path_points = function() {
        var points = [];
        var node_size = 25;
        var relation_size = 6;
        var pad = 0;
        var straight = 4;
        var y_space = this.relation.y_space - node_size - relation_size - straight*2 - pad*2;
        if(this.type == "child") {
            points.push([this.relation.get_x(), this.relation.get_y()]);
            points.push([this.relation.get_x(), this.relation.get_y() + relation_size + pad]);
            points.push([this.relation.get_x(), this.relation.get_y() + relation_size + pad + straight]);
            points.push([this.node.get_x(),     this.relation.get_y() + relation_size + y_space]);
            points.push([this.node.get_x(),     this.node.get_y() - node_size - pad]);
            points.push([this.node.get_x(),     this.node.get_y()]);
        } else {
            points.push([this.relation.get_x(), this.relation.get_y()]);
            points.push([this.relation.get_x(), this.relation.get_y() -relation_size - pad]);
            points.push([this.relation.get_x(), this.relation.get_y() -relation_size - pad - straight]);
            points.push([this.node.get_x(),     this.relation.get_y() -relation_size - y_space]);
            points.push([this.node.get_x(),     this.node.get_y() + node_size + pad]);
            points.push([this.node.get_x(),     this.node.get_y()]);
        }
        return points;
    };
    this.get_color = function() {
        // todo: if they have lighter colours, they should also have a different z-order
        var distance = Math.abs(this.relation.get_x() - this.node.get_x());
        if(distance < 1000)
            return "#000000";
        else if(distance < 3000)
            return "#666666";
        else if(distance < 6000)
            return "#aaaaaa";
        else
            return "#dddddd";
    };
}
var line_function = d3.svg.line()
        .x(function(d) { return d[0]; })
        .y(function(d) { return d[1]; })
        .interpolate("basis")
        ;

