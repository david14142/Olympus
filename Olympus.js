
// Core functionality - DataFrame and Index structures.


(function(global) {

  global.Oj = global.Oj || {} ;
  var Oj = global.Oj;

  // DataFrame constructor
  Oj.DataFrame = function(data) {
    this.columns = Object.keys(data);
    this.indices = {};
    this.data = data;
    if (this.columns.length > 0) {
      let longest = this.columns.reduce((r, d) => this.data[r].length > this.data[d].length ? r : d, this.columns[0]);
      this.length = this.data[longest].length;
    } else {
      this.length = 0;
    }
  }

  // links columns to a DataFrame
  Oj.DataFrame.prototype.append = function(frame) {
    for(let j=0; j < frame.columns.length; j++) {
      let column = frame.columns[j];
      if (!this.columns.includes(column)) {
        this.columns.push(column)
        this.data[column] = frame.data[column];
      }
    }
    return this;
  }

  // push a row of data onto the bottom of the dataframe
  Oj.DataFrame.prototype.push = function(row) {
    var columns = Object.keys(row);
    for(let j=0; j < columns.length; j++) {
      let column = columns[j];
      if (typeof this.data[column] == 'undefined') {
        this.columns.push(column);
        this.data[column]=[];
      }
      this.data[column][this.length] = row[column];
    }
    this.length++;
  }

  // insert() replaces a row of data.  Additional columns are added as needed.
  Oj.DataFrame.prototype.insert = function(row, index) {
    if (index > this.length) this.length = index;
    var columns = Object.keys(row);
    for(let j=0; j < columns.length; j++) {
      let column = columns[j];
      if (typeof this.data[column] == 'undefined') {
        this.columns.push(column);
        this.data[column]=[];
      }
      this.data[column][index] = row[column];
    }
  }

  Oj.DataFrame.prototype.map = function(callback, append) {
    var row;
    var dataset = new Oj.DataFrame({});
    for(let i=0; i < this.length ; i++) {
      row =  Object.create(null);
      for (let j=0; j < this.columns.length; j++) {
        let column = this.columns[j];
        row[column] = this.data[column][i];
      }
      dataset.push(callback(row, i));
    }
    if (typeof append == 'undefined' || append === true) {
      this.append(dataset);
      return this;
    } else {
      return dataset;
    }
  }

  // reduce() differs from fold in that the callback function takes the result
  // datafrane as its accumulator, and returns a key/value pair.  It is more
  // flexible but more difficult to use than the aggregate function.
  Oj.DataFrame.prototype.reduce = function(callback) {
    var result = new Oj.DataFrame({});
    result.indices.primary = new Oj.tree();
    var row = Object.create(null);
    for(let i=0; i < this.length ; i++) {
      for (let j=0; j < this.columns.length; j++) {
        let column = this.columns[j];
        row[column] = this.data[column][i];
      }
      let reduced = callback(result, row);
      // Add the result as part of the frame data if the key already exists
      // returns index, otherwise inserts new key
      let index = result.indices.primary.add(reduced.key, result.length);
      if (index !== result.length) {
        result.insert(reduced.values, index);
      } else {
        result.push(reduced.values);
      }
    }
    return result;
  }

  // Fetches row(s) from a frame based on key/values. Not the same as
  // where or scan
  Oj.DataFrame.prototype.find = function(group, name) {
    let index = this.indices[name] || this.indices.primary;
    let i = index.find(group);
    let row =  Object.create(null);
    for (let j=0; j < this.columns.length; j++) {
      let column = this.columns[j];
      if (typeof i == 'number') {
        row[column] = this.data[column][i];
      }
    }
    return row;
  }

  Oj.DataFrame.prototype.getRow = function(i) {
    var row = [];
    for (let j=0; j < this.columns.length; j++) {
      let column = this.columns[j];
      row.push(this.data[column][i]);
    }
    return row;
  }

  Oj.DataFrame.prototype.walkTree = function(node, callback, group) {
    if (typeof group == 'undefined') var group = [];
    for (const [key, value] of node) {
      let g = group.concat([key]);
      callback(g, key, value);
      if (value[Symbol.toStringTag] == 'Map') {
        this.walkTree(value, callback, g);
      }
    }
  }

  Oj.DataFrame.prototype.index = function(name, columns, unique) {
    this.indices[name] = new tree();
    let rv = true;
    if (typeof unique == 'undefined') unique = false;
    let group = Object.create(null);
    for (let i=0; i < this.length ; i++) {
      for(let j=0; j < columns.length; j++) {
        group[columns[j]] = this.data[columns[j]][i];
      }
      rv = this.indices[name].insert(group, i, unique);
    }
    return rv;
  }

  // surface an index - mostly useful for aggregate results to surface the
  // primary key (turn it into columns)
  Oj.DataFrame.prototype.surface  = function(name) {
    let tree = this.indices[name] || this.indices.primary;
    for (let j=0; j < tree.columns.length; j++) {
      this.data[tree.columns[j]] = [];
    }
    this.columns = Object.keys(this.data);
    this.walkTree(tree.root,
      (group, key, value) => {
        if (typeof value == 'number') {
          for(let j=0; j < group.length; j++) {
            this.data[tree.columns[j]][value] = group[j];
          }
        } else if (typeof value == 'object' && Array.isArray(value)) {
          for (let i=0; i < value.length; i++) {
            for (let j=0; j < group.length; j++) {
              this.data[tree.columns[j]][value[i]] = group[j];
            }
          }
        }
      }
    );
    return this;
  }

  // aggregate() executes multiple callback functions on subsets (groups) of
  // data.  The group is specified as a list (array) of column names (which
  // must) be valid identifiers.  The callback functions are passed as a
  // collection of functions they take a scalar accumulator and row of data.
  Oj.DataFrame.prototype.aggregate = function(columns, expression) {
    var result = new Oj.DataFrame({});
    result.indices.primary = new tree();
    var row = Object.create(null);
    var group = Object.create(null);
    for(let i=0; i < this.length ; i++) {
      for (let j=0; j < this.columns.length; j++) {
        let column = this.columns[j];
        row[column] = this.data[column][i];
      }
      for (let j=0; j < columns.length; j++) {
        group[columns[j]] = row[columns[j]];
      }
      let item = aggregate(expression)(result.find(group), row);
      // Add the result as part of the frame data if the key already exists
      // returns index, otherwise inserts new key
      let index = result.indices.primary.add(group, result.length);
      if (index !== result.length) {
        result.insert(item, index);
      } else {
        result.push(item);
      }
    }
    return result;
  }

  // forms the basis of indexes for dataframes
  let tree = function() {
    this.root = new Map();
  }

  // checks for the location of a group, or adds a new one,
  // returns the index value
  tree.prototype.add = function(group, index) {
    this.columns = Object.keys(group).sort();
    var node = this.root;
    for (let j=0; j < this.columns.length - 1; j++) {
      let column = this.columns[j];
      let next = node.get(group[column]);
      if (typeof next == 'undefined') {
        next = new Map();
        node.set(group[column], next);
      }
      node = next ;
    }
    let rv = node.get(group[this.columns[this.columns.length-1]]);
    if (typeof rv == 'undefined') {
      node.set(group[this.columns[this.columns.length-1]], index);
      rv = index;
    }
    return rv;
  }

  tree.prototype.find = function(group) {
    // If the columns in the group are not the same as in the tree this may
    // return invalid data.  So don't so that.
    var columns = Object.keys(group).sort();
    var node = this.root;
    for (let j=0; j < columns.length -1; j++) {
      let column = columns[j];
      let next = node.get(group[column]);
      if (typeof next == 'undefined') return undefined;
      node = next;
    }
    return node.get(group[columns[columns.length-1]]);
  }

  tree.prototype.insert = function(group, index, unique) {
    this.columns = Object.keys(group).sort();
    var node = this.root;
    for (let j=0; j < this.columns.length - 1; j++) {
      let column = this.columns[j];
      let next = node.get(group[column]);
      if (typeof next == 'undefined') {
        next = new Map();
        node.set(group[column], next);
      }
      node = next ;
    }
    var rows = node.get(group[this.columns[this.columns.length-1]]);
    if (typeof rows == 'undefined') {
      rows = [index];
      node.set(group[this.columns[this.columns.length-1]], rows);
      return true;
    } else {
      if (unique === true) {
        return false ;
      } else {
        rows.push(index)
        node.set(group[this.columns[this.columns.length-1]], rows);
        return true;
      }
    }
  }


  // Used by group-by to call a series of reduce functions on a row of data
  // this is a private function, not to be confused with Oj.aggregate
  let aggregate = function(expression) {
    var aggregate = function (results, row) {
      var item = Object.create(null);
      for (e in expression) {
        item[e] = expression[e](results[e], row);
      }
      return item;
    }
    return aggregate;
  }


} (this));

var Oj = Oj || this.Oj ;
