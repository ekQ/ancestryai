
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
            console.warn("close "+column_i+","+item_i);
            if(multi_view.columns[column_i].items.length == 1) {
                multi_view.close_column(column_i);
                return;
            }
            multi_view.columns[column_i].items.splice(item_i, 1);
        };
        this.close_item_by_id = function(id) {
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
            console.warn("close "+column_i+",*");
            multi_view.columns.splice(column_i, 1);
            if(multi_view.columns.length == 0) {
                multi_view.add_column();
            }
        };
        this.close_column_by_id = function(id) {
            for(var i = 0; i < this.columns.length; i++) {
                if(this.columns[i].id == id) {
                    this.close_column(i);
                }
            }
        };

        this.add_column();
    });


