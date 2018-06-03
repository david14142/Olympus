

(function(global) {

  global.Oj = global.Oj || {} ;
  var Oj = global.Oj;

  // constructor ;
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
    for(j=0; j < frame.columns.length; j++) {
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
    for(j=0; j < columns.length; j++) {
      let column = columns[j];
      if (typeof this.data[column] == 'undefined') {
        this.columns.push(column);
        this.data[column]=[];
      }
      this.data[column][this.length] = row[column];
    }
    this.length++;
  }

  Oj.DataFrame.prototype.insert = function(row, index) {
    var columns = Object.keys(row);
    for(j=0; j < columns.length; j++) {
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

  // Fetches a row from a frame based on primary key values. Not the same as
  // where or scan
  Oj.DataFrame.prototype.find = function(group) {
    let i = this.indices.primary.find(group);
    let row =  Object.create(null);
    for (j=0; j < this.columns.length; j++) {
      let column = this.columns[j];
      row[column] = this.data[column][i];
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

  Oj.DataFrame.prototype.print = function(index) {
    if (typeof index == 'undefined') var index=this.indices.primary;
    console.log(index.columns.join('\t') + '\t' + this.columns.join('\t'));
    this.walkTree(index.root,
      (group, key, value) => {
        if (value[Symbol.toStringTag] != 'Map') {
          console.log(group.join('\t') + '\t' + this.getRow(value).join('\t'));
        }
      }
    );
  }

  Oj.DataFrame.prototype.groupBy = function(columns, expression) {
    var result = new Oj.DataFrame({});
    result.indices.primary = new Oj.tree();
    var row = Object.create(null);
    var group = Object.create(null);

    for(let i=0; i < this.length ; i++) {
      for (let j=0; j < this.columns.length; j++) {
        let column = this.columns[j];
        row[column] = this.data[column][i];
      }
      for (j=0; j < columns.length; j++) {
        group[columns[j]] = row[columns[j]];
      }

      let item = Oj.aggregate(expression)(result.find(group), row);

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
  Oj.tree = function() {
    this.root = new Map();
  }

  // checks for the location of a group, or adds a new one,
  // returns the index value
  Oj.tree.prototype.add = function(group, index) {
    this.columns = Object.keys(group).sort();
    var node = this.root;
    for (j=0; j < this.columns.length - 1; j++) {
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

  Oj.tree.prototype.find = function(group) {
    // If the columns in the group are not the same as in the tree this may
    // return invalid data.  So don't so that.
    var columns = Object.keys(group).sort();
    var node = this.root;
    for (j=0; j < columns.length -1; j++) {
      let column = columns[j];
      let next = node.get(group[column]);
      if (typeof next == 'undefined') return undefined;
      node = next;
    }
    return node.get(group[columns[columns.length-1]]);
  }

  Oj.sum = function(column) {
    var sum = function(results, row) {
      return (results || 0) + row[column]
    };
    return sum;
  }

  Oj.count = function(column) {
    var count = function(results, row) {
      return (results || 0) + 1
    };
    return count;
  }

  // Used by group-by to call a series of reduce functions on a row of data
  Oj.aggregate = function(expression) {
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
