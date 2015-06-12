/*
Angular controller for the multiview, which contains and controls all the
subviews.
*/

/* Handling the resizing bars */
var resizing = {
    item: null,
    against: null,
    mode: "vertical",
};
function start_resize(item, against, mode) {
    /*
    Set the information for resize and bind events.
    */
    resizing.item = item;
    resizing.against = against;
    resizing.mode = mode;
//    console.warn(item.id + ", " + against.id + ", " + mode);
    $(document).on("mousemove", resize_mousemove);
    $(document).on("mouseup", resize_mouseup);
}
function resize_mousemove(event) {
    /*
    Handle dragging the resizing bar. Gives width or height from the subview on
    one side to the subview on the other side.
    */
    var against_hid = "#" + resizing.against.html_id;
    var item_hid = "#" + resizing.item.html_id;
    var resizer_hid = "#" + resizing.item.html_id + " > .resizer";
    if(resizing.mode == "vertical") {
        // resize in vertical direction
        var height1 = $(against_hid).height();
        var height2 = $(item_hid).height();
        var barheight = $(item_hid + " .itemheader").offset().top - $(resizer_hid).offset().top;
        var bary = Math.round($(resizer_hid).offset().top + barheight / 2);
        var diff = event.pageY - bary;
        height1 += diff;
        height2 -= diff;
        var minimum = 120;
        if(height1 + height2 < minimum) {
            height1 = minimum / 2;
            height2 = minimum / 2;
        } else if(height1 < minimum) {
            height2 += height1 - minimum;
            height1 = minimum;
        } else if(height2 < minimum) {
            height1 += height2 - minimum;
            height2 = minimum;
        }
//        console.warn($(against_hid).height() + ","+$(item_hid).height() + " -> " + height1 + ","+height2 + "("+(height1+height2)+")  diff:"+diff+" (" + event.pageY + "-" + bary + ")");
        $(against_hid).height(height1);
        $(item_hid).height(height2);
    } else {
        // resize in horizontal direction
        var width1 = $(against_hid).width();
        var width2 = $(item_hid).width();
        var barwidth = $(item_hid + " .inner-column-container").offset().left - $(resizer_hid).offset().left;
        var barx = Math.round($(item_hid).offset().left + barwidth / 2);
        var diff = event.pageX - barx;
        width1 += diff;
        width2 -= diff;
        var minimum = 120;
        if(width1 + width2 < minimum) {
            width1 = minimum / 2;
            width2 = minimum / 2;
        } else if(width1 < minimum) {
            width2 += width1 - minimum;
            width1 = minimum;
        } else if(width2 < minimum) {
            width1 += width2 - minimum;
            width2 = minimum;
        }
        $(against_hid).width(width1);
        $(item_hid).width(width2);
    }
}
function resize_mouseup(event) {
    /*
    Unbind events when ending the drag.
    */
    $(document).unbind("mousemove", resize_mousemove);
    $(document).unbind("mouseup", resize_mouseup);
    resizing.item = null;
}

/* the controller */
app.controller("MultiViewController", function($scope, $translate) {
        /*
        Controller for multiview, which contains and controls the subviews
        */
        var multi_view = this;
        // Row of columns containing subview ids
        this.columns = [
            ];
        var create_item = function() {
            /*
            Create a new item and give it the id that the corresponding subview
            will get when angular creates the subview controller.
            */
            var id = peek_next_id();
            return {
                id: id,
                html_id: "ItemView"+id,
            };
        }
        this.add_column = function() {
            /*
            Adds a new column of subviews with initially a single item. Column
            id is the id of its initial item.
            */
            var item = create_item();
            multi_view.columns.push({
                    items: [
                        item
                    ],
                    id: item.id,
                    html_id: "Column" + item.id,
                });
        };
        this.add_item = function(column_i) {
            /*
            Adds a new item to an existing column
            */
            multi_view.columns[column_i].items.push(create_item());
        };
        this.find_item_position = function(item) {
            /*
            Finds a position of an item.
            */
            for(var i = 0; i < this.columns.length; i++)
                for(var j = 0; j < this.columns[i].items.length; j++)
                    if(this.columns[i].items[j].id == item.id)
                        return [i, j];
            return null;
        };
        this.resize_vertical = function(item) {
            /*
            Starts the vertical resize, in which case the affected subviews are
            on top of each other.
            */
            var pos = this.find_item_position(item);
            if(pos === null)
                throw Exception("trying to resize non-existent subview");
            if(pos[1] == 0)
                throw Exception("trying to resize top subview");
            var against = this.columns[pos[0]].items[pos[1]-1];
            start_resize(item, against, "vertical");
        };
        this.resize_horizontal = function(column) {
            /*
            Starts the horizontal resize, where we resize column widths.
            */
            var index = this.columns.indexOf(column);
            var against = this.columns[index - 1];
            start_resize(column, against, "horizontal");
        };
        this._close_item = function(column_i, item_i) {
            /*
            must be called from close by id
            */
            console.warn("close "+column_i+","+item_i);
            if(multi_view.columns[column_i].items.length == 1) {
                multi_view._close_column(column_i);
                return;
            }
            multi_view.columns[column_i].items.splice(item_i, 1);
        };
        this.close_item_by_id = function(id) {
            /*
            Closes the item with the given id.
            */
            // preclose the item
            for(var i = 0; i < item_views.length; i++) {
                if(item_views[i].id == id)
                    item_views[i].preclose();
            }
            // close the item
            for(var i = 0; i < this.columns.length; i++) {
                for(var j = 0; j < this.columns[i].items.length; j++) {
                    if(this.columns[i].items[j].id == id) {
                        this._close_item(i, j);
                        return;
                    }
                }
            }
        };
        this._close_column = function(column_i) {
            /*
            must be called from close by id or _close_item
            */
            console.warn("close "+column_i+",*");
            multi_view.columns.splice(column_i, 1);
            if(multi_view.columns.length == 0) {
                multi_view.add_column();
            }
        };
        this.close_column_by_id = function(id) {
            /*
            Closes a whole column of items.
            */
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
                    this._close_column(i);
                }
            }
        };


        // adds an initial column to the multiview
        this.add_column();
    });


