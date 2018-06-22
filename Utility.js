(function(global) {

  global.Oj = global.Oj || {} ;
  var Oj = global.Oj;

  // todo: print something for nulls 
  Oj.DataFrame.prototype.print = function(rows) {
    if (typeof rows == 'undefined' || rows === 0) rows = this.length;
    console.log(this.columns.join('\t'));
    for(let i=0; i < rows ; i++) {
      console.log(this.getRow(i).join('\t'));
    }
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


} (this));

var Oj = Oj || this.Oj ;
