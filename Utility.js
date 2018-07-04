// Olympus
//
// JavaScript functions to facilitate multivariate summaries of data
//
// Copyright (C) 2018 David Schreiber <davidschr@gmail.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// Utility.js - Text and HTML output, utility summmary functions

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

  // produce a cross tabulation from a 2-d summary of data
  Oj.PivotTable.prototype.table = function(id) {
    var div = Oj.getElementById(id);
    var table = div.push('table');
    var row;
    let row_nest_option = true;
    // add a header to the table ;
    let head = table.push('thead');
    let hrows = [];
    for (let j=0; j < this.dimensions[1].length; j++) {
      hrows[j] = head.push('tr');
      hrows[j].push('th', {colspan: this.dimensions[0].length});
    }
    this.breadth(this.margins[1].indices['pivot-order'].root,
      (group, key, value, leaves) => {
        if (value[Symbol.toStringTag] != 'Map') {
          hrows[group.length-1].push('th', '', key.toString());
        } else {
          hrows[group.length-1].push('th', {colspan: leaves}, key.toString());
        }
      }
    );
    // add the table body ;
    let body = table.push('tbody');
    let h = [];
    this.traverse(
      (group, key, value, leaves, order) => {
        // row headings
        if (row_nest_option === true) {
          if (group.length < this.dimensions[0].length) {
            h.push(Oj.createElement('th', {rowspan: leaves }, key.toString()))
          }
          if (group.length === this.dimensions[0].length) {
            row = body.push('tr');
            for (let i=0; i < h.length; i++) {
              row.appendChild(h[i]);
            }
            row.push('th', '', key.toString());
            h = [];
          }
        } else {
          if (group.length == this.dimensions[0].length) {
            row = body.push('tr');
            for (let j=0; j < group.length; j++) {
              row.push('th', '', group[j]);
            }
          }
        }
        // table interior
        if (value[Symbol.toStringTag] != 'Map') {
          for (let j=0; j < this.summary.columns.length; j++) {
            row.push('td', '', this.summary.data[this.summary.columns[j]][value].toString());
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

  // todo: re-write this to extend element rather than wrap it
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

  Oj.createElement = function(name, attributes, text) {
    var e  = document.createElement(name);
    if(typeof attributes === 'object') for (a in attributes) e.setAttribute(a, attributes[a]);
    if(typeof text === 'string' && text !== '') e.appendChild(document.createTextNode(text));
    return e;
  }

  Oj.Chain.prototype.appendChild = function(element) {
    var e = this.e.appendChild(element);
    return new Oj.Chain(e);
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
