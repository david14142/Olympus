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

  // walk the primary key of the summary dataset
  Oj.PivotTable.prototype.table = function(id) {
    var div = Oj.getElementById(id);
    var table = div.push('table');
    var row;
    this.walk (this.summary.indices.primary.root,
      (group, key, value) => {
        if (group.length <= this.row_dimension.length) {
          row = table.push('tr')
          row.push('td', '', group.toString());
        } else {
          if (value[Symbol.toStringTag] != 'Map') {
            for (let j=0; j < this.summary.columns.length; j++) {
              row.push('td', '', this.summary.data[this.summary.columns[j]][value].toString());
            }
          }
        }
      }
    );
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

  // link an element or list of elements into a method chain
  Oj.Chain = function(element) {
    this.isOj = true;
    // create an empty chain
    if (typeof element === 'undefined') return this;
    let type = Oj.nodeType(element);
    // with node lists or HTML collections return an array-like collection
    if (type === 0) {
      this.l = [];
      for (let i=0 ; i < element.length; i++) {
        this.l[i] = new Oj.Chain(element[i]);
      }
      return this;
    }
    // for elements just return a single link
    if (type === 1) {
      this.e = element;
      return this;
    }
    else return null;
  }

  // push a new element onto a chain; allows method chaining
  Oj.Chain.prototype.push = function(name, attributes, text) {
    // handles arrays by allowing a map-like pushing of identical elements
    if (this.isOj === true && typeof this.l != 'undefined') {
      var n = new Oj.Chain();
      n.l=[];
      if(typeof text === 'string' && text !== '') {
        for(let i=0; i < this.l.length; i++) {
          n.l.push(this.l[i].push(name, attributes, text));
        }
      }
      if(Array.isArray(text)) {
        for(let i=0; i < this.l.length; i++) {
          n.l.push(this.l[i].push(name, attributes, text[i]));
        }
      }
      return n;
    }
    // else just push a single element
    else {
      var e = this.e.appendChild(document.createElement(name));
      if(typeof attributes === 'object') for (a in attributes) e.setAttribute(a, attributes[a]);
      if(typeof text === 'string' && text !== '') e.appendChild(document.createTextNode(text));
      if(typeof text !== 'undefined' && typeof text.nodeType !== 'undefined' && text.nodeType === 1 ) c.appendChild(text);
      return new Oj.Chain(e);
    }
  }

  Oj.Chain.prototype.clear = function () {
    this.e.innerHTML = null;
  }

  Oj.getElementsByClassName = function(name) {
    var n = document.getElementsByClassName(name);
    return new Oj.Chain(n);
  }

  Oj.getElementById = function(name) {
    var e  =  document.getElementById(name);
    return new Oj.Chain(e);
  }

  Oj.nodeType = function(node) {
    if (['[object NodeList]','[object HTMLCollection]'].includes(node.toString())) return 0;
    return node.nodeType;
  }

} (this));

var Oj = Oj || this.Oj ;
