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

// Merge.js - Merge datasets together

(function(global) {

  global.Oj = global.Oj || {} ;
  var Oj = global.Oj;

  Oj.DataFrame.prototype.merge = function(right_frame, left_index, right_index) {

    var rv;
    let lookup = Object.create(null);
    let left_tree = this.indices[left_index] || this.indices.primary;
    let right_tree = right_frame.indices[right_index] || right_frame.indices.primary;

    // walk the left frame index
    this.walk(left_tree.root,
        (group, key, value) => {

          // construct a right frame match to each left frame index value
          if (value[Symbol.toStringTag] != 'Map') {
            for(let j=0; j < right_tree.columns.length; j++) {
              lookup[left_tree.columns[j]] = group[j];
            }
            let right_rows = right_tree.find(lookup);

            // for M:1 (including 1:1) return the original frame.
            // for M:N return a new frame.
            if (typeof right_rows == 'object' && Array.isArray(right_rows)) {

              rv = rv || (() => {
                let d = new Oj.DataFrame();
                for (let j=0; j < this.columns.length; j++) {
                  d.data[this.columns[j]] = [];
                }
                // placeholders for right columns added to the left frame
                for (let j=0; j < right_frame.columns.length; j++) {
                  if (typeof d.data[right_frame.columns[j]] == 'undefined') {
                    d.data[right_frame.columns[j]] = [];
                  }
                }
                d.columns = Object.keys(d.data);
                return d;
              })();

              // inner loop (1:N)
              if (typeof value == 'number') {
                for (let n=0; n < right_rows.length; n++) {
                  for (let j=0; j < this.columns.length; j++) {
                    let col = this.columns[j];
                    rv.data[col][rv.length] = this.data[col][value];
                  }
                  for (let j=0; j < right_frame.columns.length; j++) {
                    let col = right_frame.columns[j];
                    rv.data[col][rv.length] = right_frame.data[col][right_rows[n]];
                  }
                  rv.length++;
                }
              } else if (typeof value == 'object' && Array.isArray(value)) {
              // nested loop (M:N)
                for (let i=0; i < value.length; i++) {
                  for (let n=0; n < right_rows.length; n++) {
                    for (let j=0; j < this.columns.length; j++) {
                      let col = this.columns[j];
                      rv.data[col][rv.length] = this.data[col][value[i]];
                    }
                    for (let j=0; j < right_frame.columns.length; j++) {
                      let col = right_frame.columns[j];
                      rv.data[col][rv.length] = right_frame.data[col][right_rows[n]];
                    }
                    rv.length++;
                  }
                }
              }

            } else if (typeof right_rows == 'number') {
              rv = rv || (() => {
                let d = this;
                // placeholders for right columns added to the left frame
                for (let j=0; j < right_frame.columns.length; j++) {
                  if (typeof d.data[right_frame.columns[j]] == 'undefined') {
                    d.data[right_frame.columns[j]] = [];
                  }
                }
                d.columns = Object.keys(d.data);
                return d;
              })();

              // inner loop (1:1)
              if (typeof value == 'number') {
                for (let j=0; j < right_frame.columns.length; j++) {
                  let col = right_frame.columns[j];
                  this.data[col][value] = right_frame.data[col][right_rows]
                }
              } else if (typeof value == 'object' && Array.isArray(value)) {
                // inner loop (M:1)
                for(let i=0; i < value.length; i++) {
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

    return rv;
  }



} (this));

var Oj = Oj || this.Oj ;
