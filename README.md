# Olympus.js

JavaScript functions to facilitate multivariate summaries of data.

## Introduction

The Olympus libraries allow summarisation of multivariate data
in a browser using only JavaScript. &nbsp;  

The aim is to support fast and efficient **cross tabulation &amp; pivoting**
of moderate amounts of data without relying on either server side or
desktop software.  A typical use case would be to produce a CSV or JSON file
from a database and have multiple dynamic tables produced in the browser
with a minimum (~3-4 lines) of code.

## Example

http://david14142.github.io/new_zealand_population_demo.html


# Use

*Warning - this project is a prototype.  There may be bugs, and the internal
structure and methods of the library **will** change.*

*This documentation is incomplete: merging, sorting,
filtering and indexing still require coverage.*

## JavaScript files

Olympus is intended to be used in a browser.  (It might work in Node.js
  &ndash; but if you have a server, why not use MongoDB or
  CouchDB instead?)

The `Olympus.js` file must be included for basic functionality.
The `Utility.js` contains code to create HTML tables from
summary data, as well as some example reduction functions.  `Merge.js` contains code to join DataFrames.

The project has no external dependencies.

    <script src="Olympus.js"></script>
    <script src="Merge.js"></script>
    <script src="Utility.js"></script>

## Loading data

Olympus can load data read from JSON text files. &nbsp; Alternately,
third party libraries (such as jQuery-CSV) can read CSV files into
arrays and Olympus can convert these.

Typically you would load data with an XHR request.  Then, a table
is created with the data:

    fetch('data.json')
      .then(response => response.json())
      .then(json => {table = new Oj.DataFrame(json)});

### Pivot tables vs Frames

Olympus works with two related objects, a *data frame*, which is essentially
just a collection of arrays, and a *pivot table*, which includes data
summarised by various *dimensions*.  Pivot tables extend data frames - they
have additional methods for dealing with multidimensional data, and they store
summaries and margins.

Pivot tables can be created in much the same way as data frames.  In addition
to the data, they require specifying the *summarisation expressions*
and *dimensions* in order to function:

    pivot = new Oj.PivotTable(
      json,
      {Population: Oj.sum('Population')},
      [['Ethnicity','Sex'],['Year']]
      );

In this case we tell the pivot table to summarise population, using both
ethnicity as sex as rows, and the *values of* the year variable as columns.

### Displaying tables

Pivot tables can be displayed inside an html document using the `table()` method:

    <div id='table'>
    <script>  
      pivot.table({id: 'table'})
    </script>

## Mapping

Often data is not quite in the format you'd like it, and has to be cleaned
up and transformed.  Olympus allows 1:1 operation on rows of data by using
the `map()` method.  this method takes a callback function (the
  'mapper') and applies it to each row of data.  For example, this
  simple mapper takes a numeric age variable and groups it
into ten year bins.

    let mapper = function(row) {
      const group =  ['0-9','10-19','20-29','30-39','40-49','50-59','60-69','70-79','80-89','90+'];
      return {'Age Group': group[Math.floor(row['Age']/10)]}
    }

    new_table = table.map(mapper);

`PivotTable.map()` is similar to the native JavaScript `Array.map()`
function, but instead of operating with a single element the function is
applied to a whole row of data at a time.  For example the mapper
above expects a row containing an age variable (hence the
  `row['Age']` reference). The mapper is passed an object,
containing a single row of data, and is expected to return a similar object
containing a row of data.  The result of `PivotTable.map()` is a new
PivotTable containing the result of the mapper applied to every row.

## Aggregating

### Reduce

The second half of the map-reduce paradigm is to take mapped data and
reduce it to a smaller set of variables.  Olympus has a generic
reduce function that will reduce a table to a set of values.&nbsp; Like `Array.reduce()` it returns a single value by applying an
accumulator function.  `PivotTable.reduce()` can apply multiple
functions and return multiple values.  For example to calculate an average
we can sum a variable and divide by a count:

    let result = table.reduce({
        sum: (sum, row) => (sum || 0) + row['Age'],
        n: n => (n || 0) + 1
      });
    let average = result.sum / result.n;

### Aggregate

Reduce can only return a single set of values.  Cross tabulation requires
that we perform aggregation by groups of values &ndash; groups defined by
sets of other variables.  Olympus supports such aggregation using
the `aggregate()` method.  The aggregate method accepts an array
of variables that define the groups, as well as the reduction function(s).

    summary = table.aggregate(['Age Group','Sex'], {
        sum: (sum, row) => (sum || 0) + row['Age'],
        n: n => (n || 0) + 1
      });

The result is a new table that contains the results of the
reduction function for each group.  By default the group variables are
not added to the table as columns &ndash; instead they form an
index structure that can be used to traverse the data. If needed,
the groups can be added as columns using the `surface()` method.

### Cross-tabulation

Cross-tabulation (or Pivoting) is the raison d'être of Olympus.  

Cross-tabulation involves forming a crossing of two or more *dimensions*,
with each dimension being defined by one or more categorical
variables.  Olympus handles the necessary summarisation and ordering
of the data and the creation of an HTML table within the document with
a few lines of code.

A typical cross-tabulation might look something like this:

    pivot = new Oj.PivotTable(json, {'Sales': Oj.sum('Sales')});
    pivot.dimension(['State','City'],['Year']);
    pivot.table({id: 'anchor'});

This will create a PivotTable object summarise it using the supplied
expression (i.e. a sum of the sales column) into groups defined by State,
City, and Year; and then create an HTML table inside the element with the
'anchor' id.

# Internals

*To be completed*

## Data

Olympus works with data stored internally as a *collection of named
arrays*. &nbsp; Each array is a column of data.  These are
native JavaScript arrays - values in the arrays can be strings or
numbers. &nbsp; (Objects, Arrays and Maps are not supported and will
  likely cause unpredictable effects).


    {
      "YEAR": [1996,2001,2006,2013,1996,2001,2006,2013,1996,2001,2006,2013, ...
      "Sex": ["Male","Male","Male","Male","Female","Female","Female", ...
      "ETHNICGROUP": ["EUROTHER","EUROTHER","EUROTHER","EUROTHER","EUROTHER", ...
      "Age":["0 Years","0 Years","0 Years","0 Years","0 Years","0 Years", ...
    }

## Index structures

Index structures are key to the ability to aggregate data into groups, as well
as display data in sorted order, and joining (merging).  Olympus uses two types
of indexes, both tree-like structures based on recursively linked JavaScript
`Map` objects.

Each level of the tree structure corresponds to a variable in the index.  The
top level of the tree is a single node (a `Map`).  Each key in this node is a
value of the first variable in the index.  Every entry points to a another node,
in the second layer of the tree, and so on.  At the last layer, the entries in
the node point to row(s) in the data.

Index structures are important to the `aggregate` and `dimension` methods
&ndash; they allow the reducers to efficiently access accumulated results for
numerous groups.

### Walking indexes



### Surfacing indexes

By default the `aggregate` and `dimension` methods do not "surface" the values
of their group variables.  For example, when aggregating 'population', by the
dimensions 'age' and 'sex', the 'age', and 'sex' variables are not added to
the summary data structure.  Instead, they are only present in the indexes.  

This does not affect internal operations, such as tabulating or merging data.
However, when viewing data (e.g. in the console), it can be useful to 'surface'
an index.  The `surface()` method adds the entries of the indexes as columns in
the data frame.
