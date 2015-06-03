
app.controller("MultiViewController", function($scope, $translate) {
        var multi_view = this;
        this.columns = [
            ];
        var next_item_id = 0;
        var create_item = function() {
            return {id: peek_next_id()};
        }
        this.add_column = function() {
            var item = create_item();
            multi_view.columns.push({
                    items: [
                        create_item()
                    ],
                    id: item.id,
                });
        };
        this.add_item = function(column_i) {
            multi_view.columns[column_i].items.push(create_item());
        };
        this.close_item = function(column_i, item_i) {
            // must be called from close by id
            console.warn("close "+column_i+","+item_i);
            if(multi_view.columns[column_i].items.length == 1) {
                multi_view.close_column(column_i);
                return;
            }
            multi_view.columns[column_i].items.splice(item_i, 1);
        };
        this.close_item_by_id = function(id) {
            // preclose the item
            for(var i = 0; i < item_views.length; i++) {
                if(item_views[i].id == id)
                    item_views[i].preclose();
            }
            // close the item
            for(var i = 0; i < this.columns.length; i++) {
                for(var j = 0; j < this.columns[i].items.length; j++) {
                    if(this.columns[i].items[j].id == id) {
                        this.close_item(i, j);
                        return;
                    }
                }
            }
        };
        this.close_column = function(column_i) {
            // must be called from close by id
            console.warn("close "+column_i+",*");
            multi_view.columns.splice(column_i, 1);
            if(multi_view.columns.length == 0) {
                multi_view.add_column();
            }
        };
        this.close_column_by_id = function(id) {
            for(var i = 0; i < this.columns.length; i++) {
                if(this.columns[i].id == id) {
                    // call preclose for items in the column (to preserve map)
                    var j = 0;
                    for(var k = 0; k < item_views.length; k++) {
                        while(j < this.columns[i].items.length &&
                                item_views[k].id > this.columns[i].items[j].id) {
                            j++;
                        }
                        if(j >= this.columns[i].items.length)
                            break;
                        if(this.columns[i].items[j].id == item_views[k].id) {
                            item_views[k].preclose();
                        }
                    }
                    // close the column
                    this.close_column(i);
                }
            }
        };

        this.add_column();
    });


