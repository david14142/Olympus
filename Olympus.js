
// Core functionality - DataFrame and Index structures.

(function(global) {

  global.Oj = global.Oj || {} ;
  var Oj = global.Oj;

  // DataFrame constructor
  Oj.DataFrame = function(data) {
    data = data || Object.create(null);
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
    var dataset = new Oj.DataFrame();
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
    var result = new Oj.DataFrame();
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
      // need to handle i being an array ;
    }
    return row;
  }

  Oj.DataFrame.prototype.getRow = function(i) {
    var row = [];
    for (let j=0; j < this.columns.length; j++) {
      let column = this.columns[j];
      row.push(this.data[column][i] || null);
    }
    return row;
  }

  // walks out an index, calling callback on each node.
  // (group is passed to each subsequent call)
  Oj.DataFrame.prototype.walk = function(node, callback, group) {
    if (typeof group == 'undefined') var group = [];
    for (const [key, value] of node) {
      let g = group.concat([key]);
      callback(g, key, value);
      if (value[Symbol.toStringTag] == 'Map') {
        this.walk(value, callback, g);
      }
    }
  }

  // breadth first traversal
  Oj.DataFrame.prototype.breadth = function(node, callback, group) {
    if (typeof group == 'undefined') var group = [];
    for (const [key, value] of node) {
      let g = group.concat([key]);
      callback(g, key, value);
    }
    for (const [key, value] of node) {
      let g = group.concat([key]);
      if (value[Symbol.toStringTag] == 'Map') {
        this.walk(value, callback, g);
      }
    }
  }

  // Traverse an index in sorted order.
  // todo : sort different columns differently
  Oj.DataFrame.prototype.sort = function(node, callback, group) {
    if (typeof group == 'undefined') var group = [];
    let keys = [];
    for (const k of node.keys()) {
      keys.push(k);
    }
    keys.sort();
    for(let k=0; k < keys.length; k++) {
      let g = group.concat(keys[k]);
      let v = node.get(keys[k]);
      callback(g, keys[k], v);
      if (v[Symbol.toStringTag] == 'Map') {
        this.walk(v, callback, g);
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

  // creates a sorting index.  Differs from index() in the treatment of multi-column
  // indexes: order() treats age/sex differently from sex/age
  Oj.DataFrame.prototype.order = function(name, columns, unique) {
    this.indices[name] = new order(columns);
    let rv = true;
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
  Oj.DataFrame.prototype.surface  = function(name, rename) {
    let tree = this.indices[name] || this.indices.primary;
    rename = rename || tree.columns;
    if (rename.length < tree.columns.length) rename = tree.columns;
    for (let j=0; j < rename.length; j++) {
      this.data[rename[j]] = [];
    }
    this.columns = Object.keys(this.data);
    this.walk(tree.root,
      (group, key, value) => {
        if (typeof value == 'number') {
          for(let j=0; j < group.length; j++) {
            this.data[rename[j]][value] = group[j];
          }
        } else if (typeof value == 'object' && Array.isArray(value)) {
          for (let i=0; i < value.length; i++) {
            for (let j=0; j < group.length; j++) {
              this.data[rename[j]][value[i]] = group[j];
            }
          }
        }
      }
    );
    return this;
  }

  // traverse a primary index and re-order the results (creates an order)
  Oj.DataFrame.prototype.reorder = function(name, reorder) {
    let tree =  this.indices.primary;
    this.indices[name] = new order(reorder);
    // re-arrange the group ;
    let arrange = [];
    for (let j=0; j < reorder.length; j++) {
      arrange.push(this.indices.primary.columns.indexOf(reorder[j]));
    }
    //this.walk(tree.root,
    this.sort(tree.root,
      (group, key, value) => {
        if (typeof value != 'object') {
          let regroup = Object.create(null);
          for(let j=0; j < arrange.length; j++) {
            regroup[reorder[j]] = group[arrange[j]];
          }
          this.indices[name].insert(regroup, value);
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
    var result = new Oj.DataFrame();
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

  // used when building non-primary indexes
  tree.prototype.insert = function(group, index, unique) {
    // move this so it isn't added on each insert
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

  // ordered indexes - used for sorting et al.
  let order = function(columns) {
    this.root = new Map();
    this.columns = columns;
  }

  // same as tree insert, but columns aren't ordered
  order.prototype.insert = function(group, index, nodupes) {
    //this.columns = Object.keys(group);
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
      if (typeof nodupes == 'undefined' || nodupes == false) {
        if (typeof index == 'number') {
          rows.push(index)
        } else {
          rows = rows.concat(index)
        }
        node.set(group[this.columns[this.columns.length-1]], rows);
      }
      return true;
    }
  }

  // note that group is an array, not a collection
  order.prototype.find = function(group) {
    // If the columns in the group are not the same as in the tree this may
    // return invalid data.  So don't so that.
    var node = this.root;
    for (let j=0; j < group.length; j++) {
      let column = group[j];
      let next = node.get(column);
      if (typeof next == 'undefined') return undefined;
      node = next;
    }
    return node;
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

  Oj.PivotTable = class extends Oj.DataFrame {
    constructor (data, expression, dimensions) {
      super(data);
      if (typeof expression == 'object') this.expression = expression;
      if (typeof dimensions == 'object'
          && typeof dimensions.rows != 'undefined'
          && typeof dimensions.columns != 'undefined')  {
        this.dimension(dimension.rows, dimension.columns);
      }
    }
  }

  // Build an n-dimensional summary (a kind of cube) of the data.
  // Dimensions is an arrar of arrays.  Each array is a list of fields
  // that belong to the same dimension
  Oj.PivotTable.prototype.dimension = function(dimensions) {
    this.dimensions = dimensions;
    let crosstab = [];
    for (let d=0; d < dimensions.length; d++) {
      crosstab = crosstab.concat(dimensions[d]);
    }
    this.summary = this.aggregate(crosstab, this.expression);
    this.summary.reorder('pivot-order', crosstab);
    // create a margin (a summary) for every dimension ;
    this.margins = [];
    let group = Object.create(null);
    for (let d=0; d < dimensions.length; d++) {
      this.margins[d] = this.aggregate(dimensions[d], this.expression);
      this.margins[d].reorder('pivot-order', dimensions[d]);
    }
    return this;
  }

  Oj.PivotTable.prototype.traverse = function(callback) {
    var pivot = this;
    let traverse = function(margin, crossing) {
      pivot.sort(pivot.margins[margin].indices['pivot-order'].root,
        (group, key, value) => {
          let g = crossing.concat(group);
          let v = pivot.summary.indices['pivot-order'].find(g) || null;
          callback(g, group[group.length - 1], v);
          if (value[Symbol.toStringTag] != 'Map') {
            if (margin < pivot.dimensions.length - 1) {
              traverse(margin + 1, g);
            }
          }
        }
      );
    }
    traverse(0, []);
  }

} (this));

var Oj = Oj || this.Oj ;
