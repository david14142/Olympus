(function(global) {

  global.Oj = global.Oj || {} ;
  var Oj = global.Oj;

  Oj.DataFrame.prototype.merge = function(right_frame, left_index, right_index) {

    let lookup = Object.create(null);
    let left_tree = this.indices[left_index] || this.indices.primary;
    let right_tree = right_frame.indices[right_index] || right_frame.indices.primary;

    // placeholders for right columns added to the left frame
    for (let j=0; j < right_frame.columns.length; j++) {
      if (typeof this.data[right_frame.columns[j]] == 'undefined') {
        this.data[right_frame.columns[j]] = [];
      }
      this.columns = Object.keys(this.data);
    }

    // walk the left frame index
    this.walkTree(left_tree.root,
        (group, key, value) => {

          // construct a right frame match to each left frame index value
          if (value[Symbol.toStringTag] != 'Map') {
            for(let j=0; j < right_tree.columns.length; j++) {
              lookup[left_tree.columns[j]] = group[j];
            }
            let right_rows = right_tree.find(lookup);

            if (typeof value == 'number') {
              if (typeof right_rows == 'number') {
                for (let j=0; j < right_frame.columns.length; j++) {
                  let col = right_frame.columns[j];
                  this.data[col][value] = right_frame.data[col][right_rows]
                }
              }

            } else if (typeof value == 'object' && Array.isArray(value)) {
              for(let i=0; i < value.length; i++) {
                if (typeof right_rows == 'number') {
                  for (let j=0; j < right_frame.columns.length; j++) {
                    let col = right_frame.columns[j];
                    this.data[col][value[i]] = right_frame.data[col][right_rows]
                  }
                }
              }
            }


          }



        }
      );
  }



} (this));

var Oj = Oj || this.Oj ;
