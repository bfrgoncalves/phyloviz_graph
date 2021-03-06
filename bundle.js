(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var phyloviz_graph = require('phyloviz_bundle');
var random_profiles = require('profile_generator');

var options = {
	profile_length: 10, //default 7
	number_of_profiles: 300, //default 10
	min: 1, //default 1
	max: 4, //default 7
	distribution: 'poisson' //default "normal"
}

var input = {
	name: "datasetName",
	key:"ST",
	data_type: "profile",
	profiles: null,
	schemegenes: null,
	metadata: ['ST','From'],
	isolates: [{'ST': 1, 'From': 'Japan'}, {'ST': 2, 'From': 'Portugal'}, {'ST': 3, 'From': 'USA'}, {'ST': 4, 'From': 'Spain'}],
	newick: undefined,
	linkMethod: 'isolates',
	propertyIndex: 1 //From
}

var canvasID = 'testDiv';
var phylovizObject = {};

random_profiles(options, function(profileData){
	input.profiles = profileData.profiles;
	input.schemegenes = profileData.schemegenes;
	phyloviz_graph(input, canvasID, function(graphObject){
			phylovizObject = graphObject;
			console.log(graphObject);
	});
});



},{"phyloviz_bundle":2,"profile_generator":101}],2:[function(require,module,exports){
var goeBURST = require('goeBURST');
var phylovizInput = require('phyloviz_input');
var build_graph = require('phyloviz_graph');
var phyloviz_link = require('phyloviz_metadata_link');


function phyloviz_graph(graph, canvasID, callback){

	checkForDuplicateProfiles(graph.profiles, graph.schemegenes, function(profileArray, identifiers){
		goeBURST(profileArray, identifiers, "prim", function(links, distanceMatrix){
			graph.links = links;
			graph.distanceMatrix = distanceMatrix;
			graph.positions = {};

			phylovizInput(graph, function(graphInput){
				build_graph(graphInput, canvasID, function(graphObject){
					graphObject.linkMethod = graph.linkMethod;
					graphObject.propertyIndex = graph.propertyIndex;
					phyloviz_link(graphObject, function(graphData){
						callback(graphData);
					});
				});
			});
		
		});
	});
	
}

function checkForDuplicateProfiles(profiles, schemeGenes, callback){

		var identifiers = {};
		var countProfiles = 0;
		var profileArray = [];
		
		var existsProfile = {};
		
		profiles.forEach(function(profile){
			var arr = [];
			for (i in schemeGenes) arr.push(profile[schemeGenes[i]]);
			//var arr = Object.keys(profile).map(function(k) { return profile[k] });
			var identifier = arr.shift();
			//arr.reverse();
			
			if(existsProfile[String(arr)]) {
				console.log('Profile already exists');
				//console.log(identifier);
			}
			
			else{
				existsProfile[String(arr)] = true;
				identifiers[countProfiles] = identifier;
				countProfiles += 1; 
				profileArray.push(arr);

			}
		});

		callback(profileArray, identifiers);

}

module.exports = phyloviz_graph;
},{"goeBURST":6,"phyloviz_graph":15,"phyloviz_input":80,"phyloviz_metadata_link":86}],3:[function(require,module,exports){

function goeBURST_algorithm(profileArray, identifiers, type, callback){
	
	if (type == 'krustal'){
		var algorithm = require('./krustal');
	}
	else{
		var algorithm = require('./prim');
	}

	algorithm(profileArray, identifiers, function(links, distanceMatrix){
        callback(links, distanceMatrix);
    });
}

module.exports = goeBURST_algorithm;
},{"./krustal":4,"./prim":5}],4:[function(require,module,exports){
var unionfind = require('union-find');
var hamming = require('compute-hamming');

function goeBURST_krustal(profiles, identifiers, callback) {
  
  var lvs = profiles.map(function(x){
    return x.map(function(x){return 0;});
  });

  var edges = [];

  for (var i = 0; i < profiles.length-1; i++) {
    for (var j = i+1; j < profiles.length; j++) {
      var diff = hamming(profiles[i], profiles[j]) - 1;
      lvs[i][diff] ++;
      lvs[j][diff] ++;

      edges.push([i, j]);
    }
  }
  var countComp = 0;

  function edgecmp(e, f) {
    countComp +=1;
    
    //console.log(countComp);
    var elevel = hamming(profiles[e[0]], profiles[e[1]]);
    var flevel = hamming(profiles[f[0]], profiles[f[1]]);
    var n = lvs[e[0]].length;

    if (elevel != flevel)
      return elevel - flevel;

    for (var l = 0; l < n; l++) {
      maxe = Math.max(lvs[e[0]][l], lvs[e[1]][l]);
      maxf = Math.max(lvs[f[0]][l], lvs[f[1]][l]);

      if (maxe != maxf)
        return maxf - maxe;

      mine = Math.min(lvs[e[0]][l], lvs[e[1]][l]);
      minf = Math.min(lvs[f[0]][l], lvs[f[1]][l]);

      if (mine != minf)
        return minf - mine;
    }

    maxe = Math.max(e[0], e[1]);
    maxf = Math.max(f[0], f[1]);

    if (maxe != maxf)
      return maxe - maxf;

    mine = Math.min(e[0], e[1]);
    minf = Math.min(f[0], f[1]);

    return minf - mine;
  }

  edges.sort(edgecmp);

  tree = [];
  values = [];

  var sets = new unionfind(profiles.length);

  for (var k = 0; k < edges.length && tree.length < profiles.length - 1; k++) {
    if (sets.find(edges[k][0]) != sets.find(edges[k][1])) {
      
      sets.link(edges[k][0], edges[k][1]);

      var value = hamming(profiles[edges[k][0]], profiles[edges[k][1]]);
      tree.push({source: identifiers[edges[k][0]], target: identifiers[edges[k][1]], value: value});

    }
  }

  callback(tree);
}

module.exports = goeBURST_krustal;
},{"compute-hamming":7,"union-find":13}],5:[function(require,module,exports){
var unionfind = require('union-find')
var heap = require('heap');

function hamming(p, q) {
  var res = 0;
  for (var i = 0; i < p.length; i++)
    if (p[i] != q[i])
      res = res + 1;
  return res;
}

function goeBURST_prim(profiles, identifiers, callback) {
  var lvs = profiles.map(function(x){
    return x.map(function(x){return 0;});
  });
 
  var pi = [];
  var color =[];
  var hammingValues= {};

  var distanceMatrix = [];

  //profiles.map(function(x){
  //  return profiles.map(function(y){return 0;});
  //});

  for (var i = 0; i < profiles.length; i++)
    color[i] = 0;

  for (var i = 0; i < profiles.length-1; i++) {
    distanceMatrix.push([0]);
    for (var j = i+1; j < profiles.length; j++) {
      var diff = hamming(profiles[i], profiles[j]) - 1;
      distanceMatrix[i].push(diff);
      lvs[i][diff] ++;
      lvs[j][diff] ++;
    }
  }

  tree = [];
  var pqueue = new heap(function(a, b) {
    return edgecmp(pi[a], pi[b]);
  });
  pqueue.push(0);
  color[0] = 1;

  while (! pqueue.empty()) {
    var u = pqueue.pop();
    color[u] = 2;
    if (u != 0){
      tree.push({source: identifiers[pi[u][0]], target: identifiers[pi[u][1]], value: hamming(profiles[pi[u][0]], profiles[pi[u][1]])});
    }

    for (var v = 0; v < profiles.length; v++) {

      if (color[v] == 0) {
        color[v] = 1;
        pi[v] = [u,v];
        pqueue.push(v);
      } else if (color[v] == 1 && edgecmp([u,v], pi[v]) < 0) {
        pi[v] = [u,v];
        pqueue.updateItem(v);
      }
    }
  }

  function edgecmp(e, f) {
    var elevel = hamming(profiles[e[0]], profiles[e[1]]);
    var flevel = hamming(profiles[f[0]], profiles[f[1]]);
    var n = lvs[e[0]].length;

    if (elevel != flevel)
      return elevel - flevel;

    for (var l = 0; l < n; l++) {
      maxe = Math.max(lvs[e[0]][l], lvs[e[1]][l]);
      maxf = Math.max(lvs[f[0]][l], lvs[f[1]][l]);

      if (maxe != maxf)
        return maxf - maxe;

      mine = Math.min(lvs[e[0]][l], lvs[e[1]][l]);
      minf = Math.min(lvs[f[0]][l], lvs[f[1]][l]);

      if (mine != minf)
        return minf - mine;
    }

    maxe = Math.max(e[0], e[1]);
    maxf = Math.max(f[0], f[1]);

    if (maxe != maxf)
      return maxe - maxf;

    mine = Math.min(e[0], e[1]);
    minf = Math.min(f[0], f[1]);

    return minf - mine;
  }
  callback(tree, distanceMatrix);
}

module.exports = goeBURST_prim;
},{"heap":11,"union-find":13}],6:[function(require,module,exports){

module.exports = require('./algorithms');
},{"./algorithms":3}],7:[function(require,module,exports){
'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isString = require( 'validate.io-string' ),
	isFunction = require( 'validate.io-function' );


// HAMMING DISTANCE //

/**
* FUNCTION: hamming( a, b, accessor )
*	Computes the Hamming distance between two sequences.
*
* @param {String|Array} a - array or string sequence
* @param {String|Array} b - array or string sequence
* @param {Function} [accessor] - accessor function for accessing array values
* @returns {Number} Hamming distance
*/
function hamming( a, b, clbk ) {
	var aType = isString( a ),
		bType = isString( b ),
		len,
		d, i;

	if ( !isArray( a ) && !aType ) {
		throw new TypeError( 'hamming()::invalid input argument. Sequence must be either an array or a string. Value: `' + a + '`.' );
	}
	if ( !isArray( b ) && !bType ) {
		throw new TypeError( 'hamming()::invalid input argument. Sequence must be either an array or a string. Value: `' + b + '`.' );
	}
	if ( aType !== bType ) {
		throw new TypeError( 'hamming()::invalid input arguments. Sequences must be the same type; i.e., both strings or both arrays.' );
	}
	if ( arguments.length > 2 ) {
		if ( !isFunction( clbk ) ) {
			throw new TypeError( 'hamming()::invalid input argument. Accessor must be a function. Value: `' + clbk + '`.' );
		}
	}
	len = a.length;
	if ( len !== b.length ) {
		throw new Error( 'hamming()::invalid input arguments. Sequences must be the same length.' );
	}
	d = 0;
	if ( clbk ) {
		for ( i = 0; i < len; i++ ) {
			if ( clbk( a[i], i, 0 ) !== clbk( b[i], i, 1 ) ) {
				d += 1;
			}
		}
	} else {
		for ( i = 0; i < len; i++ ) {
			if ( a[ i ] !== b[ i ] ) {
				d += 1;
			}
		}
	}
	return d;
} // end FUNCTION hamming()


// EXPORTS //

module.exports = hamming;

},{"validate.io-array":8,"validate.io-function":9,"validate.io-string":10}],8:[function(require,module,exports){
'use strict';

/**
* FUNCTION: isArray( value )
*	Validates if a value is an array.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is an array
*/
function isArray( value ) {
	return Object.prototype.toString.call( value ) === '[object Array]';
} // end FUNCTION isArray()

// EXPORTS //

module.exports = Array.isArray || isArray;

},{}],9:[function(require,module,exports){
/**
*
*	VALIDATE: function
*
*
*	DESCRIPTION:
*		- Validates if a value is a function.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isFunction( value )
*	Validates if a value is a function.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a function
*/
function isFunction( value ) {
	return ( typeof value === 'function' );
} // end FUNCTION isFunction()


// EXPORTS //

module.exports = isFunction;

},{}],10:[function(require,module,exports){
/**
*
*	VALIDATE: string
*
*
*	DESCRIPTION:
*		- Validates if a value is a string.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isString( value )
*	Validates if a value is a string.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a string
*/
function isString( value ) {
	return typeof value === 'string' || Object.prototype.toString.call( value ) === '[object String]';
} // end FUNCTION isString()


// EXPORTS //

module.exports = isString;

},{}],11:[function(require,module,exports){
module.exports = require('./lib/heap');

},{"./lib/heap":12}],12:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;


  /*
  Default comparison function to be used
   */

  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };


  /*
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
   */

  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };


  /*
  Push item onto heap, maintaining the heap invariant.
   */

  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };


  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
   */

  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };


  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
   */

  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };


  /*
  Fast version of a heappush followed by a heappop.
   */

  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };


  /*
  Transform list into a heap, in-place, in O(array.length) time.
   */

  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };


  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
   */

  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };


  /*
  Find the n largest elements in a dataset.
   */

  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };


  /*
  Find the n smallest elements in a dataset.
   */

  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.updateItem = updateItem;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define([], factory);
    } else if (typeof exports === 'object') {
      return module.exports = factory();
    } else {
      return root.Heap = factory();
    }
  })(this, function() {
    return Heap;
  });

}).call(this);

},{}],13:[function(require,module,exports){
"use strict"; "use restrict";

module.exports = UnionFind;

function UnionFind(count) {
  this.roots = new Array(count);
  this.ranks = new Array(count);
  
  for(var i=0; i<count; ++i) {
    this.roots[i] = i;
    this.ranks[i] = 0;
  }
}

var proto = UnionFind.prototype

Object.defineProperty(proto, "length", {
  "get": function() {
    return this.roots.length
  }
})

proto.makeSet = function() {
  var n = this.roots.length;
  this.roots.push(n);
  this.ranks.push(0);
  return n;
}

proto.find = function(x) {
  var x0 = x
  var roots = this.roots;
  while(roots[x] !== x) {
    x = roots[x]
  }
  while(roots[x0] !== x) {
    var y = roots[x0]
    roots[x0] = x
    x0 = y
  }
  return x;
}

proto.link = function(x, y) {
  var xr = this.find(x)
    , yr = this.find(y);
  if(xr === yr) {
    return;
  }
  var ranks = this.ranks
    , roots = this.roots
    , xd    = ranks[xr]
    , yd    = ranks[yr];
  if(xd < yd) {
    roots[xr] = yr;
  } else if(yd < xd) {
    roots[yr] = xr;
  } else {
    roots[yr] = xr;
    ++ranks[xr];
  }
}
},{}],14:[function(require,module,exports){
function loadGraphFunctions(){

	var VivaGraph = require('vivagraphjs');
	var renderFunc = require('./pieNodeWebGl.js');
	var startMultiSelect = require('./multiSelection.js');
	var renderFunctions = renderFunc.graphRenderingFunctions();

	function restoreLinkSearch(graphObject){

		var toRemove = graphObject.toRemove;
		var graphics = graphObject.graphics;
		var nodesToCheckLinks = graphObject.nodesToCheckLinks;
		var renderer = graphObject.renderer;

		if (toRemove != ""){
			var nodeUI = graphics.getNodeUI(toRemove.id);
			nodeUI.colorIndexes = nodeUI.backupColor;

		}
		for (i in nodesToCheckLinks){
			var nodeUI = graphics.getNodeUI(nodesToCheckLinks[i].id);
			nodeUI.colorIndexes = nodeUI.backupColor; 
		}

		if(graphObject.isLayoutPaused){
	        renderer.resume();
	        setTimeout(function(){ renderer.pause();}, 5);
	      }
	}

	return {
		init: function(graphObject){

			var graph = graphObject.graphInput;
			var graphGL = graphObject.graphGL;

			var maxLinkValue = 0;
			var countAddedNodes = 0;
			
			for (i in graph.nodes){
		        graph.nodes[i].idGL = countAddedNodes;
		        graphGL.addNode(graph.nodes[i].key, graph.nodes[i]);
		        countAddedNodes++;
		    }

		    for (j in graph.links){
		        if (maxLinkValue < graph.links[j].value) maxLinkValue = graph.links[j].value;
			    graphGL.addLink(graph.links[j].source, graph.links[j].target, { connectionStrength: graph.links[j].value , value: graph.links[j].value, color: "#000"});
		    }

		    var treeLinks = {};

		    graphGL.forEachLink(function(link) { treeLinks[link.id] = true; });

		    maxLinkValue += 1;

		    graphObject.maxLinkValue = maxLinkValue;

		    graphObject.treeLinks = treeLinks;
		    graphObject.isLogScale = false;

		    graphObject.assignQuadrant = renderFunc.assignQuadrant;
		    graphObject.getDataPercentage = renderFunc.getDataPercentage;
		},

		initLayout: function(graphObject){

			var idealSpringLength = 1;
			var graphGL = graphObject.graphGL;

			graphObject.layout = VivaGraph.Graph.Layout.forceDirected(graphGL, {
						    	    springLength : idealSpringLength,
						    	    springCoeff : 0.0001,
						    	    dragCoeff : 0.01,
						    	    gravity : -10,
						    	    theta: 0.8,

							          // This is the main part of this example. We are telling force directed
							          // layout, that we want to change length of each physical spring
							          // by overriding `springTransform` method:
							          springTransform: function (link, spring) {
							            spring.length = idealSpringLength * link.data.connectionStrength;
							          }
						      	});
		},

		initGraphics: function(graphObject){

			var graphicsOptions = {
	          clearColor: true, // we want to avoid rendering artifacts
	          clearColorValue: { // use black color to erase background
	            r: 255,
	            g: 255,
	            b: 255,
	            a: 1
	          }
	        };

			graphObject.graphics = VivaGraph.Graph.View.webglGraphics(graphicsOptions);
			var graphics = graphObject.graphics;

			var circleNode = renderFunctions.buildCircleNodeShader();
	        graphics.setNodeProgram(circleNode);

	        var DefaultnodeSize = graphObject.DefaultnodeSize;
	        var nodeColor = graphObject.nodeColor;


	        graphics.node(function (node) {
	          //console.log(node);
	          if (node.id.search('TransitionNode') > -1) sizeToUse = 5;
	          else sizeToUse = DefaultnodeSize+node.data.isolates.length;
	          return new renderFunctions.WebglCircle(sizeToUse, nodeColor, [1], [nodeColor], null);
	        });

	        graphics.link(function(link) {
	          return VivaGraph.Graph.View.webglLine(link.data.color, link.id);
	        });

		},

		initRenderer: function(graphObject){

			var graphGL = graphObject.graphGL;

			graphObject.renderer = VivaGraph.Graph.View.renderer(graphGL,
              {
                  container  : document.getElementById( graphObject.container ),
                  layout : graphObject.layout,
                  graphics : graphObject.graphics

              });

        	graphObject.renderer.run();

		},

		setPositions: function(graphObject){

			var graph = graphObject.graphInput;
			var layout = graphObject.layout;

			//console.log(graph);

			if (Object.keys(graph.positions).length > 0){
		        for (nodeLocation in graph.positions.nodes[0]){
		          var nodeX = graph.positions.nodes[0][nodeLocation][0].x;
		          var nodeY = graph.positions.nodes[0][nodeLocation][0].y;
		          layout.setNodePosition(nodeLocation, nodeX, nodeY);
		        }
		      }
		},

		precompute: function myself(graphObject, iterations, callback) { //define name inside function to be able to call it from inside

			var layout = graphObject.layout;
	        // let's run 10 iterations per event loop cycle:
	        var i = 0;
	        while (iterations > 0 && i < 1) {
	          layout.step();
	          iterations--;
	          i++;
	        }
	        //$('#processingElement').children().remove();

	        if (iterations > 0) {
	          setTimeout(function () {
	              myself(graphObject,iterations, callback);
	          }, 0); // keep going in next even cycle
	        } else {
	          // we are done!
	          //$('#processingElement').children().remove();

    		  layout.simulator.dragCoeff(30 * 0.0001);
	          
	          callback();
	        }
        }	

	}
}

module.exports = loadGraphFunctions;


},{"./multiSelection.js":16,"./pieNodeWebGl.js":79,"vivagraphjs":78}],15:[function(require,module,exports){
var VivaGraph = require('vivagraphjs');
var graphFunc = require('./graphFunctions.js');

function constructGraph(graph, canvasID, callback){

  var graphObject = {

          graphInput: graph, //phyloviz input format
          graphGL: VivaGraph.Graph.graph(), //graph format used by Vivagraph
          nodeColor: 0x009ee8, //default nodeColor for the application
          DefaultnodeSize: 25, //default node size for the application
          datasetID: null, //id of the dataset
          width: null, //canvas width
          height: null, //canvas height
          prevSplitTreeValue: 0, //prev value used in splitTree method
          prevNLVvalue: 0, //prev value used in NLV graph method
          addedLinks: {}, //links added when we use NLV graph
          removedLinks: {}, //links removed when we use SplitTree
          container: canvasID

    }


  var graphFunctions = graphFunc();  //Functions to be applied to the graphObject object. graphFunctions.js

  graphFunctions.init(graphObject);
  graphFunctions.initLayout(graphObject);
  graphFunctions.initGraphics(graphObject);
  graphFunctions.initRenderer(graphObject);
  //graphFunctions.generateDOMLabels(graphObject);
  //graphFunctions.adjustScale(graphObject);

  callback(graphObject);
   
}

module.exports = constructGraph;
},{"./graphFunctions.js":14,"vivagraphjs":78}],16:[function(require,module,exports){

function startMultiSelect(graphObject) {

  var graph = graphObject.graphGL;
  var renderer = graphObject.renderer;
  var selectedNodes = graphObject.selectedNodes;
  var layout = graphObject.layout;

  var graphics = renderer.getGraphics();
  var domOverlay = document.querySelector('.graph-overlay');
  var overlay = createOverlay(domOverlay);
  overlay.onAreaSelected(handleAreaSelected);

  return overlay;

  function handleAreaSelected(area) {
    // For the sake of this demo we are using silly O(n) implementation.
    // Could be improved with spatial indexing if required.
    var topLeft = graphics.transformClientToGraphCoordinates({
      x: area.x,
      y: area.y
    });

    var bottomRight = graphics.transformClientToGraphCoordinates({
      x: area.x + area.width,
      y: area.y + area.height
    });

    selectedNodes = [];

    graph.forEachNode(higlightIfInside);
    //renderer.rerender();

    return;

    function higlightIfInside(node) {
      var nodeUI = graphics.getNodeUI(node.id);
      if (isInside(node.id, topLeft, bottomRight)) {

        var newColors = [];

        for (i in nodeUI.colorIndexes){
          var colorsPerQuadrant = [];
          for (j in nodeUI.colorIndexes[i]) colorsPerQuadrant.push(0xFFA500ff);
          newColors.push(colorsPerQuadrant);
        }
        nodeUI.colorIndexes = newColors;
      } else {
        nodeUI.colorIndexes = nodeUI.backupColor;
        //nodeUI.size = nodeUI.backupSize;
      }
      if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 5);
      }
    }

    function isInside(nodeId, topLeft, bottomRight) {
      var nodePos = layout.getNodePosition(nodeId);
      return (topLeft.x < nodePos.x && nodePos.x < bottomRight.x &&
        topLeft.y < nodePos.y && nodePos.y < bottomRight.y);
    }
  }
}

function createOverlay(overlayDom) {
  var selectionClasName = 'graph-selection-indicator';
  var selectionIndicator = overlayDom.querySelector('.' + selectionClasName);
  if (!selectionIndicator) {
    selectionIndicator = document.createElement('div');
    selectionIndicator.className = selectionClasName;
    overlayDom.appendChild(selectionIndicator);
  }

  var notify = [];
  var dragndrop = Viva.Graph.Utils.dragndrop(overlayDom);
  var selectedArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  var startX = 0;
  var startY = 0;

  dragndrop.onStart(function(e) {
    startX = selectedArea.x = e.layerX;
    startY = selectedArea.y = e.layerY;
    selectedArea.width = selectedArea.height = 0;

    updateSelectedAreaIndicator();
    selectionIndicator.style.display = 'block';
  });

  dragndrop.onDrag(function(e) {
    recalculateSelectedArea(e);
    updateSelectedAreaIndicator();
    notifyAreaSelected();
  });

  dragndrop.onStop(function() {
    selectionIndicator.style.display = 'none';
  });

  overlayDom.style.display = 'block';

  return {
    onAreaSelected: function(cb) {
      notify.push(cb);
    },
    destroy: function () {
      overlayDom.style.display = 'none';
      dragndrop.release();
    }
  };

  function notifyAreaSelected() {
    notify.forEach(function(cb) {
      cb(selectedArea);
    });
  }

  function recalculateSelectedArea(e) {
    selectedArea.width = Math.abs(e.clientX - startX);
    selectedArea.height = Math.abs(e.clientY  - startY);
    selectedArea.x = Math.min(e.clientX , startX);
    selectedArea.y = Math.min(e.clientY, startY);
  }

  function updateSelectedAreaIndicator() {
    selectionIndicator.style.left = selectedArea.x + 'px';
    selectionIndicator.style.top = selectedArea.y + 'px';
    selectionIndicator.style.width = selectedArea.width + 'px';
    selectionIndicator.style.height = selectedArea.height + 'px';
  }
}

module.exports = startMultiSelect;
},{}],17:[function(require,module,exports){
module.exports = intersect;

/**
 * Original authors: Mukesh Prasad, Appeared in Graphics Gem II book
 * http://www.opensource.apple.com/source/graphviz/graphviz-498/graphviz/dynagraph/common/xlines.c
 * and adopted to javascript version by Andrei Kashcha.
 *
 * This function computes whether two line segments,
 * respectively joining the input points (x1,y1) -- (x2,y2)
 * and the input points (x3,y3) -- (x4,y4) intersect.
 * If the lines intersect, the output variables x, y are
 * set to coordinates of the point of intersection.
 *
 * @param {Number} x1 First line segment coordinates
 * @param {Number} y1 First line segment coordinates
 * @param {Number} x2 First line segment coordinates
 * @param {Number} x2 First line segment coordinates
 *
 * @param {Number} x3 Second line segment coordinates
 * @param {Number} y3 Second line segment coordinates
 * @param {Number} x4 Second line segment coordinates
 * @param {Number} x4 Second line segment coordinates
 *
 * @return {Object} x, y coordinates of intersection point or falsy value if no
 * intersection found..
 */
function intersect(
  x1, y1, x2, y2, // first line segment
  x3, y3, x4, y4  // second line segment
) {

  var a1, a2, b1, b2, c1, c2, /* Coefficients of line eqns. */
    r1, r2, r3, r4, /* 'Sign' values */
    denom, offset, num, /* Intermediate values */
    result = {
      x: 0,
      y: 0
    };

  /* Compute a1, b1, c1, where line joining points 1 and 2
   * is "a1 x  +  b1 y  +  c1  =  0".
   */
  a1 = y2 - y1;
  b1 = x1 - x2;
  c1 = x2 * y1 - x1 * y2;

  /* Compute r3 and r4.
   */
  r3 = a1 * x3 + b1 * y3 + c1;
  r4 = a1 * x4 + b1 * y4 + c1;

  /* Check signs of r3 and r4.  If both point 3 and point 4 lie on
   * same side of line 1, the line segments do not intersect.
   */

  if (r3 !== 0 && r4 !== 0 && ((r3 >= 0) === (r4 >= 4))) {
    return null; //no intersection.
  }

  /* Compute a2, b2, c2 */
  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = x4 * y3 - x3 * y4;

  /* Compute r1 and r2 */

  r1 = a2 * x1 + b2 * y1 + c2;
  r2 = a2 * x2 + b2 * y2 + c2;

  /* Check signs of r1 and r2.  If both point 1 and point 2 lie
   * on same side of second line segment, the line segments do
   * not intersect.
   */
  if (r1 !== 0 && r2 !== 0 && ((r1 >= 0) === (r2 >= 0))) {
    return null; // no intersection;
  }
  /* Line segments intersect: compute intersection point.
   */

  denom = a1 * b2 - a2 * b1;
  if (denom === 0) {
    return null; // Actually collinear..
  }

  offset = denom < 0 ? -denom / 2 : denom / 2;
  offset = 0.0;

  /* The denom/2 is to get rounding instead of truncating.  It
   * is added or subtracted to the numerator, depending upon the
   * sign of the numerator.
   */
  num = b1 * c2 - b2 * c1;
  result.x = (num < 0 ? num - offset : num + offset) / denom;

  num = a2 * c1 - a1 * c2;
  result.y = (num < 0 ? num - offset : num + offset) / denom;

  return result;
}

},{}],18:[function(require,module,exports){
module.exports.degree = require('./src/degree.js');
module.exports.betweenness = require('./src/betweenness.js');

},{"./src/betweenness.js":19,"./src/degree.js":20}],19:[function(require,module,exports){
module.exports = betweennes;

/**
 * I'm using http://www.inf.uni-konstanz.de/algo/publications/b-vspbc-08.pdf
 * as a reference for this implementation
 */
function betweennes(graph, oriented) {
  var Q = [],
    S = []; // Queue and Stack
  // list of predcessors on shorteest paths from source
  var pred = Object.create(null);
  // distance from source
  var dist = Object.create(null);
  // number of shortest paths from source to key
  var sigma = Object.create(null);
  // dependency of source on key
  var delta = Object.create(null);

  var currentNode;
  var centrality = Object.create(null);

  graph.forEachNode(setCentralityToZero);
  graph.forEachNode(calculateCentrality);

  if (!oriented) {
    // The centrality scores need to be divided by two if the graph is not oriented,
    // since all shortest paths are considered twice
    Object.keys(centrality).forEach(divideByTwo);
  }

  return centrality;

  function divideByTwo(key) {
    centrality[key] /= 2;
  }

  function setCentralityToZero(node) {
    centrality[node.id] = 0;
  }

  function calculateCentrality(node) {
    currentNode = node.id;
    singleSourceShortestPath(currentNode);
    accumulate();
  }

  function accumulate() {
    graph.forEachNode(setDeltaToZero);
    while (S.length) {
      var w = S.pop();
      var coeff = (1 + delta[w])/sigma[w];
      var predcessors = pred[w];
      for (var idx = 0; idx < predcessors.length; ++idx) {
        var v = predcessors[idx];
        delta[v] += sigma[v] * coeff;
      }
      if (w !== currentNode) {
        centrality[w] += delta[w];
      }
    }
  }

  function setDeltaToZero(node) {
    delta[node.id] = 0;
  }

  function singleSourceShortestPath(source) {
    graph.forEachNode(initNode);
    dist[source] = 0;
    sigma[source] = 1;
    Q.push(source);

    while (Q.length) {
      var v = Q.shift();
      var dedup = Object.create(null);
      S.push(v);
      graph.forEachLinkedNode(v, toId, oriented);
    }

    function toId(otherNode) {
      // NOTE: This code will also consider multi-edges, which are often
      // ignored by popular software (Gephi/NetworkX). Depending on your use
      // case this may not be desired and deduping needs to be performed. To
      // save memory I'm not deduping here...
      processNode(otherNode.id);
    }

    function initNode(node) {
      var nodeId = node.id;
      pred[nodeId] = []; // empty list
      dist[nodeId] = -1;
      sigma[nodeId] = 0;
    }

    function processNode(w) {
      // path discovery
      if (dist[w] === -1) {
        // Node w is found for the first time
        dist[w] = dist[v] + 1;
        Q.push(w);
      }
      // path counting
      if (dist[w] === dist[v] + 1) {
        // edge (v, w) on a shortest path
        sigma[w] += sigma[v];
        pred[w].push(v);
      }
    }
  }
}

},{}],20:[function(require,module,exports){
module.exports = degree;

/**
 * Calculates graph nodes degree centrality (in/out or both).
 *
 * @see http://en.wikipedia.org/wiki/Centrality#Degree_centrality
 *
 * @param {ngraph.graph} graph object for which we are calculating centrality.
 * @param {string} [kind=both] What kind of degree centrality needs to be calculated:
 *   'in'    - calculate in-degree centrality
 *   'out'   - calculate out-degree centrality
 *   'inout' - (default) generic degree centrality is calculated
 */
function degree(graph, kind) {
  var getNodeDegree,
    sortedDegrees = [],
    result = Object.create(null),
    nodeDegree;

  kind = (kind || 'both').toLowerCase();
  if (kind === 'both' || kind === 'inout') {
    getNodeDegree = inoutDegreeCalculator;
  } else if (kind === 'in') {
    getNodeDegree = inDegreeCalculator;
  } else if (kind === 'out') {
    getNodeDegree = outDegreeCalculator;
  } else {
    throw new Error('Expected centrality degree kind is: in, out or both');
  }

  graph.forEachNode(calculateNodeDegree);

  return result;

  function calculateNodeDegree(node) {
    var links = graph.getLinks(node.id);
    result[node.id] = getNodeDegree(links, node.id);
  }
}

function inDegreeCalculator(links, nodeId) {
  var total = 0;
  for (var i = 0; i < links.length; i += 1) {
    total += (links[i].toId === nodeId) ? 1 : 0;
  }
  return total;
}

function outDegreeCalculator(links, nodeId) {
  var total = 0;
  for (var i = 0; i < links.length; i += 1) {
    total += (links[i].fromId === nodeId) ? 1 : 0;
  }
  return total;
}

function inoutDegreeCalculator(links) {
  return links.length;
}

},{}],21:[function(require,module,exports){
module.exports = function(subject) {
  validateSubject(subject);

  var eventsStorage = createEventsStorage(subject);
  subject.on = eventsStorage.on;
  subject.off = eventsStorage.off;
  subject.fire = eventsStorage.fire;
  return subject;
};

function createEventsStorage(subject) {
  // Store all event listeners to this hash. Key is event name, value is array
  // of callback records.
  //
  // A callback record consists of callback function and its optional context:
  // { 'eventName' => [{callback: function, ctx: object}] }
  var registeredEvents = Object.create(null);

  return {
    on: function (eventName, callback, ctx) {
      if (typeof callback !== 'function') {
        throw new Error('callback is expected to be a function');
      }
      var handlers = registeredEvents[eventName];
      if (!handlers) {
        handlers = registeredEvents[eventName] = [];
      }
      handlers.push({callback: callback, ctx: ctx});

      return subject;
    },

    off: function (eventName, callback) {
      var wantToRemoveAll = (typeof eventName === 'undefined');
      if (wantToRemoveAll) {
        // Killing old events storage should be enough in this case:
        registeredEvents = Object.create(null);
        return subject;
      }

      if (registeredEvents[eventName]) {
        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
        if (deleteAllCallbacksForEvent) {
          delete registeredEvents[eventName];
        } else {
          var callbacks = registeredEvents[eventName];
          for (var i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].callback === callback) {
              callbacks.splice(i, 1);
            }
          }
        }
      }

      return subject;
    },

    fire: function (eventName) {
      var callbacks = registeredEvents[eventName];
      if (!callbacks) {
        return subject;
      }

      var fireArguments;
      if (arguments.length > 1) {
        fireArguments = Array.prototype.splice.call(arguments, 1);
      }
      for(var i = 0; i < callbacks.length; ++i) {
        var callbackInfo = callbacks[i];
        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
      }

      return subject;
    }
  };
}

function validateSubject(subject) {
  if (!subject) {
    throw new Error('Eventify cannot use falsy object as events subject');
  }
  var reservedWords = ['on', 'fire', 'off'];
  for (var i = 0; i < reservedWords.length; ++i) {
    if (subject.hasOwnProperty(reservedWords[i])) {
      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
    }
  }
}

},{}],22:[function(require,module,exports){
module.exports = createLayout;
module.exports.simulator = require('ngraph.physics.simulator');

/**
 * Creates force based layout for a given graph.
 * @param {ngraph.graph} graph which needs to be laid out
 * @param {object} physicsSettings if you need custom settings
 * for physics simulator you can pass your own settings here. If it's not passed
 * a default one will be created.
 */
function createLayout(graph, physicsSettings) {
  if (!graph) {
    throw new Error('Graph structure cannot be undefined');
  }

  var createSimulator = require('ngraph.physics.simulator');
  var physicsSimulator = createSimulator(physicsSettings);

  var nodeBodies = typeof Object.create === 'function' ? Object.create(null) : {};
  var springs = {};

  var springTransform = physicsSimulator.settings.springTransform || noop;

  // Initialize physical objects according to what we have in the graph:
  initPhysics();
  listenToGraphEvents();

  var api = {
    /**
     * Performs one step of iterative layout algorithm
     */
    step: function() {
      return physicsSimulator.step();
    },

    /**
     * For a given `nodeId` returns position
     */
    getNodePosition: function (nodeId) {
      return getInitializedBody(nodeId).pos;
    },

    /**
     * Sets position of a node to a given coordinates
     * @param {string} nodeId node identifier
     * @param {number} x position of a node
     * @param {number} y position of a node
     * @param {number=} z position of node (only if applicable to body)
     */
    setNodePosition: function (nodeId) {
      var body = getInitializedBody(nodeId);
      body.setPosition.apply(body, Array.prototype.slice.call(arguments, 1));
    },

    /**
     * @returns {Object} Link position by link id
     * @returns {Object.from} {x, y} coordinates of link start
     * @returns {Object.to} {x, y} coordinates of link end
     */
    getLinkPosition: function (linkId) {
      var spring = springs[linkId];
      if (spring) {
        return {
          from: spring.from.pos,
          to: spring.to.pos
        };
      }
    },

    /**
     * @returns {Object} area required to fit in the graph. Object contains
     * `x1`, `y1` - top left coordinates
     * `x2`, `y2` - bottom right coordinates
     */
    getGraphRect: function () {
      return physicsSimulator.getBBox();
    },

    /*
     * Requests layout algorithm to pin/unpin node to its current position
     * Pinned nodes should not be affected by layout algorithm and always
     * remain at their position
     */
    pinNode: function (node, isPinned) {
      var body = getInitializedBody(node.id);
       body.isPinned = !!isPinned;
    },

    /**
     * Checks whether given graph's node is currently pinned
     */
    isNodePinned: function (node) {
      return getInitializedBody(node.id).isPinned;
    },

    /**
     * Request to release all resources
     */
    dispose: function() {
      graph.off('changed', onGraphChanged);
    },

    /**
     * Gets physical body for a given node id. If node is not found undefined
     * value is returned.
     */
    getBody: getBody,

    /**
     * Gets spring for a given edge.
     *
     * @param {string} linkId link identifer. If two arguments are passed then
     * this argument is treated as formNodeId
     * @param {string=} toId when defined this parameter denotes head of the link
     * and first argument is trated as tail of the link (fromId)
     */
    getSpring: getSpring,

    /**
     * [Read only] Gets current physics simulator
     */
    simulator: physicsSimulator
  };

  return api;

  function getSpring(fromId, toId) {
    var linkId;
    if (toId === undefined) {
      if (typeof fromId === 'string') {
        // assume fromId as a linkId:
        linkId = fromId;
      } else {
        // assume fromId to be a link object:
        linkId = fromId.id;
      }
    } else {
      // toId is defined, should grab link:
      var link = graph.hasLink(fromId, toId);
      if (!link) return;
      linkId = link.id;
    }

    return springs[linkId];
  }

  function getBody(nodeId) {
    return nodeBodies[nodeId];
  }

  function listenToGraphEvents() {
    graph.on('changed', onGraphChanged);
  }

  function onGraphChanged(changes) {
    for (var i = 0; i < changes.length; ++i) {
      var change = changes[i];
      if (change.changeType === 'add') {
        if (change.node) {
          initBody(change.node.id);
        }
        if (change.link) {
          initLink(change.link);
        }
      } else if (change.changeType === 'remove') {
        if (change.node) {
          releaseNode(change.node);
        }
        if (change.link) {
          releaseLink(change.link);
        }
      }
    }
  }

  function initPhysics() {
    graph.forEachNode(function (node) {
      initBody(node.id);
    });
    graph.forEachLink(initLink);
  }

  function initBody(nodeId) {
    var body = nodeBodies[nodeId];
    if (!body) {
      var node = graph.getNode(nodeId);
      if (!node) {
        throw new Error('initBody() was called with unknown node id');
      }

      var pos = node.position;
      if (!pos) {
        var neighbors = getNeighborBodies(node);
        pos = physicsSimulator.getBestNewBodyPosition(neighbors);
      }

      body = physicsSimulator.addBodyAt(pos);

      nodeBodies[nodeId] = body;
      updateBodyMass(nodeId);

      if (isNodeOriginallyPinned(node)) {
        body.isPinned = true;
      }
    }
  }

  function releaseNode(node) {
    var nodeId = node.id;
    var body = nodeBodies[nodeId];
    if (body) {
      nodeBodies[nodeId] = null;
      delete nodeBodies[nodeId];

      physicsSimulator.removeBody(body);
    }
  }

  function initLink(link) {
    updateBodyMass(link.fromId);
    updateBodyMass(link.toId);

    var fromBody = nodeBodies[link.fromId],
        toBody  = nodeBodies[link.toId],
        spring = physicsSimulator.addSpring(fromBody, toBody, link.length);

    springTransform(link, spring);

    springs[link.id] = spring;
  }

  function releaseLink(link) {
    var spring = springs[link.id];
    if (spring) {
      var from = graph.getNode(link.fromId),
          to = graph.getNode(link.toId);

      if (from) updateBodyMass(from.id);
      if (to) updateBodyMass(to.id);

      delete springs[link.id];

      physicsSimulator.removeSpring(spring);
    }
  }

  function getNeighborBodies(node) {
    // TODO: Could probably be done better on memory
    var neighbors = [];
    if (!node.links) {
      return neighbors;
    }
    var maxNeighbors = Math.min(node.links.length, 2);
    for (var i = 0; i < maxNeighbors; ++i) {
      var link = node.links[i];
      var otherBody = link.fromId !== node.id ? nodeBodies[link.fromId] : nodeBodies[link.toId];
      if (otherBody && otherBody.pos) {
        neighbors.push(otherBody);
      }
    }

    return neighbors;
  }

  function updateBodyMass(nodeId) {
    var body = nodeBodies[nodeId];
    body.mass = nodeMass(nodeId);
  }

  /**
   * Checks whether graph node has in its settings pinned attribute,
   * which means layout algorithm cannot move it. Node can be preconfigured
   * as pinned, if it has "isPinned" attribute, or when node.data has it.
   *
   * @param {Object} node a graph node to check
   * @return {Boolean} true if node should be treated as pinned; false otherwise.
   */
  function isNodeOriginallyPinned(node) {
    return (node && (node.isPinned || (node.data && node.data.isPinned)));
  }

  function getInitializedBody(nodeId) {
    var body = nodeBodies[nodeId];
    if (!body) {
      initBody(nodeId);
      body = nodeBodies[nodeId];
    }
    return body;
  }

  /**
   * Calculates mass of a body, which corresponds to node with given id.
   *
   * @param {String|Number} nodeId identifier of a node, for which body mass needs to be calculated
   * @returns {Number} recommended mass of the body;
   */
  function nodeMass(nodeId) {
    return 1 + graph.getLinks(nodeId).length / 3.0;
  }
}

function noop() { }

},{"ngraph.physics.simulator":23}],23:[function(require,module,exports){
/**
 * Manages a simulation of physical forces acting on bodies and springs.
 */
module.exports = physicsSimulator;

function physicsSimulator(settings) {
  var Spring = require('./lib/spring');
  var expose = require('ngraph.expose');
  var merge = require('ngraph.merge');

  settings = merge(settings, {
      /**
       * Ideal length for links (springs in physical model).
       */
      springLength: 30,

      /**
       * Hook's law coefficient. 1 - solid spring.
       */
      springCoeff: 0.0008,

      /**
       * Coulomb's law coefficient. It's used to repel nodes thus should be negative
       * if you make it positive nodes start attract each other :).
       */
      gravity: -1.2,

      /**
       * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
       * The closer it's to 1 the more nodes algorithm will have to go through.
       * Setting it to one makes Barnes Hut simulation no different from
       * brute-force forces calculation (each node is considered).
       */
      theta: 0.8,

      /**
       * Drag force coefficient. Used to slow down system, thus should be less than 1.
       * The closer it is to 0 the less tight system will be.
       */
      dragCoeff: 0.02,

      /**
       * Default time step (dt) for forces integration
       */
      timeStep : 20,

      /**
        * Maximum movement of the system which can be considered as stabilized
        */
      stableThreshold: 0.009
  });

  // We allow clients to override basic factory methods:
  var createQuadTree = settings.createQuadTree || require('ngraph.quadtreebh');
  var createBounds = settings.createBounds || require('./lib/bounds');
  var createDragForce = settings.createDragForce || require('./lib/dragForce');
  var createSpringForce = settings.createSpringForce || require('./lib/springForce');
  var integrate = settings.integrator || require('./lib/eulerIntegrator');
  var createBody = settings.createBody || require('./lib/createBody');

  var bodies = [], // Bodies in this simulation.
      springs = [], // Springs in this simulation.
      quadTree =  createQuadTree(settings),
      bounds = createBounds(bodies, settings),
      springForce = createSpringForce(settings),
      dragForce = createDragForce(settings);

  var publicApi = {
    /**
     * Array of bodies, registered with current simulator
     *
     * Note: To add new body, use addBody() method. This property is only
     * exposed for testing/performance purposes.
     */
    bodies: bodies,

    /**
     * Array of springs, registered with current simulator
     *
     * Note: To add new spring, use addSpring() method. This property is only
     * exposed for testing/performance purposes.
     */
    springs: springs,

    /**
     * Returns settings with which current simulator was initialized
     */
    settings: settings,

    /**
     * Performs one step of force simulation.
     *
     * @returns {boolean} true if system is considered stable; False otherwise.
     */
    step: function () {
      accumulateForces();
      var totalMovement = integrate(bodies, settings.timeStep);

      bounds.update();

      return totalMovement < settings.stableThreshold;
    },

    /**
     * Adds body to the system
     *
     * @param {ngraph.physics.primitives.Body} body physical body
     *
     * @returns {ngraph.physics.primitives.Body} added body
     */
    addBody: function (body) {
      if (!body) {
        throw new Error('Body is required');
      }
      bodies.push(body);

      return body;
    },

    /**
     * Adds body to the system at given position
     *
     * @param {Object} pos position of a body
     *
     * @returns {ngraph.physics.primitives.Body} added body
     */
    addBodyAt: function (pos) {
      if (!pos) {
        throw new Error('Body position is required');
      }
      var body = createBody(pos);
      bodies.push(body);

      return body;
    },

    /**
     * Removes body from the system
     *
     * @param {ngraph.physics.primitives.Body} body to remove
     *
     * @returns {Boolean} true if body found and removed. falsy otherwise;
     */
    removeBody: function (body) {
      if (!body) { return; }

      var idx = bodies.indexOf(body);
      if (idx < 0) { return; }

      bodies.splice(idx, 1);
      if (bodies.length === 0) {
        bounds.reset();
      }
      return true;
    },

    /**
     * Adds a spring to this simulation.
     *
     * @returns {Object} - a handle for a spring. If you want to later remove
     * spring pass it to removeSpring() method.
     */
    addSpring: function (body1, body2, springLength, springWeight, springCoefficient) {
      if (!body1 || !body2) {
        throw new Error('Cannot add null spring to force simulator');
      }

      if (typeof springLength !== 'number') {
        springLength = -1; // assume global configuration
      }

      var spring = new Spring(body1, body2, springLength, springCoefficient >= 0 ? springCoefficient : -1, springWeight);
      springs.push(spring);

      // TODO: could mark simulator as dirty.
      return spring;
    },

    /**
     * Removes spring from the system
     *
     * @param {Object} spring to remove. Spring is an object returned by addSpring
     *
     * @returns {Boolean} true if spring found and removed. falsy otherwise;
     */
    removeSpring: function (spring) {
      if (!spring) { return; }
      var idx = springs.indexOf(spring);
      if (idx > -1) {
        springs.splice(idx, 1);
        return true;
      }
    },

    getBestNewBodyPosition: function (neighbors) {
      return bounds.getBestNewPosition(neighbors);
    },

    /**
     * Returns bounding box which covers all bodies
     */
    getBBox: function () {
      return bounds.box;
    },

    gravity: function (value) {
      if (value !== undefined) {
        settings.gravity = value;
        quadTree.options({gravity: value});
        return this;
      } else {
        return settings.gravity;
      }
    },

    theta: function (value) {
      if (value !== undefined) {
        settings.theta = value;
        quadTree.options({theta: value});
        return this;
      } else {
        return settings.theta;
      }
    }
  };

  // allow settings modification via public API:
  expose(settings, publicApi);

  return publicApi;

  function accumulateForces() {
    // Accumulate forces acting on bodies.
    var body,
        i = bodies.length;

    if (i) {
      // only add bodies if there the array is not empty:
      quadTree.insertBodies(bodies); // performance: O(n * log n)
      while (i--) {
        body = bodies[i];
        // If body is pinned there is no point updating its forces - it should
        // never move:
        if (!body.isPinned) {
          body.force.reset();

          quadTree.updateBodyForce(body);
          dragForce.update(body);
        }
      }
    }

    i = springs.length;
    while(i--) {
      springForce.update(springs[i]);
    }
  }
};

},{"./lib/bounds":24,"./lib/createBody":25,"./lib/dragForce":26,"./lib/eulerIntegrator":27,"./lib/spring":28,"./lib/springForce":29,"ngraph.expose":30,"ngraph.merge":39,"ngraph.quadtreebh":32}],24:[function(require,module,exports){
module.exports = function (bodies, settings) {
  var random = require('ngraph.random').random(42);
  var boundingBox =  { x1: 0, y1: 0, x2: 0, y2: 0 };

  return {
    box: boundingBox,

    update: updateBoundingBox,

    reset : function () {
      boundingBox.x1 = boundingBox.y1 = 0;
      boundingBox.x2 = boundingBox.y2 = 0;
    },

    getBestNewPosition: function (neighbors) {
      var graphRect = boundingBox;

      var baseX = 0, baseY = 0;

      if (neighbors.length) {
        for (var i = 0; i < neighbors.length; ++i) {
          baseX += neighbors[i].pos.x;
          baseY += neighbors[i].pos.y;
        }

        baseX /= neighbors.length;
        baseY /= neighbors.length;
      } else {
        baseX = (graphRect.x1 + graphRect.x2) / 2;
        baseY = (graphRect.y1 + graphRect.y2) / 2;
      }

      var springLength = settings.springLength;
      return {
        x: baseX + random.next(springLength) - springLength / 2,
        y: baseY + random.next(springLength) - springLength / 2
      };
    }
  };

  function updateBoundingBox() {
    var i = bodies.length;
    if (i === 0) { return; } // don't have to wory here.

    var x1 = Number.MAX_VALUE,
        y1 = Number.MAX_VALUE,
        x2 = Number.MIN_VALUE,
        y2 = Number.MIN_VALUE;

    while(i--) {
      // this is O(n), could it be done faster with quadtree?
      // how about pinned nodes?
      var body = bodies[i];
      if (body.isPinned) {
        body.pos.x = body.prevPos.x;
        body.pos.y = body.prevPos.y;
      } else {
        body.prevPos.x = body.pos.x;
        body.prevPos.y = body.pos.y;
      }
      if (body.pos.x < x1) {
        x1 = body.pos.x;
      }
      if (body.pos.x > x2) {
        x2 = body.pos.x;
      }
      if (body.pos.y < y1) {
        y1 = body.pos.y;
      }
      if (body.pos.y > y2) {
        y2 = body.pos.y;
      }
    }

    boundingBox.x1 = x1;
    boundingBox.x2 = x2;
    boundingBox.y1 = y1;
    boundingBox.y2 = y2;
  }
}

},{"ngraph.random":40}],25:[function(require,module,exports){
var physics = require('ngraph.physics.primitives');

module.exports = function(pos) {
  return new physics.Body(pos);
}

},{"ngraph.physics.primitives":31}],26:[function(require,module,exports){
/**
 * Represents drag force, which reduces force value on each step by given
 * coefficient.
 *
 * @param {Object} options for the drag force
 * @param {Number=} options.dragCoeff drag force coefficient. 0.1 by default
 */
module.exports = function (options) {
  var merge = require('ngraph.merge'),
      expose = require('ngraph.expose');

  options = merge(options, {
    dragCoeff: 0.02
  });

  var api = {
    update : function (body) {
      body.force.x -= options.dragCoeff * body.velocity.x;
      body.force.y -= options.dragCoeff * body.velocity.y;
    }
  };

  // let easy access to dragCoeff:
  expose(options, api, ['dragCoeff']);

  return api;
};

},{"ngraph.expose":30,"ngraph.merge":39}],27:[function(require,module,exports){
/**
 * Performs forces integration, using given timestep. Uses Euler method to solve
 * differential equation (http://en.wikipedia.org/wiki/Euler_method ).
 *
 * @returns {Number} squared distance of total position updates.
 */

module.exports = integrate;

function integrate(bodies, timeStep) {
  var dx = 0, tx = 0,
      dy = 0, ty = 0,
      i,
      max = bodies.length;

  for (i = 0; i < max; ++i) {
    var body = bodies[i],
        coeff = timeStep / body.mass;

    body.velocity.x += coeff * body.force.x;
    body.velocity.y += coeff * body.force.y;
    var vx = body.velocity.x,
        vy = body.velocity.y,
        v = Math.sqrt(vx * vx + vy * vy);

    if (v > 1) {
      body.velocity.x = vx / v;
      body.velocity.y = vy / v;
    }

    dx = timeStep * body.velocity.x;
    dy = timeStep * body.velocity.y;

    body.pos.x += dx;
    body.pos.y += dy;

    tx += Math.abs(dx); ty += Math.abs(dy);
  }

  return (tx * tx + ty * ty)/bodies.length;
}

},{}],28:[function(require,module,exports){
module.exports = Spring;

/**
 * Represents a physical spring. Spring connects two bodies, has rest length
 * stiffness coefficient and optional weight
 */
function Spring(fromBody, toBody, length, coeff, weight) {
    this.from = fromBody;
    this.to = toBody;
    this.length = length;
    this.coeff = coeff;

    this.weight = typeof weight === 'number' ? weight : 1;
};

},{}],29:[function(require,module,exports){
/**
 * Represents spring force, which updates forces acting on two bodies, conntected
 * by a spring.
 *
 * @param {Object} options for the spring force
 * @param {Number=} options.springCoeff spring force coefficient.
 * @param {Number=} options.springLength desired length of a spring at rest.
 */
module.exports = function (options) {
  var merge = require('ngraph.merge');
  var random = require('ngraph.random').random(42);
  var expose = require('ngraph.expose');

  options = merge(options, {
    springCoeff: 0.0002,
    springLength: 80
  });

  var api = {
    /**
     * Upsates forces acting on a spring
     */
    update : function (spring) {
      var body1 = spring.from,
          body2 = spring.to,
          length = spring.length < 0 ? options.springLength : spring.length,
          dx = body2.pos.x - body1.pos.x,
          dy = body2.pos.y - body1.pos.y,
          r = Math.sqrt(dx * dx + dy * dy);

      if (r === 0) {
          dx = (random.nextDouble() - 0.5) / 50;
          dy = (random.nextDouble() - 0.5) / 50;
          r = Math.sqrt(dx * dx + dy * dy);
      }

      var d = r - length;
      var coeff = ((!spring.coeff || spring.coeff < 0) ? options.springCoeff : spring.coeff) * d / r * spring.weight;

      body1.force.x += coeff * dx;
      body1.force.y += coeff * dy;

      body2.force.x -= coeff * dx;
      body2.force.y -= coeff * dy;
    }
  };

  expose(options, api, ['springCoeff', 'springLength']);
  return api;
}

},{"ngraph.expose":30,"ngraph.merge":39,"ngraph.random":40}],30:[function(require,module,exports){
module.exports = exposeProperties;

/**
 * Augments `target` object with getter/setter functions, which modify settings
 *
 * @example
 *  var target = {};
 *  exposeProperties({ age: 42}, target);
 *  target.age(); // returns 42
 *  target.age(24); // make age 24;
 *
 *  var filteredTarget = {};
 *  exposeProperties({ age: 42, name: 'John'}, filteredTarget, ['name']);
 *  filteredTarget.name(); // returns 'John'
 *  filteredTarget.age === undefined; // true
 */
function exposeProperties(settings, target, filter) {
  var needsFilter = Object.prototype.toString.call(filter) === '[object Array]';
  if (needsFilter) {
    for (var i = 0; i < filter.length; ++i) {
      augment(settings, target, filter[i]);
    }
  } else {
    for (var key in settings) {
      augment(settings, target, key);
    }
  }
}

function augment(source, target, key) {
  if (source.hasOwnProperty(key)) {
    if (typeof target[key] === 'function') {
      // this accessor is already defined. Ignore it
      return;
    }
    target[key] = function (value) {
      if (value !== undefined) {
        source[key] = value;
        return target;
      }
      return source[key];
    }
  }
}

},{}],31:[function(require,module,exports){
module.exports = {
  Body: Body,
  Vector2d: Vector2d,
  Body3d: Body3d,
  Vector3d: Vector3d
};

function Body(x, y) {
  this.pos = new Vector2d(x, y);
  this.prevPos = new Vector2d(x, y);
  this.force = new Vector2d();
  this.velocity = new Vector2d();
  this.mass = 1;
}

Body.prototype.setPosition = function (x, y) {
  this.prevPos.x = this.pos.x = x;
  this.prevPos.y = this.pos.y = y;
};

function Vector2d(x, y) {
  if (x && typeof x !== 'number') {
    // could be another vector
    this.x = typeof x.x === 'number' ? x.x : 0;
    this.y = typeof x.y === 'number' ? x.y : 0;
  } else {
    this.x = typeof x === 'number' ? x : 0;
    this.y = typeof y === 'number' ? y : 0;
  }
}

Vector2d.prototype.reset = function () {
  this.x = this.y = 0;
};

function Body3d(x, y, z) {
  this.pos = new Vector3d(x, y, z);
  this.prevPos = new Vector3d(x, y, z);
  this.force = new Vector3d();
  this.velocity = new Vector3d();
  this.mass = 1;
}

Body3d.prototype.setPosition = function (x, y, z) {
  this.prevPos.x = this.pos.x = x;
  this.prevPos.y = this.pos.y = y;
  this.prevPos.z = this.pos.z = z;
};

function Vector3d(x, y, z) {
  if (x && typeof x !== 'number') {
    // could be another vector
    this.x = typeof x.x === 'number' ? x.x : 0;
    this.y = typeof x.y === 'number' ? x.y : 0;
    this.z = typeof x.z === 'number' ? x.z : 0;
  } else {
    this.x = typeof x === 'number' ? x : 0;
    this.y = typeof y === 'number' ? y : 0;
    this.z = typeof z === 'number' ? z : 0;
  }
};

Vector3d.prototype.reset = function () {
  this.x = this.y = this.z = 0;
};

},{}],32:[function(require,module,exports){
/**
 * This is Barnes Hut simulation algorithm for 2d case. Implementation
 * is highly optimized (avoids recusion and gc pressure)
 *
 * http://www.cs.princeton.edu/courses/archive/fall03/cs126/assignments/barnes-hut.html
 */

module.exports = function(options) {
  options = options || {};
  options.gravity = typeof options.gravity === 'number' ? options.gravity : -1;
  options.theta = typeof options.theta === 'number' ? options.theta : 0.8;

  // we require deterministic randomness here
  var random = require('ngraph.random').random(1984),
    Node = require('./node'),
    InsertStack = require('./insertStack'),
    isSamePosition = require('./isSamePosition');

  var gravity = options.gravity,
    updateQueue = [],
    insertStack = new InsertStack(),
    theta = options.theta,

    nodesCache = [],
    currentInCache = 0,
    newNode = function() {
      // To avoid pressure on GC we reuse nodes.
      var node = nodesCache[currentInCache];
      if (node) {
        node.quad0 = null;
        node.quad1 = null;
        node.quad2 = null;
        node.quad3 = null;
        node.body = null;
        node.mass = node.massX = node.massY = 0;
        node.left = node.right = node.top = node.bottom = 0;
      } else {
        node = new Node();
        nodesCache[currentInCache] = node;
      }

      ++currentInCache;
      return node;
    },

    root = newNode(),

    // Inserts body to the tree
    insert = function(newBody) {
      insertStack.reset();
      insertStack.push(root, newBody);

      while (!insertStack.isEmpty()) {
        var stackItem = insertStack.pop(),
          node = stackItem.node,
          body = stackItem.body;

        if (!node.body) {
          // This is internal node. Update the total mass of the node and center-of-mass.
          var x = body.pos.x;
          var y = body.pos.y;
          node.mass = node.mass + body.mass;
          node.massX = node.massX + body.mass * x;
          node.massY = node.massY + body.mass * y;

          // Recursively insert the body in the appropriate quadrant.
          // But first find the appropriate quadrant.
          var quadIdx = 0, // Assume we are in the 0's quad.
            left = node.left,
            right = (node.right + left) / 2,
            top = node.top,
            bottom = (node.bottom + top) / 2;

          if (x > right) { // somewhere in the eastern part.
            quadIdx = quadIdx + 1;
            var oldLeft = left;
            left = right;
            right = right + (right - oldLeft);
          }
          if (y > bottom) { // and in south.
            quadIdx = quadIdx + 2;
            var oldTop = top;
            top = bottom;
            bottom = bottom + (bottom - oldTop);
          }

          var child = getChild(node, quadIdx);
          if (!child) {
            // The node is internal but this quadrant is not taken. Add
            // subnode to it.
            child = newNode();
            child.left = left;
            child.top = top;
            child.right = right;
            child.bottom = bottom;
            child.body = body;

            setChild(node, quadIdx, child);
          } else {
            // continue searching in this quadrant.
            insertStack.push(child, body);
          }
        } else {
          // We are trying to add to the leaf node.
          // We have to convert current leaf into internal node
          // and continue adding two nodes.
          var oldBody = node.body;
          node.body = null; // internal nodes do not cary bodies

          if (isSamePosition(oldBody.pos, body.pos)) {
            // Prevent infinite subdivision by bumping one node
            // anywhere in this quadrant
            var retriesCount = 3;
            do {
              var offset = random.nextDouble();
              var dx = (node.right - node.left) * offset;
              var dy = (node.bottom - node.top) * offset;

              oldBody.pos.x = node.left + dx;
              oldBody.pos.y = node.top + dy;
              retriesCount -= 1;
              // Make sure we don't bump it out of the box. If we do, next iteration should fix it
            } while (retriesCount > 0 && isSamePosition(oldBody.pos, body.pos));

            if (retriesCount === 0 && isSamePosition(oldBody.pos, body.pos)) {
              // This is very bad, we ran out of precision.
              // if we do not return from the method we'll get into
              // infinite loop here. So we sacrifice correctness of layout, and keep the app running
              // Next layout iteration should get larger bounding box in the first step and fix this
              return;
            }
          }
          // Next iteration should subdivide node further.
          insertStack.push(node, oldBody);
          insertStack.push(node, body);
        }
      }
    },

    update = function(sourceBody) {
      var queue = updateQueue,
        v,
        dx,
        dy,
        r, fx = 0,
        fy = 0,
        queueLength = 1,
        shiftIdx = 0,
        pushIdx = 1;

      queue[0] = root;

      while (queueLength) {
        var node = queue[shiftIdx],
          body = node.body;

        queueLength -= 1;
        shiftIdx += 1;
        var differentBody = (body !== sourceBody);
        if (body && differentBody) {
          // If the current node is a leaf node (and it is not source body),
          // calculate the force exerted by the current node on body, and add this
          // amount to body's net force.
          dx = body.pos.x - sourceBody.pos.x;
          dy = body.pos.y - sourceBody.pos.y;
          r = Math.sqrt(dx * dx + dy * dy);

          if (r === 0) {
            // Poor man's protection against zero distance.
            dx = (random.nextDouble() - 0.5) / 50;
            dy = (random.nextDouble() - 0.5) / 50;
            r = Math.sqrt(dx * dx + dy * dy);
          }

          // This is standard gravition force calculation but we divide
          // by r^3 to save two operations when normalizing force vector.
          v = gravity * body.mass * sourceBody.mass / (r * r * r);
          fx += v * dx;
          fy += v * dy;
        } else if (differentBody) {
          // Otherwise, calculate the ratio s / r,  where s is the width of the region
          // represented by the internal node, and r is the distance between the body
          // and the node's center-of-mass
          dx = node.massX / node.mass - sourceBody.pos.x;
          dy = node.massY / node.mass - sourceBody.pos.y;
          r = Math.sqrt(dx * dx + dy * dy);

          if (r === 0) {
            // Sorry about code duplucation. I don't want to create many functions
            // right away. Just want to see performance first.
            dx = (random.nextDouble() - 0.5) / 50;
            dy = (random.nextDouble() - 0.5) / 50;
            r = Math.sqrt(dx * dx + dy * dy);
          }
          // If s / r < θ, treat this internal node as a single body, and calculate the
          // force it exerts on sourceBody, and add this amount to sourceBody's net force.
          if ((node.right - node.left) / r < theta) {
            // in the if statement above we consider node's width only
            // because the region was squarified during tree creation.
            // Thus there is no difference between using width or height.
            v = gravity * node.mass * sourceBody.mass / (r * r * r);
            fx += v * dx;
            fy += v * dy;
          } else {
            // Otherwise, run the procedure recursively on each of the current node's children.

            // I intentionally unfolded this loop, to save several CPU cycles.
            if (node.quad0) {
              queue[pushIdx] = node.quad0;
              queueLength += 1;
              pushIdx += 1;
            }
            if (node.quad1) {
              queue[pushIdx] = node.quad1;
              queueLength += 1;
              pushIdx += 1;
            }
            if (node.quad2) {
              queue[pushIdx] = node.quad2;
              queueLength += 1;
              pushIdx += 1;
            }
            if (node.quad3) {
              queue[pushIdx] = node.quad3;
              queueLength += 1;
              pushIdx += 1;
            }
          }
        }
      }

      sourceBody.force.x += fx;
      sourceBody.force.y += fy;
    },

    insertBodies = function(bodies) {
      var x1 = Number.MAX_VALUE,
        y1 = Number.MAX_VALUE,
        x2 = Number.MIN_VALUE,
        y2 = Number.MIN_VALUE,
        i,
        max = bodies.length;

      // To reduce quad tree depth we are looking for exact bounding box of all particles.
      i = max;
      while (i--) {
        var x = bodies[i].pos.x;
        var y = bodies[i].pos.y;
        if (x < x1) {
          x1 = x;
        }
        if (x > x2) {
          x2 = x;
        }
        if (y < y1) {
          y1 = y;
        }
        if (y > y2) {
          y2 = y;
        }
      }

      // Squarify the bounds.
      var dx = x2 - x1,
        dy = y2 - y1;
      if (dx > dy) {
        y2 = y1 + dx;
      } else {
        x2 = x1 + dy;
      }

      currentInCache = 0;
      root = newNode();
      root.left = x1;
      root.right = x2;
      root.top = y1;
      root.bottom = y2;

      i = max - 1;
      if (i > 0) {
        root.body = bodies[i];
      }
      while (i--) {
        insert(bodies[i], root);
      }
    };

  return {
    insertBodies: insertBodies,
    updateBodyForce: update,
    options: function(newOptions) {
      if (newOptions) {
        if (typeof newOptions.gravity === 'number') {
          gravity = newOptions.gravity;
        }
        if (typeof newOptions.theta === 'number') {
          theta = newOptions.theta;
        }

        return this;
      }

      return {
        gravity: gravity,
        theta: theta
      };
    }
  };
};

function getChild(node, idx) {
  if (idx === 0) return node.quad0;
  if (idx === 1) return node.quad1;
  if (idx === 2) return node.quad2;
  if (idx === 3) return node.quad3;
  return null;
}

function setChild(node, idx, child) {
  if (idx === 0) node.quad0 = child;
  else if (idx === 1) node.quad1 = child;
  else if (idx === 2) node.quad2 = child;
  else if (idx === 3) node.quad3 = child;
}

},{"./insertStack":33,"./isSamePosition":34,"./node":35,"ngraph.random":40}],33:[function(require,module,exports){
module.exports = InsertStack;

/**
 * Our implmentation of QuadTree is non-recursive to avoid GC hit
 * This data structure represent stack of elements
 * which we are trying to insert into quad tree.
 */
function InsertStack () {
    this.stack = [];
    this.popIdx = 0;
}

InsertStack.prototype = {
    isEmpty: function() {
        return this.popIdx === 0;
    },
    push: function (node, body) {
        var item = this.stack[this.popIdx];
        if (!item) {
            // we are trying to avoid memory pressue: create new element
            // only when absolutely necessary
            this.stack[this.popIdx] = new InsertStackElement(node, body);
        } else {
            item.node = node;
            item.body = body;
        }
        ++this.popIdx;
    },
    pop: function () {
        if (this.popIdx > 0) {
            return this.stack[--this.popIdx];
        }
    },
    reset: function () {
        this.popIdx = 0;
    }
};

function InsertStackElement(node, body) {
    this.node = node; // QuadTree node
    this.body = body; // physical body which needs to be inserted to node
}

},{}],34:[function(require,module,exports){
module.exports = function isSamePosition(point1, point2) {
    var dx = Math.abs(point1.x - point2.x);
    var dy = Math.abs(point1.y - point2.y);

    return (dx < 1e-8 && dy < 1e-8);
};

},{}],35:[function(require,module,exports){
/**
 * Internal data structure to represent 2D QuadTree node
 */
module.exports = function Node() {
  // body stored inside this node. In quad tree only leaf nodes (by construction)
  // contain boides:
  this.body = null;

  // Child nodes are stored in quads. Each quad is presented by number:
  // 0 | 1
  // -----
  // 2 | 3
  this.quad0 = null;
  this.quad1 = null;
  this.quad2 = null;
  this.quad3 = null;

  // Total mass of current node
  this.mass = 0;

  // Center of mass coordinates
  this.massX = 0;
  this.massY = 0;

  // bounding box coordinates
  this.left = 0;
  this.top = 0;
  this.bottom = 0;
  this.right = 0;
};

},{}],36:[function(require,module,exports){
module.exports = load;

var createGraph = require('ngraph.graph');

function load(jsonGraph, nodeTransform, linkTransform) {
  var stored;
  nodeTransform = nodeTransform || id;
  linkTransform = linkTransform || id;
  if (typeof jsonGraph === 'string') {
    stored = JSON.parse(jsonGraph);
  } else {
    stored = jsonGraph;
  }

  var graph = createGraph(),
      i;

  if (stored.links === undefined || stored.nodes === undefined) {
    throw new Error('Cannot load graph without links and nodes');
  }

  for (i = 0; i < stored.nodes.length; ++i) {
    var parsedNode = nodeTransform(stored.nodes[i]);
    if (!parsedNode.hasOwnProperty('id')) {
      throw new Error('Graph node format is invalid: Node id is missing');
    }

    graph.addNode(parsedNode.id, parsedNode.data);
  }

  for (i = 0; i < stored.links.length; ++i) {
    var link = linkTransform(stored.links[i]);
    if (!link.hasOwnProperty('fromId') || !link.hasOwnProperty('toId')) {
      throw new Error('Graph link format is invalid. Both fromId and toId are required');
    }

    graph.addLink(link.fromId, link.toId, link.data);
  }

  return graph;
}

function id(x) { return x; }

},{"ngraph.graph":38}],37:[function(require,module,exports){
module.exports = {
  ladder: ladder,
  complete: complete,
  completeBipartite: completeBipartite,
  balancedBinTree: balancedBinTree,
  path: path,
  circularLadder: circularLadder,
  grid: grid,
  grid3: grid3,
  noLinks: noLinks,
  wattsStrogatz: wattsStrogatz
};

var createGraph = require('ngraph.graph');

function ladder(n) {
/**
 * Ladder graph is a graph in form of ladder
 * @param {Number} n Represents number of steps in the ladder
 */
  if (!n || n < 0) {
    throw new Error("Invalid number of nodes");
  }

  var g = createGraph(),
      i;

  for (i = 0; i < n - 1; ++i) {
    g.addLink(i, i + 1);
    // first row
    g.addLink(n + i, n + i + 1);
    // second row
    g.addLink(i, n + i);
    // ladder's step
  }

  g.addLink(n - 1, 2 * n - 1);
  // last step in the ladder;

  return g;
}

function circularLadder(n) {
/**
 * Circular ladder with n steps.
 *
 * @param {Number} n of steps in the ladder.
 */
    if (!n || n < 0) {
        throw new Error("Invalid number of nodes");
    }

    var g = ladder(n);

    g.addLink(0, n - 1);
    g.addLink(n, 2 * n - 1);
    return g;
}

function complete(n) {
/**
 * Complete graph Kn.
 *
 * @param {Number} n represents number of nodes in the complete graph.
 */
  if (!n || n < 1) {
    throw new Error("At least two nodes are expected for complete graph");
  }

  var g = createGraph(),
      i,
      j;

  for (i = 0; i < n; ++i) {
    for (j = i + 1; j < n; ++j) {
      if (i !== j) {
        g.addLink(i, j);
      }
    }
  }

  return g;
}

function completeBipartite (n, m) {
/**
 * Complete bipartite graph K n,m. Each node in the
 * first partition is connected to all nodes in the second partition.
 *
 * @param {Number} n represents number of nodes in the first graph partition
 * @param {Number} m represents number of nodes in the second graph partition
 */
  if (!n || !m || n < 0 || m < 0) {
    throw new Error("Graph dimensions are invalid. Number of nodes in each partition should be greater than 0");
  }

  var g = createGraph(),
      i, j;

  for (i = 0; i < n; ++i) {
    for (j = n; j < n + m; ++j) {
      g.addLink(i, j);
    }
  }

  return g;
}

function path(n) {
/**
 * Path graph with n steps.
 *
 * @param {Number} n number of nodes in the path
 */
  if (!n || n < 0) {
    throw new Error("Invalid number of nodes");
  }

  var g = createGraph(),
      i;

  g.addNode(0);

  for (i = 1; i < n; ++i) {
    g.addLink(i - 1, i);
  }

  return g;
}


function grid(n, m) {
/**
 * Grid graph with n rows and m columns.
 *
 * @param {Number} n of rows in the graph.
 * @param {Number} m of columns in the graph.
 */
  if (n < 1 || m < 1) {
    throw new Error("Invalid number of nodes in grid graph");
  }
  var g = createGraph(),
      i,
      j;
  if (n === 1 && m === 1) {
    g.addNode(0);
    return g;
  }

  for (i = 0; i < n; ++i) {
    for (j = 0; j < m; ++j) {
      var node = i + j * n;
      if (i > 0) { g.addLink(node, i - 1 + j * n); }
      if (j > 0) { g.addLink(node, i + (j - 1) * n); }
    }
  }

  return g;
}

function grid3(n, m, z) {
/**
 * 3D grid with n rows and m columns and z levels.
 *
 * @param {Number} n of rows in the graph.
 * @param {Number} m of columns in the graph.
 * @param {Number} z of levels in the graph.
 */
  if (n < 1 || m < 1 || z < 1) {
    throw new Error("Invalid number of nodes in grid3 graph");
  }
  var g = createGraph(),
      i, j, k;

  if (n === 1 && m === 1 && z === 1) {
    g.addNode(0);
    return g;
  }

  for (k = 0; k < z; ++k) {
    for (i = 0; i < n; ++i) {
      for (j = 0; j < m; ++j) {
        var level = k * n * m;
        var node = i + j * n + level;
        if (i > 0) { g.addLink(node, i - 1 + j * n + level); }
        if (j > 0) { g.addLink(node, i + (j - 1) * n + level); }
        if (k > 0) { g.addLink(node, i + j * n + (k - 1) * n * m ); }
      }
    }
  }

  return g;
}

function balancedBinTree(n) {
/**
 * Balanced binary tree with n levels.
 *
 * @param {Number} n of levels in the binary tree
 */
  if (n < 0) {
    throw new Error("Invalid number of nodes in balanced tree");
  }
  var g = createGraph(),
      count = Math.pow(2, n),
      level;

  if (n === 0) {
    g.addNode(1);
  }

  for (level = 1; level < count; ++level) {
    var root = level,
      left = root * 2,
      right = root * 2 + 1;

    g.addLink(root, left);
    g.addLink(root, right);
  }

  return g;
}

function noLinks(n) {
/**
 * Graph with no links
 *
 * @param {Number} n of nodes in the graph
 */
  if (n < 0) {
    throw new Error("Number of nodes shoul be >= 0");
  }

  var g = createGraph(), i;
  for (i = 0; i < n; ++i) {
    g.addNode(i);
  }

  return g;
}

function wattsStrogatz(n, k, p, seed) {
/**
 * Watts-Strogatz small-world graph.
 *
 * @param {Number} n The number of nodes
 * @param {Number} k Each node is connected to k nearest neighbors in ring topology
 * @param {Number} p The probability of rewiring each edge

 * @see https://github.com/networkx/networkx/blob/master/networkx/generators/random_graphs.py
 */
  if (k >= n) throw new Error('Choose smaller `k`. It cannot be larger than number of nodes `n`');


  var random = require('ngraph.random').random(seed || 42);

  var g = createGraph(), i, to;
  for (i = 0; i < n; ++i) {
    g.addNode(i);
  }

  // connect each node to k/2 neighbors
  var neighborsSize = Math.floor(k/2 + 1);
  for (var j = 1; j < neighborsSize; ++j) {
    for (i = 0; i < n; ++i) {
      to = (j + i) % n;
      g.addLink(i, to);
    }
  }

  // rewire edges from each node
  // loop over all nodes in order (label) and neighbors in order (distance)
  // no self loops or multiple edges allowed
  for (j = 1; j < neighborsSize; ++j) {
    for (i = 0; i < n; ++i) {
      if (random.nextDouble() < p) {
        var from = i;
        to = (j + i) % n;

        var newTo = random.next(n);
        var needsRewire = (newTo === from || g.hasLink(from, newTo));
        if (needsRewire && g.getLinks(from).length === n - 1) {
          // we cannot rewire this node, it has too many links.
          continue;
        }
        // Enforce no self-loops or multiple edges
        while (needsRewire) {
          newTo = random.next(n);
          needsRewire = (newTo === from || g.hasLink(from, newTo));
        }
        var link = g.hasLink(from, to);
        g.removeLink(link);
        g.addLink(from, newTo);
      }
    }
  }

  return g;
}

},{"ngraph.graph":38,"ngraph.random":40}],38:[function(require,module,exports){
/**
 * @fileOverview Contains definition of the core graph object.
 */

/**
 * @example
 *  var graph = require('ngraph.graph')();
 *  graph.addNode(1);     // graph has one node.
 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
 *
 */
module.exports = createGraph;

var eventify = require('ngraph.events');

/**
 * Creates a new graph
 */
function createGraph(options) {
  // Graph structure is maintained as dictionary of nodes
  // and array of links. Each node has 'links' property which
  // hold all links related to that node. And general links
  // array is used to speed up all links enumeration. This is inefficient
  // in terms of memory, but simplifies coding.
  options = options || {};
  if (options.uniqueLinkId === undefined) {
    // Request each link id to be unique between same nodes. This negatively
    // impacts `addLink()` performance (O(n), where n - number of edges of each
    // vertex), but makes operations with multigraphs more accessible.
    options.uniqueLinkId = true;
  }

  var nodes = typeof Object.create === 'function' ? Object.create(null) : {},
    links = [],
    // Hash of multi-edges. Used to track ids of edges between same nodes
    multiEdges = {},
    nodesCount = 0,
    suspendEvents = 0,

    forEachNode = createNodeIterator(),
    createLink = options.uniqueLinkId ? createUniqueLink : createSingleLink,

    // Our graph API provides means to listen to graph changes. Users can subscribe
    // to be notified about changes in the graph by using `on` method. However
    // in some cases they don't use it. To avoid unnecessary memory consumption
    // we will not record graph changes until we have at least one subscriber.
    // Code below supports this optimization.
    //
    // Accumulates all changes made during graph updates.
    // Each change element contains:
    //  changeType - one of the strings: 'add', 'remove' or 'update';
    //  node - if change is related to node this property is set to changed graph's node;
    //  link - if change is related to link this property is set to changed graph's link;
    changes = [],
    recordLinkChange = noop,
    recordNodeChange = noop,
    enterModification = noop,
    exitModification = noop;

  // this is our public API:
  var graphPart = {
    /**
     * Adds node to the graph. If node with given id already exists in the graph
     * its data is extended with whatever comes in 'data' argument.
     *
     * @param nodeId the node's identifier. A string or number is preferred.
     *   note: If you request options.uniqueLinkId, then node id should not
     *   contain '👉 '. This will break link identifiers
     * @param [data] additional data for the node being added. If node already
     *   exists its data object is augmented with the new one.
     *
     * @return {node} The newly added node or node with given id if it already exists.
     */
    addNode: addNode,

    /**
     * Adds a link to the graph. The function always create a new
     * link between two nodes. If one of the nodes does not exists
     * a new node is created.
     *
     * @param fromId link start node id;
     * @param toId link end node id;
     * @param [data] additional data to be set on the new link;
     *
     * @return {link} The newly created link
     */
    addLink: addLink,

    /**
     * Removes link from the graph. If link does not exist does nothing.
     *
     * @param link - object returned by addLink() or getLinks() methods.
     *
     * @returns true if link was removed; false otherwise.
     */
    removeLink: removeLink,

    /**
     * Removes node with given id from the graph. If node does not exist in the graph
     * does nothing.
     *
     * @param nodeId node's identifier passed to addNode() function.
     *
     * @returns true if node was removed; false otherwise.
     */
    removeNode: removeNode,

    /**
     * Gets node with given identifier. If node does not exist undefined value is returned.
     *
     * @param nodeId requested node identifier;
     *
     * @return {node} in with requested identifier or undefined if no such node exists.
     */
    getNode: getNode,

    /**
     * Gets number of nodes in this graph.
     *
     * @return number of nodes in the graph.
     */
    getNodesCount: function() {
      return nodesCount;
    },

    /**
     * Gets total number of links in the graph.
     */
    getLinksCount: function() {
      return links.length;
    },

    /**
     * Gets all links (inbound and outbound) from the node with given id.
     * If node with given id is not found null is returned.
     *
     * @param nodeId requested node identifier.
     *
     * @return Array of links from and to requested node if such node exists;
     *   otherwise null is returned.
     */
    getLinks: getLinks,

    /**
     * Invokes callback on each node of the graph.
     *
     * @param {Function(node)} callback Function to be invoked. The function
     *   is passed one argument: visited node.
     */
    forEachNode: forEachNode,

    /**
     * Invokes callback on every linked (adjacent) node to the given one.
     *
     * @param nodeId Identifier of the requested node.
     * @param {Function(node, link)} callback Function to be called on all linked nodes.
     *   The function is passed two parameters: adjacent node and link object itself.
     * @param oriented if true graph treated as oriented.
     */
    forEachLinkedNode: forEachLinkedNode,

    /**
     * Enumerates all links in the graph
     *
     * @param {Function(link)} callback Function to be called on all links in the graph.
     *   The function is passed one parameter: graph's link object.
     *
     * Link object contains at least the following fields:
     *  fromId - node id where link starts;
     *  toId - node id where link ends,
     *  data - additional data passed to graph.addLink() method.
     */
    forEachLink: forEachLink,

    /**
     * Suspend all notifications about graph changes until
     * endUpdate is called.
     */
    beginUpdate: enterModification,

    /**
     * Resumes all notifications about graph changes and fires
     * graph 'changed' event in case there are any pending changes.
     */
    endUpdate: exitModification,

    /**
     * Removes all nodes and links from the graph.
     */
    clear: clear,

    /**
     * Detects whether there is a link between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     * NOTE: this function is synonim for getLink()
     *
     * @returns link if there is one. null otherwise.
     */
    hasLink: getLink,

    /**
     * Gets an edge between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     *
     * @param {string} fromId link start identifier
     * @param {string} toId link end identifier
     *
     * @returns link if there is one. null otherwise.
     */
    getLink: getLink
  };

  // this will add `on()` and `fire()` methods.
  eventify(graphPart);

  monitorSubscribers();

  return graphPart;

  function monitorSubscribers() {
    var realOn = graphPart.on;

    // replace real `on` with our temporary on, which will trigger change
    // modification monitoring:
    graphPart.on = on;

    function on() {
      // now it's time to start tracking stuff:
      graphPart.beginUpdate = enterModification = enterModificationReal;
      graphPart.endUpdate = exitModification = exitModificationReal;
      recordLinkChange = recordLinkChangeReal;
      recordNodeChange = recordNodeChangeReal;

      // this will replace current `on` method with real pub/sub from `eventify`.
      graphPart.on = realOn;
      // delegate to real `on` handler:
      return realOn.apply(graphPart, arguments);
    }
  }

  function recordLinkChangeReal(link, changeType) {
    changes.push({
      link: link,
      changeType: changeType
    });
  }

  function recordNodeChangeReal(node, changeType) {
    changes.push({
      node: node,
      changeType: changeType
    });
  }

  function addNode(nodeId, data) {
    if (nodeId === undefined) {
      throw new Error('Invalid node identifier');
    }

    enterModification();

    var node = getNode(nodeId);
    if (!node) {
      // TODO: Should I check for 👉  here?
      node = new Node(nodeId);
      nodesCount++;
      recordNodeChange(node, 'add');
    } else {
      recordNodeChange(node, 'update');
    }

    node.data = data;

    nodes[nodeId] = node;

    exitModification();
    return node;
  }

  function getNode(nodeId) {
    return nodes[nodeId];
  }

  function removeNode(nodeId) {
    var node = getNode(nodeId);
    if (!node) {
      return false;
    }

    enterModification();

    while (node.links.length) {
      var link = node.links[0];
      removeLink(link);
    }

    delete nodes[nodeId];
    nodesCount--;

    recordNodeChange(node, 'remove');

    exitModification();

    return true;
  }


  function addLink(fromId, toId, data) {
    enterModification();

    var fromNode = getNode(fromId) || addNode(fromId);
    var toNode = getNode(toId) || addNode(toId);

    var link = createLink(fromId, toId, data);

    links.push(link);

    // TODO: this is not cool. On large graphs potentially would consume more memory.
    fromNode.links.push(link);
    if (fromId !== toId) {
      // make sure we are not duplicating links for self-loops
      toNode.links.push(link);
    }

    recordLinkChange(link, 'add');

    exitModification();

    return link;
  }

  function createSingleLink(fromId, toId, data) {
    var linkId = fromId.toString() + toId.toString();
    return new Link(fromId, toId, data, linkId);
  }

  function createUniqueLink(fromId, toId, data) {
    var linkId = fromId.toString() + '👉 ' + toId.toString();
    var isMultiEdge = multiEdges.hasOwnProperty(linkId);
    if (isMultiEdge || getLink(fromId, toId)) {
      if (!isMultiEdge) {
        multiEdges[linkId] = 0;
      }
      linkId += '@' + (++multiEdges[linkId]);
    }

    return new Link(fromId, toId, data, linkId);
  }

  function getLinks(nodeId) {
    var node = getNode(nodeId);
    return node ? node.links : null;
  }

  function removeLink(link) {
    if (!link) {
      return false;
    }
    var idx = indexOfElementInArray(link, links);
    if (idx < 0) {
      return false;
    }

    enterModification();

    links.splice(idx, 1);

    var fromNode = getNode(link.fromId);
    var toNode = getNode(link.toId);

    if (fromNode) {
      idx = indexOfElementInArray(link, fromNode.links);
      if (idx >= 0) {
        fromNode.links.splice(idx, 1);
      }
    }

    if (toNode) {
      idx = indexOfElementInArray(link, toNode.links);
      if (idx >= 0) {
        toNode.links.splice(idx, 1);
      }
    }

    recordLinkChange(link, 'remove');

    exitModification();

    return true;
  }

  function getLink(fromNodeId, toNodeId) {
    // TODO: Use sorted links to speed this up
    var node = getNode(fromNodeId),
      i;
    if (!node) {
      return null;
    }

    for (i = 0; i < node.links.length; ++i) {
      var link = node.links[i];
      if (link.fromId === fromNodeId && link.toId === toNodeId) {
        return link;
      }
    }

    return null; // no link.
  }

  function clear() {
    enterModification();
    forEachNode(function(node) {
      removeNode(node.id);
    });
    exitModification();
  }

  function forEachLink(callback) {
    var i, length;
    if (typeof callback === 'function') {
      for (i = 0, length = links.length; i < length; ++i) {
        callback(links[i]);
      }
    }
  }

  function forEachLinkedNode(nodeId, callback, oriented) {
    var node = getNode(nodeId);

    if (node && node.links && typeof callback === 'function') {
      if (oriented) {
        return forEachOrientedLink(node.links, nodeId, callback);
      } else {
        return forEachNonOrientedLink(node.links, nodeId, callback);
      }
    }
  }

  function forEachNonOrientedLink(links, nodeId, callback) {
    var quitFast;
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

      quitFast = callback(nodes[linkedNodeId], link);
      if (quitFast) {
        return true; // Client does not need more iterations. Break now.
      }
    }
  }

  function forEachOrientedLink(links, nodeId, callback) {
    var quitFast;
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      if (link.fromId === nodeId) {
        quitFast = callback(nodes[link.toId], link);
        if (quitFast) {
          return true; // Client does not need more iterations. Break now.
        }
      }
    }
  }

  // we will not fire anything until users of this library explicitly call `on()`
  // method.
  function noop() {}

  // Enter, Exit modification allows bulk graph updates without firing events.
  function enterModificationReal() {
    suspendEvents += 1;
  }

  function exitModificationReal() {
    suspendEvents -= 1;
    if (suspendEvents === 0 && changes.length > 0) {
      graphPart.fire('changed', changes);
      changes.length = 0;
    }
  }

  function createNodeIterator() {
    // Object.keys iterator is 1.3x faster than `for in` loop.
    // See `https://github.com/anvaka/ngraph.graph/tree/bench-for-in-vs-obj-keys`
    // branch for perf test
    return Object.keys ? objectKeysIterator : forInIterator;
  }

  function objectKeysIterator(callback) {
    if (typeof callback !== 'function') {
      return;
    }

    var keys = Object.keys(nodes);
    for (var i = 0; i < keys.length; ++i) {
      if (callback(nodes[keys[i]])) {
        return true; // client doesn't want to proceed. Return.
      }
    }
  }

  function forInIterator(callback) {
    if (typeof callback !== 'function') {
      return;
    }
    var node;

    for (node in nodes) {
      if (callback(nodes[node])) {
        return true; // client doesn't want to proceed. Return.
      }
    }
  }
}

// need this for old browsers. Should this be a separate module?
function indexOfElementInArray(element, array) {
  if (array.indexOf) {
    return array.indexOf(element);
  }

  var len = array.length,
    i;

  for (i = 0; i < len; i += 1) {
    if (array[i] === element) {
      return i;
    }
  }

  return -1;
}

/**
 * Internal structure to represent node;
 */
function Node(id) {
  this.id = id;
  this.links = [];
  this.data = null;
}


/**
 * Internal structure to represent links;
 */
function Link(fromId, toId, data, id) {
  this.fromId = fromId;
  this.toId = toId;
  this.data = data;
  this.id = id;
}

},{"ngraph.events":21}],39:[function(require,module,exports){
module.exports = merge;

/**
 * Augments `target` with properties in `options`. Does not override
 * target's properties if they are defined and matches expected type in 
 * options
 *
 * @returns {Object} merged object
 */
function merge(target, options) {
  var key;
  if (!target) { target = {}; }
  if (options) {
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        var targetHasIt = target.hasOwnProperty(key),
            optionsValueType = typeof options[key],
            shouldReplace = !targetHasIt || (typeof target[key] !== optionsValueType);

        if (shouldReplace) {
          target[key] = options[key];
        } else if (optionsValueType === 'object') {
          // go deep, don't care about loops here, we are simple API!:
          target[key] = merge(target[key], options[key]);
        }
      }
    }
  }

  return target;
}

},{}],40:[function(require,module,exports){
module.exports = {
  random: random,
  randomIterator: randomIterator
};

/**
 * Creates seeded PRNG with two methods:
 *   next() and nextDouble()
 */
function random(inputSeed) {
  var seed = typeof inputSeed === 'number' ? inputSeed : (+ new Date());
  var randomFunc = function() {
      // Robert Jenkins' 32 bit integer hash function.
      seed = ((seed + 0x7ed55d16) + (seed << 12))  & 0xffffffff;
      seed = ((seed ^ 0xc761c23c) ^ (seed >>> 19)) & 0xffffffff;
      seed = ((seed + 0x165667b1) + (seed << 5))   & 0xffffffff;
      seed = ((seed + 0xd3a2646c) ^ (seed << 9))   & 0xffffffff;
      seed = ((seed + 0xfd7046c5) + (seed << 3))   & 0xffffffff;
      seed = ((seed ^ 0xb55a4f09) ^ (seed >>> 16)) & 0xffffffff;
      return (seed & 0xfffffff) / 0x10000000;
  };

  return {
      /**
       * Generates random integer number in the range from 0 (inclusive) to maxValue (exclusive)
       *
       * @param maxValue Number REQUIRED. Ommitting this number will result in NaN values from PRNG.
       */
      next : function (maxValue) {
          return Math.floor(randomFunc() * maxValue);
      },

      /**
       * Generates random double number in the range from 0 (inclusive) to 1 (exclusive)
       * This function is the same as Math.random() (except that it could be seeded)
       */
      nextDouble : function () {
          return randomFunc();
      }
  };
}

/*
 * Creates iterator over array, which returns items of array in random order
 * Time complexity is guaranteed to be O(n);
 */
function randomIterator(array, customRandom) {
    var localRandom = customRandom || random();
    if (typeof localRandom.next !== 'function') {
      throw new Error('customRandom does not match expected API: next() function is missing');
    }

    return {
        forEach : function (callback) {
            var i, j, t;
            for (i = array.length - 1; i > 0; --i) {
                j = localRandom.next(i + 1); // i inclusive
                t = array[j];
                array[j] = array[i];
                array[i] = t;

                callback(t);
            }

            if (array.length) {
                callback(array[0]);
            }
        },

        /**
         * Shuffles array randomly, in place.
         */
        shuffle : function () {
            var i, j, t;
            for (i = array.length - 1; i > 0; --i) {
                j = localRandom.next(i + 1); // i inclusive
                t = array[j];
                array[j] = array[i];
                array[i] = t;
            }

            return array;
        }
    };
}

},{}],41:[function(require,module,exports){
module.exports = save;

function save(graph, customNodeTransform, customLinkTransform) {
  // Object contains `nodes` and `links` arrays.
  var result = {
    nodes: [],
    links: []
  };

  var nodeTransform = customNodeTransform || defaultTransformForNode;
  var linkTransform = customLinkTransform || defaultTransformForLink;

  graph.forEachNode(saveNode);
  graph.forEachLink(saveLink);

  return JSON.stringify(result);

  function saveNode(node) {
    // Each node of the graph is processed to take only required fields
    // `id` and `data`
    result.nodes.push(nodeTransform(node));
  }

  function saveLink(link) {
    // Each link of the graph is also processed to take `fromId`, `toId` and
    // `data`
    result.links.push(linkTransform(link));
  }

  function defaultTransformForNode(node) {
    var result = {
      id: node.id
    };
    // We don't want to store undefined fields when it's not necessary:
    if (node.data !== undefined) {
      result.data = node.data;
    }

    return result;
  }

  function defaultTransformForLink(link) {
    var result = {
      fromId: link.fromId,
      toId: link.toId,
    };

    if (link.data !== undefined) {
      result.data = link.data;
    }

    return result;
  }
}

},{}],42:[function(require,module,exports){
module.exports = svg;

svg.compile = require('./lib/compile');

var compileTemplate = svg.compileTemplate = require('./lib/compile_template');

var domEvents = require('add-event-listener');

var svgns = "http://www.w3.org/2000/svg";
var xlinkns = "http://www.w3.org/1999/xlink";

function svg(element, attrBag) {
  var svgElement = augment(element);
  if (attrBag === undefined) {
    return svgElement;
  }

  var attributes = Object.keys(attrBag);
  for (var i = 0; i < attributes.length; ++i) {
    var attributeName = attributes[i];
    var value = attrBag[attributeName];
    if (attributeName === 'link') {
      svgElement.link(value);
    } else {
      svgElement.attr(attributeName, value);
    }
  }

  return svgElement;
}

function augment(element) {
  var svgElement = element;

  if (typeof element === "string") {
    svgElement = window.document.createElementNS(svgns, element);
  } else if (element.simplesvg) {
    return element;
  }

  var compiledTempalte;

  svgElement.simplesvg = true; // this is not good, since we are monkey patching svg
  svgElement.attr = attr;
  svgElement.append = append;
  svgElement.link = link;
  svgElement.text = text;

  // add easy eventing
  svgElement.on = on;
  svgElement.off = off;

  // data binding:
  svgElement.dataSource = dataSource;

  return svgElement;

  function dataSource(model) {
    if (!compiledTempalte) compiledTempalte = compileTemplate(svgElement);
    compiledTempalte.link(model);
    return svgElement;
  }

  function on(name, cb, useCapture) {
    domEvents.addEventListener(svgElement, name, cb, useCapture);
    return svgElement;
  }

  function off(name, cb, useCapture) {
    domEvents.removeEventListener(svgElement, name, cb, useCapture);
    return svgElement;
  }

  function append(content) {
    var child = svg(content);
    svgElement.appendChild(child);

    return child;
  }

  function attr(name, value) {
    if (arguments.length === 2) {
      if (value !== null) {
        svgElement.setAttributeNS(null, name, value);
      } else {
        svgElement.removeAttributeNS(null, name);
      }

      return svgElement;
    }

    return svgElement.getAttributeNS(null, name);
  }

  function link(target) {
    if (arguments.length) {
      svgElement.setAttributeNS(xlinkns, "xlink:href", target);
      return svgElement;
    }

    return svgElement.getAttributeNS(xlinkns, "xlink:href");
  }

  function text(textContent) {
    if (textContent !== undefined) {
        svgElement.textContent = textContent;
        return svgElement;
    }
    return svgElement.textContent;
  }
}

},{"./lib/compile":43,"./lib/compile_template":44,"add-event-listener":46}],43:[function(require,module,exports){
var parser = require('./domparser.js');
var svg = require('../');

module.exports = compile;

function compile(svgText) {
  try {
    svgText = addNamespaces(svgText);
    return svg(parser.parseFromString(svgText, "text/xml").documentElement);
  } catch (e) {
    throw e;
  }
}

function addNamespaces(text) {
  if (!text) return;

  var namespaces = 'xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg"';
  var match = text.match(/^<\w+/);
  if (match) {
    var tagLength = match[0].length;
    return text.substr(0, tagLength) + ' ' + namespaces + ' ' + text.substr(tagLength);
  } else {
    throw new Error('Cannot parse input text: invalid xml?');
  }
}

},{"../":42,"./domparser.js":45}],44:[function(require,module,exports){
module.exports = template;

var BINDING_EXPR = /{{(.+?)}}/;

function template(domNode) {
  var allBindings = Object.create(null);
  extractAllBindings(domNode, allBindings);

  return {
    link: function(model) {
      Object.keys(allBindings).forEach(function(key) {
        var setter = allBindings[key];
        setter.forEach(changeModel);
      });

      function changeModel(setter) {
        setter(model);
      }
    }
  };
}

function extractAllBindings(domNode, allBindings) {
  var nodeType = domNode.nodeType;
  var typeSupported = (nodeType === 1) || (nodeType === 3);
  if (!typeSupported) return;
  var i;
  if (domNode.hasChildNodes()) {
    var domChildren = domNode.childNodes;
    for (i = 0; i < domChildren.length; ++i) {
      extractAllBindings(domChildren[i], allBindings);
    }
  }

  if (nodeType === 3) { // text:
    bindTextContent(domNode, allBindings);
  }

  if (!domNode.attributes) return; // this might be a text. Need to figure out what to do in that case

  var attrs = domNode.attributes;
  for (i = 0; i < attrs.length; ++i) {
    bindDomAttribute(attrs[i], domNode, allBindings);
  }
}

function bindDomAttribute(domAttribute, element, allBindings) {
  var value = domAttribute.value;
  if (!value) return; // unary attribute?

  var modelNameMatch = value.match(BINDING_EXPR);
  if (!modelNameMatch) return; // does not look like a binding

  var attrName = domAttribute.localName;
  var modelPropertyName = modelNameMatch[1];
  var isSimpleValue = modelPropertyName.indexOf('.') < 0;

  if (!isSimpleValue) throw new Error('simplesvg currently does not support nested bindings');

  var propertyBindings = allBindings[modelPropertyName];
  if (!propertyBindings) {
    propertyBindings = allBindings[modelPropertyName] = [attributeSetter];
  } else {
    propertyBindings.push(attributeSetter);
  }

  function attributeSetter(model) {
    element.setAttributeNS(null, attrName, model[modelPropertyName]);
  }
}
function bindTextContent(element, allBindings) {
  // todo reduce duplication
  var value = element.nodeValue;
  if (!value) return; // unary attribute?

  var modelNameMatch = value.match(BINDING_EXPR);
  if (!modelNameMatch) return; // does not look like a binding

  var modelPropertyName = modelNameMatch[1];
  var isSimpleValue = modelPropertyName.indexOf('.') < 0;

  var propertyBindings = allBindings[modelPropertyName];
  if (!propertyBindings) {
    propertyBindings = allBindings[modelPropertyName] = [textSetter];
  } else {
    propertyBindings.push(textSetter);
  }

  function textSetter(model) {
    element.nodeValue = model[modelPropertyName];
  }
}

},{}],45:[function(require,module,exports){
module.exports = createDomparser();

function createDomparser() {
  if (typeof DOMParser === 'undefined') {
    return {
      parseFromString: fail
    };
  }
  return new DOMParser();
}

function fail() {
  throw new Error('DOMParser is not supported by this platform. Please open issue here https://github.com/anvaka/simplesvg');
}

},{}],46:[function(require,module,exports){
addEventListener.removeEventListener = removeEventListener
addEventListener.addEventListener = addEventListener

module.exports = addEventListener

var Events = null

function addEventListener(el, eventName, listener, useCapture) {
  Events = Events || (
    document.addEventListener ?
    {add: stdAttach, rm: stdDetach} :
    {add: oldIEAttach, rm: oldIEDetach}
  )
  
  return Events.add(el, eventName, listener, useCapture)
}

function removeEventListener(el, eventName, listener, useCapture) {
  Events = Events || (
    document.addEventListener ?
    {add: stdAttach, rm: stdDetach} :
    {add: oldIEAttach, rm: oldIEDetach}
  )
  
  return Events.rm(el, eventName, listener, useCapture)
}

function stdAttach(el, eventName, listener, useCapture) {
  el.addEventListener(eventName, listener, useCapture)
}

function stdDetach(el, eventName, listener, useCapture) {
  el.removeEventListener(eventName, listener, useCapture)
}

function oldIEAttach(el, eventName, listener, useCapture) {
  if(useCapture) {
    throw new Error('cannot useCapture in oldIE')
  }

  el.attachEvent('on' + eventName, listener)
}

function oldIEDetach(el, eventName, listener, useCapture) {
  el.detachEvent('on' + eventName, listener)
}

},{}],47:[function(require,module,exports){
var centrality = require('ngraph.centrality');

module.exports = centralityWrapper;

function centralityWrapper() {
  // TODO: This should not be a function
  return {
    betweennessCentrality: betweennessCentrality,
    degreeCentrality: degreeCentrality
  };
}

function betweennessCentrality(g) {
  var betweenness = centrality.betweenness(g);
  return toVivaGraphCentralityFormat(betweenness);
}

function degreeCentrality(g, kind) {
  var degree = centrality.degree(g, kind);
  return toVivaGraphCentralityFormat(degree);
}

function toVivaGraphCentralityFormat(centrality) {
  return Object.keys(centrality).sort(byValue).map(toKeyValue);

  function byValue(x, y) {
    return centrality[y] - centrality[x];
  }

  function toKeyValue(key) {
    return {
      key: key,
      value: centrality[key]
    };
  }
}

},{"ngraph.centrality":18}],48:[function(require,module,exports){
/**
 * @fileOverview Contains collection of primitive operations under graph.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */
module.exports = operations;

function operations() {

    return {
        /**
         * Gets graph density, which is a ratio of actual number of edges to maximum
         * number of edges. I.e. graph density 1 means all nodes are connected with each other with an edge.
         * Density 0 - graph has no edges. Runtime: O(1)
         * 
         * @param graph represents oriented graph structure.
         * @param directed (optional boolean) represents if the graph should be treated as a directed graph.
         * 
         * @returns density of the graph if graph has nodes. NaN otherwise. Returns density for undirected graph by default but returns density for directed graph if a boolean 'true' is passed along with the graph.
         */
        density : function (graph,directed) {
            var nodes = graph.getNodesCount();
            if (nodes === 0) {
                return NaN;
            }
            if(directed){
                return graph.getLinksCount() / (nodes * (nodes - 1));
            } else {
                return 2 * graph.getLinksCount() / (nodes * (nodes - 1));
            }
        }
    };
};

},{}],49:[function(require,module,exports){
/**
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = domInputManager;

var dragndrop = require('./dragndrop.js');

function domInputManager(graph, graphics) {
  var nodeEvents = {};
  return {
    /**
     * Called by renderer to listen to drag-n-drop events from node. E.g. for SVG
     * graphics we may listen to DOM events, whereas for WebGL the graphics
     * should provide custom eventing mechanism.
     *
     * @param node - to be monitored.
     * @param handlers - object with set of three callbacks:
     *   onStart: function(),
     *   onDrag: function(e, offset),
     *   onStop: function()
     */
    bindDragNDrop: bindDragNDrop
  };

  function bindDragNDrop(node, handlers) {
    var events;
    if (handlers) {
      var nodeUI = graphics.getNodeUI(node.id);
      events = dragndrop(nodeUI);
      if (typeof handlers.onStart === 'function') {
        events.onStart(handlers.onStart);
      }
      if (typeof handlers.onDrag === 'function') {
        events.onDrag(handlers.onDrag);
      }
      if (typeof handlers.onStop === 'function') {
        events.onStop(handlers.onStop);
      }

      nodeEvents[node.id] = events;
    } else if ((events = nodeEvents[node.id])) {
      events.release();
      delete nodeEvents[node.id];
    }
  }
}

},{"./dragndrop.js":50}],50:[function(require,module,exports){
/**
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = dragndrop;

var documentEvents = require('../Utils/documentEvents.js');
var browserInfo = require('../Utils/browserInfo.js');
var findElementPosition = require('../Utils/findElementPosition.js');

// TODO: Move to input namespace
// TODO: Methods should be extracted into the prototype. This class
// does not need to consume so much memory for every tracked element
function dragndrop(element) {
    var start,
        drag,
        end,
        scroll,
        prevSelectStart,
        prevDragStart,

        startX = 0,
        startY = 0,
        dragObject,
        touchInProgress = false,
        pinchZoomLength = 0,

        getMousePos = function (e) {
            var posx = 0,
                posy = 0;

            e = e || window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            } else if (e.clientX || e.clientY) {
                posx = e.clientX + window.document.body.scrollLeft + window.document.documentElement.scrollLeft;
                posy = e.clientY + window.document.body.scrollTop + window.document.documentElement.scrollTop;
            }

            return [posx, posy];
        },

        move = function (e, clientX, clientY) {
            if (drag) {
                drag(e, {x : clientX - startX, y : clientY - startY });
            }

            startX = clientX;
            startY = clientY;
        },

        stopPropagation = function (e) {
            if (e.stopPropagation) { e.stopPropagation(); } else { e.cancelBubble = true; }
        },
        preventDefault = function (e) {
            if (e.preventDefault) { e.preventDefault(); }
        },

        handleDisabledEvent = function (e) {
            stopPropagation(e);
            return false;
        },

        handleMouseMove = function (e) {
            e = e || window.event;

            move(e, e.clientX, e.clientY);
        },

        handleMouseDown = function (e) {
            e = e || window.event;
            if (touchInProgress) {
                // modern browsers will fire mousedown for touch events too
                // we do not want this, since touch is handled separately.
                stopPropagation(e);
                return false;
            }
            // for IE, left click == 1
            // for Firefox, left click == 0
            var isLeftButton = ((e.button === 1 && window.event !== null) || e.button === 0);

            if (isLeftButton) {
                startX = e.clientX;
                startY = e.clientY;

                // TODO: bump zIndex?
                dragObject = e.target || e.srcElement;

                if (start) { start(e, {x: startX, y : startY}); }

                documentEvents.on('mousemove', handleMouseMove);
                documentEvents.on('mouseup', handleMouseUp);


                stopPropagation(e);
                // TODO: What if event already there? Not bullet proof:
                prevSelectStart = window.document.onselectstart;
                prevDragStart = window.document.ondragstart;

                window.document.onselectstart = handleDisabledEvent;
                dragObject.ondragstart = handleDisabledEvent;

                // prevent text selection (except IE)
                return false;
            }
        },

        handleMouseUp = function (e) {
            e = e || window.event;

            documentEvents.off('mousemove', handleMouseMove);
            documentEvents.off('mouseup', handleMouseUp);

            window.document.onselectstart = prevSelectStart;
            dragObject.ondragstart = prevDragStart;
            dragObject = null;
            if (end) { end(e); }
        },

        handleMouseWheel = function (e) {
            if (typeof scroll !== 'function') {
                return;
            }

            e = e || window.event;
            if (e.preventDefault) {
                e.preventDefault();
            }

            e.returnValue = false;
            var delta,
                mousePos = getMousePos(e),
                elementOffset = findElementPosition(element),
                relMousePos = {
                    x: mousePos[0] - elementOffset[0],
                    y: mousePos[1] - elementOffset[1]
                };

            if (e.wheelDelta) {
                delta = e.wheelDelta / 360; // Chrome/Safari
            } else {
                delta = e.detail / -9; // Mozilla
            }

            scroll(e, delta, relMousePos);
        },

        updateScrollEvents = function (scrollCallback) {
            if (!scroll && scrollCallback) {
                // client is interested in scrolling. Start listening to events:
                if (browserInfo.browser === 'webkit') {
                    element.addEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                } else {
                    element.addEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
                }
            } else if (scroll && !scrollCallback) {
                if (browserInfo.browser === 'webkit') {
                    element.removeEventListener('mousewheel', handleMouseWheel, false); // Chrome/Safari
                } else {
                    element.removeEventListener('DOMMouseScroll', handleMouseWheel, false); // Others
                }
            }

            scroll = scrollCallback;
        },

        getPinchZoomLength = function(finger1, finger2) {
            return (finger1.clientX - finger2.clientX) * (finger1.clientX - finger2.clientX) +
                   (finger1.clientY - finger2.clientY) * (finger1.clientY - finger2.clientY);
        },

        handleTouchMove = function (e) {
            if (e.touches.length === 1) {
                stopPropagation(e);

                var touch = e.touches[0];
                move(e, touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                // it's a zoom:
                var currentPinchLength = getPinchZoomLength(e.touches[0], e.touches[1]);
                var delta = 0;
                if (currentPinchLength < pinchZoomLength) {
                    delta = -1;
                } else if (currentPinchLength > pinchZoomLength) {
                    delta = 1;
                }
                scroll(e, delta, {x: e.touches[0].clientX, y: e.touches[0].clientY});
                pinchZoomLength = currentPinchLength;
                stopPropagation(e);
                preventDefault(e);
            }
        },

        handleTouchEnd = function (e) {
            touchInProgress = false;
            documentEvents.off('touchmove', handleTouchMove);
            documentEvents.off('touchend', handleTouchEnd);
            documentEvents.off('touchcancel', handleTouchEnd);
            dragObject = null;
            if (end) { end(e); }
        },

        handleSignleFingerTouch = function (e, touch) {
            stopPropagation(e);
            preventDefault(e);

            startX = touch.clientX;
            startY = touch.clientY;

            dragObject = e.target || e.srcElement;

            if (start) { start(e, {x: startX, y : startY}); }
            // TODO: can I enter into the state when touch is in progress
            // but it's still a single finger touch?
            if (!touchInProgress) {
                touchInProgress = true;
                documentEvents.on('touchmove', handleTouchMove);
                documentEvents.on('touchend', handleTouchEnd);
                documentEvents.on('touchcancel', handleTouchEnd);
            }
        },

        handleTouchStart = function (e) {
            if (e.touches.length === 1) {
                return handleSignleFingerTouch(e, e.touches[0]);
            } else if (e.touches.length === 2) {
                // handleTouchMove() will care about pinch zoom.
                stopPropagation(e);
                preventDefault(e);

                pinchZoomLength = getPinchZoomLength(e.touches[0], e.touches[1]);

            }
            // don't care about the rest.
        };


    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('touchstart', handleTouchStart);

    return {
        onStart : function (callback) {
            start = callback;
            return this;
        },

        onDrag : function (callback) {
            drag = callback;
            return this;
        },

        onStop : function (callback) {
            end = callback;
            return this;
        },

        /**
         * Occurs when mouse wheel event happens. callback = function(e, scrollDelta, scrollPoint);
         */
        onScroll : function (callback) {
            updateScrollEvents(callback);
            return this;
        },

        release : function () {
            // TODO: could be unsafe. We might wanna release dragObject, etc.
            element.removeEventListener('mousedown', handleMouseDown);
            element.removeEventListener('touchstart', handleTouchStart);

            documentEvents.off('mousemove', handleMouseMove);
            documentEvents.off('mouseup', handleMouseUp);
            documentEvents.off('touchmove', handleTouchMove);
            documentEvents.off('touchend', handleTouchEnd);
            documentEvents.off('touchcancel', handleTouchEnd);

            updateScrollEvents(null);
        }
    };
}

},{"../Utils/browserInfo.js":54,"../Utils/documentEvents.js":55,"../Utils/findElementPosition.js":56}],51:[function(require,module,exports){
/**
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = webglInputManager;

var createInputEvents = require('../WebGL/webglInputEvents.js');

function webglInputManager(graph, graphics) {
    var inputEvents = createInputEvents(graphics),
        draggedNode = null,
        internalHandlers = {},
        pos = {x : 0, y : 0};

    inputEvents.mouseDown(function (node, e) {
        draggedNode = node;
        pos.x = e.clientX;
        pos.y = e.clientY;

        inputEvents.mouseCapture(draggedNode);

        var handlers = internalHandlers[node.id];
        if (handlers && handlers.onStart) {
            handlers.onStart(e, pos);
        }

        return true;
    }).mouseUp(function (node) {
        inputEvents.releaseMouseCapture(draggedNode);

        draggedNode = null;
        var handlers = internalHandlers[node.id];
        if (handlers && handlers.onStop) {
            handlers.onStop();
        }
        return true;
    }).mouseMove(function (node, e) {
        if (draggedNode) {
            var handlers = internalHandlers[draggedNode.id];
            if (handlers && handlers.onDrag) {
                handlers.onDrag(e, {x : e.clientX - pos.x, y : e.clientY - pos.y });
            }

            pos.x = e.clientX;
            pos.y = e.clientY;
            return true;
        }
    });

    return {
        /**
         * Called by renderer to listen to drag-n-drop events from node. E.g. for SVG
         * graphics we may listen to DOM events, whereas for WebGL we graphics
         * should provide custom eventing mechanism.
         *
         * @param node - to be monitored.
         * @param handlers - object with set of three callbacks:
         *   onStart: function(),
         *   onDrag: function(e, offset),
         *   onStop: function()
         */
        bindDragNDrop : function (node, handlers) {
            internalHandlers[node.id] = handlers;
            if (!handlers) {
                delete internalHandlers[node.id];
            }
        }
    };
}

},{"../WebGL/webglInputEvents.js":72}],52:[function(require,module,exports){
module.exports = constant;

var merge = require('ngraph.merge');
var random = require('ngraph.random').random;
var Rect = require('../Utils/rect.js');

/**
 * Does not really perform any layouting algorithm but is compliant
 * with renderer interface. Allowing clients to provide specific positioning
 * callback and get static layout of the graph
 *
 * @param {Viva.Graph.graph} graph to layout
 * @param {Object} userSettings
 */
function constant(graph, userSettings) {
    userSettings = merge(userSettings, {
        maxX : 1024,
        maxY : 1024,
        seed : 'Deterministic randomness made me do this'
    });
    // This class simply follows API, it does not use some of the arguments:
    /*jshint unused: false */
    var rand = random(userSettings.seed),
        graphRect = new Rect(Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE),
        layoutLinks = {},

        placeNodeCallback = function (node) {
            return {
              x: rand.next(userSettings.maxX),
              y: rand.next(userSettings.maxY)
            };
        },

        updateGraphRect = function (position, graphRect) {
            if (position.x < graphRect.x1) { graphRect.x1 = position.x; }
            if (position.x > graphRect.x2) { graphRect.x2 = position.x; }
            if (position.y < graphRect.y1) { graphRect.y1 = position.y; }
            if (position.y > graphRect.y2) { graphRect.y2 = position.y; }
        },

        layoutNodes = typeof Object.create === 'function' ? Object.create(null) : {},

        ensureNodeInitialized = function (node) {
            layoutNodes[node.id] = placeNodeCallback(node);
            updateGraphRect(layoutNodes[node.id], graphRect);
        },

        updateNodePositions = function () {
            if (graph.getNodesCount() === 0) { return; }

            graphRect.x1 = Number.MAX_VALUE;
            graphRect.y1 = Number.MAX_VALUE;
            graphRect.x2 = Number.MIN_VALUE;
            graphRect.y2 = Number.MIN_VALUE;

            graph.forEachNode(ensureNodeInitialized);
        },

        ensureLinkInitialized = function (link) {
          layoutLinks[link.id] = link;
        },

        onGraphChanged = function(changes) {
            for (var i = 0; i < changes.length; ++i) {
                var change = changes[i];
                if (change.node) {
                    if (change.changeType === 'add') {
                        ensureNodeInitialized(change.node);
                    } else {
                        delete layoutNodes[change.node.id];
                    }
                } if (change.link) {
                    if (change.changeType === 'add') {
                        ensureLinkInitialized(change.link);
                    } else {
                        delete layoutLinks[change.link.id];
                    }
                }
            }
        };

    graph.forEachNode(ensureNodeInitialized);
    graph.forEachLink(ensureLinkInitialized);
    graph.on('changed', onGraphChanged);

    return {
        /**
         * Attempts to layout graph within given number of iterations.
         *
         * @param {integer} [iterationsCount] number of algorithm's iterations.
         *  The constant layout ignores this parameter.
         */
        run : function (iterationsCount) {
            this.step();
        },

        /**
         * One step of layout algorithm.
         */
        step : function () {
            updateNodePositions();

            return true; // no need to continue.
        },

        /**
         * Returns rectangle structure {x1, y1, x2, y2}, which represents
         * current space occupied by graph.
         */
        getGraphRect : function () {
            return graphRect;
        },

        /**
         * Request to release all resources
         */
        dispose : function () {
            graph.off('change', onGraphChanged);
        },

        /*
         * Checks whether given node is pinned; all nodes in this layout are pinned.
         */
        isNodePinned: function (node) {
            return true;
        },

        /*
         * Requests layout algorithm to pin/unpin node to its current position
         * Pinned nodes should not be affected by layout algorithm and always
         * remain at their position
         */
        pinNode: function (node, isPinned) {
           // noop
        },

        /*
         * Gets position of a node by its id. If node was not seen by this
         * layout algorithm undefined value is returned;
         */
        getNodePosition: getNodePosition,

        /**
         * Returns {from, to} position of a link.
         */
        getLinkPosition: function (linkId) {
          var link = layoutLinks[linkId];
          return {
              from : getNodePosition(link.fromId),
              to : getNodePosition(link.toId)
          };
        },

        /**
         * Sets position of a node to a given coordinates
         */
        setNodePosition: function (nodeId, x, y) {
            var pos = layoutNodes[nodeId];
            if (pos) {
                pos.x = x;
                pos.y = y;
            }
        },

        // Layout specific methods:

        /**
         * Based on argument either update default node placement callback or
         * attempts to place given node using current placement callback.
         * Setting new node callback triggers position update for all nodes.
         *
         * @param {Object} newPlaceNodeCallbackOrNode - if it is a function then
         * default node placement callback is replaced with new one. Node placement
         * callback has a form of function (node) {}, and is expected to return an
         * object with x and y properties set to numbers.
         *
         * Otherwise if it's not a function the argument is treated as graph node
         * and current node placement callback will be used to place it.
         */
        placeNode : function (newPlaceNodeCallbackOrNode) {
            if (typeof newPlaceNodeCallbackOrNode === 'function') {
                placeNodeCallback = newPlaceNodeCallbackOrNode;
                updateNodePositions();
                return this;
            }

            // it is not a request to update placeNodeCallback, trying to place
            // a node using current callback:
            return placeNodeCallback(newPlaceNodeCallbackOrNode);
        }

    };

    function getNodePosition(nodeId) {
        return layoutNodes[nodeId];
    }
}

},{"../Utils/rect.js":60,"ngraph.merge":39,"ngraph.random":40}],53:[function(require,module,exports){
/**
 * This module provides compatibility layer with 0.6.x library. It will be
 * removed in the next version
 */

var events = require('ngraph.events');

module.exports = backwardCompatibleEvents;

function backwardCompatibleEvents(g) {
  console.log("This method is deprecated. Please use Viva.events() instead");

  if (!g) {
    return g;
  }

  var eventsDefined = (g.on !== undefined) ||
    (g.off !== undefined) ||
    (g.fire !== undefined);

  if (eventsDefined) {
    // events already defined, ignore
    return {
      extend: function() {
        return g;
      },
      on: g.on,
      stop: g.off
    };
  }

  return {
    extend: extend,
    on: g.on,
    stop: g.off
  };

  function extend() {
    var backwardCompatible = events(g);
    backwardCompatible.addEventListener = backwardCompatible.on;
    return backwardCompatible;
  }
}

},{"ngraph.events":21}],54:[function(require,module,exports){
module.exports = browserInfo();

function browserInfo() {
  if (typeof window === "undefined" || !window.hasOwnProperty("navigator")) {
    return {
      browser : "",
      version : "0"
    };
  }

  var ua = window.navigator.userAgent.toLowerCase(),
  // Useragent RegExp
  rwebkit = /(webkit)[ \/]([\w.]+)/,
  ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
  rmsie = /(msie) ([\w.]+)/,
  rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/,
  match = rwebkit.exec(ua) ||
    ropera.exec(ua) ||
    rmsie.exec(ua) ||
    (ua.indexOf("compatible") < 0 && rmozilla.exec(ua)) ||
    [];

  return {
    browser: match[1] || "",
    version: match[2] || "0"
  };
}

},{}],55:[function(require,module,exports){
var nullEvents = require('./nullEvents.js');

module.exports = createDocumentEvents();

function createDocumentEvents() {
  if (typeof document === undefined) {
    return nullEvents;
  }

  return {
    on: on,
    off: off
  };
}

function on(eventName, handler) {
  document.addEventListener(eventName, handler);
}

function off(eventName, handler) {
  document.removeEventListener(eventName, handler);
}

},{"./nullEvents.js":59}],56:[function(require,module,exports){
/**
 * Finds the absolute position of an element on a page
 */
module.exports = findElementPosition;

function findElementPosition(obj) {
    var curleft = 0,
        curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while ((obj = obj.offsetParent) !== null);
    }

    return [curleft, curtop];
}

},{}],57:[function(require,module,exports){
module.exports = getDimension;

function getDimension(container) {
    if (!container) {
        throw {
            message : 'Cannot get dimensions of undefined container'
        };
    }

    // TODO: Potential cross browser bug.
    var width = container.clientWidth;
    var height = container.clientHeight;

    return {
        left : 0,
        top : 0,
        width : width,
        height : height
    };
}

},{}],58:[function(require,module,exports){
var intersect = require('gintersect');

module.exports = intersectRect;

function intersectRect(left, top, right, bottom, x1, y1, x2, y2) {
  return intersect(left, top, left, bottom, x1, y1, x2, y2) ||
    intersect(left, bottom, right, bottom, x1, y1, x2, y2) ||
    intersect(right, bottom, right, top, x1, y1, x2, y2) ||
    intersect(right, top, left, top, x1, y1, x2, y2);
}

},{"gintersect":17}],59:[function(require,module,exports){
module.exports = createNullEvents();

function createNullEvents() {
  return {
    on: noop,
    off: noop,
    stop: noop
  };
}

function noop() { }

},{}],60:[function(require,module,exports){
module.exports = Rect;

/**
 * Very generic rectangle.
 */
function Rect (x1, y1, x2, y2) {
    this.x1 = x1 || 0;
    this.y1 = y1 || 0;
    this.x2 = x2 || 0;
    this.y2 = y2 || 0;
}

},{}],61:[function(require,module,exports){
(function (global){
/**
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

module.exports = createTimer();

function createTimer() {
  var lastTime = 0,
    vendors = ['ms', 'moz', 'webkit', 'o'],
    i,
    scope;

  if (typeof window !== 'undefined') {
    scope = window;
  } else if (typeof global !== 'undefined') {
    scope = global;
  } else {
    scope = {
      setTimeout: noop,
      clearTimeout: noop
    };
  }

  for (i = 0; i < vendors.length && !scope.requestAnimationFrame; ++i) {
    var vendorPrefix = vendors[i];
    scope.requestAnimationFrame = scope[vendorPrefix + 'RequestAnimationFrame'];
    scope.cancelAnimationFrame =
      scope[vendorPrefix + 'CancelAnimationFrame'] || scope[vendorPrefix + 'CancelRequestAnimationFrame'];
  }

  if (!scope.requestAnimationFrame) {
    scope.requestAnimationFrame = rafPolyfill;
  }

  if (!scope.cancelAnimationFrame) {
    scope.cancelAnimationFrame = cancelRafPolyfill;
  }

  return timer;

  /**
   * Timer that fires callback with given interval (in ms) until
   * callback returns true;
   */
  function timer(callback) {
    var intervalId;
    startTimer(); // start it right away.

    return {
      /**
       * Stops execution of the callback
       */
      stop: stopTimer,

      restart: restart
    };

    function startTimer() {
      intervalId = scope.requestAnimationFrame(startTimer);
      if (!callback()) {
        stopTimer();
      }
    }

    function stopTimer() {
      scope.cancelAnimationFrame(intervalId);
      intervalId = 0;
    }

    function restart() {
      if (!intervalId) {
        startTimer();
      }
    }
  }

  function rafPolyfill(callback) {
    var currTime = new Date().getTime();
    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
    var id = scope.setTimeout(function() {
      callback(currTime + timeToCall);
    }, timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  }

  function cancelRafPolyfill(id) {
    scope.clearTimeout(id);
  }
}

function noop() {}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],62:[function(require,module,exports){
var nullEvents = require('./nullEvents.js');

module.exports = createDocumentEvents();

function createDocumentEvents() {
  if (typeof window === undefined) {
    return nullEvents;
  }

  return {
    on: on,
    off: off
  };
}

function on(eventName, handler) {
  window.addEventListener(eventName, handler);
}

function off(eventName, handler) {
  window.removeEventListener(eventName, handler);
}


},{"./nullEvents.js":59}],63:[function(require,module,exports){
/**
 * @fileOverview Defines a graph renderer that uses CSS based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = renderer;

var eventify = require('ngraph.events');
var forceDirected = require('ngraph.forcelayout');
var svgGraphics = require('./svgGraphics.js');
var windowEvents = require('../Utils/windowEvents.js');
var domInputManager = require('../Input/domInputManager.js');
var timer = require('../Utils/timer.js');
var getDimension = require('../Utils/getDimensions.js');
var dragndrop = require('../Input/dragndrop.js');

/**
 * This is heart of the rendering. Class accepts graph to be rendered and rendering settings.
 * It monitors graph changes and depicts them accordingly.
 *
 * @param graph - Viva.Graph.graph() object to be rendered.
 * @param settings - rendering settings, composed from the following parts (with their defaults shown):
 *   settings = {
 *     // Represents a module that is capable of displaying graph nodes and links.
 *     // all graphics has to correspond to defined interface and can be later easily
 *     // replaced for specific needs (e.g. adding WebGL should be piece of cake as long
 *     // as WebGL has implemented required interface). See svgGraphics for example.
 *     graphics : Viva.Graph.View.svgGraphics(),
 *
 *     // Where the renderer should draw graph. Container size matters, because
 *     // renderer will attempt center graph to that size. Also graphics modules
 *     // might depend on it.
 *     container : document.body,
 *
 *     // Defines whether graph can respond to use input
 *     interactive: true,
 *
 *     // Layout algorithm to be used. The algorithm is expected to comply with defined
 *     // interface and is expected to be iterative. Renderer will use it then to calculate
 *     // grpaph's layout. For examples of the interface refer to Viva.Graph.Layout.forceDirected()
 *     layout : Viva.Graph.Layout.forceDirected(),
 *
 *     // Directs renderer to display links. Usually rendering links is the slowest part of this
 *     // library. So if you don't need to display links, consider settings this property to false.
 *     renderLinks : true,
 *
 *     // Number of layout iterations to run before displaying the graph. The bigger you set this number
 *     // the closer to ideal position graph will appear first time. But be careful: for large graphs
 *     // it can freeze the browser.
 *     prerender : 0
 *   }
 */
function renderer(graph, settings) {
  // TODO: This class is getting hard to understand. Consider refactoring.
  // TODO: I have a technical debt here: fix scaling/recentering! Currently it's a total mess.
  var FRAME_INTERVAL = 30;

  settings = settings || {};

  var layout = settings.layout,
    graphics = settings.graphics,
    container = settings.container,
    interactive = settings.interactive !== undefined ? settings.interactive : true,
    inputManager,
    animationTimer,
    rendererInitialized = false,
    updateCenterRequired = true,

    currentStep = 0,
    totalIterationsCount = 0,
    isStable = false,
    userInteraction = false,
    isPaused = false,

    transform = {
      offsetX: 0,
      offsetY: 0,
      scale: 1
    },

    publicEvents = eventify({}),
    containerDrag;

  return {
    /**
     * Performs rendering of the graph.
     *
     * @param iterationsCount if specified renderer will run only given number of iterations
     * and then stop. Otherwise graph rendering is performed infinitely.
     *
     * Note: if rendering stopped by used started dragging nodes or new nodes were added to the
     * graph renderer will give run more iterations to reflect changes.
     */
    run: function(iterationsCount) {

      if (!rendererInitialized) {
        prepareSettings();
        prerender();

        initDom();
        updateCenter();
        listenToEvents();

        rendererInitialized = true;
      }

      renderIterations(iterationsCount);

      return this;
    },

    reset: function() {
      graphics.resetScale();
      updateCenter();
      transform.scale = 1;
    },

    pause: function() {
      isPaused = true;
      animationTimer.stop();
    },

    resume: function() {
      isPaused = false;
      animationTimer.restart();
    },

    rerender: function() {
      renderGraph();
      return this;
    },

    zoomOut: function() {
      return scale(true);
    },

    zoomIn: function() {
      return scale(false);
    },

    /**
     * Centers renderer at x,y graph's coordinates
     */
    moveTo: function(x, y) {
      graphics.graphCenterChanged(transform.offsetX - x * transform.scale, transform.offsetY - y * transform.scale);
      renderGraph();
    },

    /**
     * Gets current graphics object
     */
    getGraphics: function() {
      return graphics;
    },

    /**
     * Removes this renderer and deallocates all resources/timers
     */
    dispose: function() {
      stopListenToEvents(); // I quit!
    },

    on: function(eventName, callback) {
      publicEvents.on(eventName, callback);
      return this;
    },

    off: function(eventName, callback) {
      publicEvents.off(eventName, callback);
      return this;
    }
  };

  /**
   * Checks whether given interaction (node/scroll) is enabled
   */
  function isInteractive(interactionName) {
    if (typeof interactive === 'string') {
      return interactive.indexOf(interactionName) >= 0;
    } else if (typeof interactive === 'boolean') {
      return interactive;
    }
    return true; // default setting
  }

  function prepareSettings() {
    container = container || window.document.body;
    layout = layout || forceDirected(graph, {
      springLength: 80,
      springCoeff: 0.0002,
    });
    graphics = graphics || svgGraphics(graph, {
      container: container
    });

    if (!settings.hasOwnProperty('renderLinks')) {
      settings.renderLinks = true;
    }

    settings.prerender = settings.prerender || 0;
    inputManager = (graphics.inputManager || domInputManager)(graph, graphics);
  }

  function renderGraph() {
    graphics.beginRender();

    // todo: move this check graphics
    if (settings.renderLinks) {
      graphics.renderLinks();
    }
    graphics.renderNodes();
    graphics.endRender();
  }

  function onRenderFrame() {
    isStable = layout.step() && !userInteraction;
    renderGraph();

    return !isStable;
  }

  function renderIterations(iterationsCount) {
    if (animationTimer) {
      totalIterationsCount += iterationsCount;
      return;
    }

    if (iterationsCount) {
      totalIterationsCount += iterationsCount;

      animationTimer = timer(function() {
        return onRenderFrame();
      }, FRAME_INTERVAL);
    } else {
      currentStep = 0;
      totalIterationsCount = 0;
      animationTimer = timer(onRenderFrame, FRAME_INTERVAL);
    }
  }

  function resetStable() {
    if (isPaused) {
      return;
    }

    isStable = false;
    animationTimer.restart();
  }

  function prerender() {
    // To get good initial positions for the graph
    // perform several prerender steps in background.
    if (typeof settings.prerender === 'number' && settings.prerender > 0) {
      for (var i = 0; i < settings.prerender; i += 1) {
        layout.step();
      }
    }
  }

  function updateCenter() {
    var graphRect = layout.getGraphRect(),
      containerSize = getDimension(container);

    var cx = (graphRect.x2 + graphRect.x1) / 2;
    var cy = (graphRect.y2 + graphRect.y1) / 2;
    transform.offsetX = containerSize.width / 2 - (cx * transform.scale - cx);
    transform.offsetY = containerSize.height / 2 - (cy * transform.scale - cy);
    graphics.graphCenterChanged(transform.offsetX, transform.offsetY);

    updateCenterRequired = false;
  }

  function createNodeUi(node) {
    var nodePosition = layout.getNodePosition(node.id);
    graphics.addNode(node, nodePosition);
  }

  function removeNodeUi(node) {
    graphics.releaseNode(node);
  }

  function createLinkUi(link) {
    var linkPosition = layout.getLinkPosition(link.id);
    graphics.addLink(link, linkPosition);
  }

  function removeLinkUi(link) {
    graphics.releaseLink(link);
  }

  function listenNodeEvents(node) {
    if (!isInteractive('node')) {
      return;
    }

    var wasPinned = false;

    // TODO: This may not be memory efficient. Consider reusing handlers object.
    inputManager.bindDragNDrop(node, {
      onStart: function() {
        wasPinned = layout.isNodePinned(node);
        layout.pinNode(node, true);
        userInteraction = true;
        resetStable();
      },
      onDrag: function(e, offset) {
        var oldPos = layout.getNodePosition(node.id);
        layout.setNodePosition(node.id,
          oldPos.x + offset.x / transform.scale,
          oldPos.y + offset.y / transform.scale);

        userInteraction = true;

        renderGraph();
      },
      onStop: function() {
        layout.pinNode(node, wasPinned);
        userInteraction = false;
      }
    });
  }

  function releaseNodeEvents(node) {
    inputManager.bindDragNDrop(node, null);
  }

  function initDom() {
    graphics.init(container);

    graph.forEachNode(createNodeUi);

    if (settings.renderLinks) {
      graph.forEachLink(createLinkUi);
    }
  }

  function releaseDom() {
    graphics.release(container);
  }

  function processNodeChange(change) {
    var node = change.node;

    if (change.changeType === 'add') {
      createNodeUi(node);
      listenNodeEvents(node);
      if (updateCenterRequired) {
        updateCenter();
      }
    } else if (change.changeType === 'remove') {
      releaseNodeEvents(node);
      removeNodeUi(node);
      if (graph.getNodesCount() === 0) {
        updateCenterRequired = true; // Next time when node is added - center the graph.
      }
    } else if (change.changeType === 'update') {
      releaseNodeEvents(node);
      removeNodeUi(node);

      createNodeUi(node);
      listenNodeEvents(node);
    }
  }

  function processLinkChange(change) {
    var link = change.link;
    if (change.changeType === 'add') {
      if (settings.renderLinks) {
        createLinkUi(link);
      }
    } else if (change.changeType === 'remove') {
      if (settings.renderLinks) {
        removeLinkUi(link);
      }
    } else if (change.changeType === 'update') {
      throw 'Update type is not implemented. TODO: Implement me!';
    }
  }

  function onGraphChanged(changes) {
    var i, change;
    for (i = 0; i < changes.length; i += 1) {
      change = changes[i];
      if (change.node) {
        processNodeChange(change);
      } else if (change.link) {
        processLinkChange(change);
      }
    }

    resetStable();
  }

  function onWindowResized() {
    updateCenter();
    onRenderFrame();
  }

  function releaseContainerDragManager() {
    if (containerDrag) {
      containerDrag.release();
      containerDrag = null;
    }
  }

  function releaseGraphEvents() {
    graph.off('changed', onGraphChanged);
  }

  function scale(out, scrollPoint) {
    if (!scrollPoint) {
      var containerSize = getDimension(container);
      scrollPoint = {
        x: containerSize.width / 2,
        y: containerSize.height / 2
      };
    }
    var scaleFactor = Math.pow(1 + 0.4, out ? -0.2 : 0.2);
    transform.scale = graphics.scale(scaleFactor, scrollPoint);

    renderGraph();
    publicEvents.fire('scale', transform.scale);

    return transform.scale;
  }

  function listenToEvents() {
    windowEvents.on('resize', onWindowResized);

    releaseContainerDragManager();
    if (isInteractive('drag')) {
      containerDrag = dragndrop(container);
      containerDrag.onDrag(function(e, offset) {
        graphics.translateRel(offset.x, offset.y);

        renderGraph();
      });
    }

    if (isInteractive('scroll')) {
      if (!containerDrag) {
        containerDrag = dragndrop(container);
      }
      containerDrag.onScroll(function(e, scaleOffset, scrollPoint) {
        scale(scaleOffset < 0, scrollPoint);
      });
    }

    graph.forEachNode(listenNodeEvents);

    releaseGraphEvents();
    graph.on('changed', onGraphChanged);
  }

  function stopListenToEvents() {
    rendererInitialized = false;
    releaseGraphEvents();
    releaseContainerDragManager();
    windowEvents.off('resize', onWindowResized);
    publicEvents.off();
    animationTimer.stop();

    graph.forEachLink(function(link) {
      if (settings.renderLinks) {
        removeLinkUi(link);
      }
    });

    graph.forEachNode(function(node) {
      releaseNodeEvents(node);
      removeNodeUi(node);
    });

    layout.dispose();
    releaseDom();
  }
}

},{"../Input/domInputManager.js":49,"../Input/dragndrop.js":50,"../Utils/getDimensions.js":57,"../Utils/timer.js":61,"../Utils/windowEvents.js":62,"./svgGraphics.js":64,"ngraph.events":21,"ngraph.forcelayout":22}],64:[function(require,module,exports){
/**
 * @fileOverview Defines a graph renderer that uses SVG based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

module.exports = svgGraphics;

var svg = require('simplesvg');
var eventify = require('ngraph.events');
var domInputManager = require('../Input/domInputManager.js');

/**
 * Performs svg-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edges of the graph.
 */
function svgGraphics() {
    var svgContainer,
        svgRoot,
        offsetX = 0,
        offsetY = 0,
        initCallback,
        actualScale = 1,
        allNodes = {},
        allLinks = {},
/*jshint unused: false */
        nodeBuilder = function (node) {
            return svg("rect")
                     .attr("width", 10)
                     .attr("height", 10)
                     .attr("fill", "#00a2e8");
        },

        nodePositionCallback = function (nodeUI, pos) {
            // TODO: Remove magic 5. It should be half of the width or height of the node.
            nodeUI.attr("x", pos.x - 5)
                  .attr("y", pos.y - 5);
        },

        linkBuilder = function (link) {
            return svg("line").attr("stroke", "#999");
        },

        linkPositionCallback = function (linkUI, fromPos, toPos) {
            linkUI.attr("x1", fromPos.x)
                  .attr("y1", fromPos.y)
                  .attr("x2", toPos.x)
                  .attr("y2", toPos.y);
        },

        fireRescaled = function (graphics) {
            // TODO: maybe we shall copy changes?
            graphics.fire("rescaled");
        },

        cachedPos = {x : 0, y: 0},
        cachedFromPos = {x : 0, y: 0},
        cachedToPos = {x : 0, y: 0},

        updateTransform = function () {
            if (svgContainer) {
                var transform = "matrix(" + actualScale + ", 0, 0," + actualScale + "," + offsetX + "," + offsetY + ")";
                svgContainer.attr("transform", transform);
            }
        };

    svgRoot = createSvgRoot();

    var graphics = {
        getNodeUI: function (nodeId) {
            return allNodes[nodeId];
        },

        getLinkUI: function (linkId) {
            return allLinks[linkId];
        },

        /**
         * Sets the callback that creates node representation.
         *
         * @param builderCallback a callback function that accepts graph node
         * as a parameter and must return an element representing this node.
         *
         * @returns If builderCallbackOrNode is a valid callback function, instance of this is returned;
         * Otherwise undefined value is returned
         */
        node : function (builderCallback) {
            if (typeof builderCallback !== "function") {
                return; // todo: throw? This is not compatible with old versions
            }

            nodeBuilder = builderCallback;

            return this;
        },

        /**
         * Sets the callback that creates link representation
         *
         * @param builderCallback a callback function that accepts graph link
         * as a parameter and must return an element representing this link.
         *
         * @returns If builderCallback is a valid callback function, instance of this is returned;
         * Otherwise undefined value is returned.
         */
        link : function (builderCallback) {
            if (typeof builderCallback !== "function") {
                return; // todo: throw? This is not compatible with old versions
            }

            linkBuilder = builderCallback;
            return this;
        },

        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(nodeUI, position, node) is function which
         * is used by updateNodePosition().
         */
        placeNode : function (newPlaceCallback) {
            nodePositionCallback = newPlaceCallback;
            return this;
        },

        placeLink : function (newPlaceLinkCallback) {
            linkPositionCallback = newPlaceLinkCallback;
            return this;
        },

        /**
         * Called every before renderer starts rendering.
         */
        beginRender : function () {},

        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function () {},

        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        graphCenterChanged : function (x, y) {
            offsetX = x;
            offsetY = y;
            updateTransform();
        },

        /**
         * Default input manager listens to DOM events to process nodes drag-n-drop
         */
        inputManager : domInputManager,

        translateRel : function (dx, dy) {
            var p = svgRoot.createSVGPoint(),
                t = svgContainer.getCTM(),
                origin = svgRoot.createSVGPoint().matrixTransform(t.inverse());

            p.x = dx;
            p.y = dy;

            p = p.matrixTransform(t.inverse());
            p.x = (p.x - origin.x) * t.a;
            p.y = (p.y - origin.y) * t.d;

            t.e += p.x;
            t.f += p.y;

            var transform = "matrix(" + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            svgContainer.attr("transform", transform);
        },

        scale : function (scaleFactor, scrollPoint) {
            var p = svgRoot.createSVGPoint();
            p.x = scrollPoint.x;
            p.y = scrollPoint.y;

            p = p.matrixTransform(svgContainer.getCTM().inverse()); // translate to SVG coordinates

            // Compute new scale matrix in current mouse position
            var k = svgRoot.createSVGMatrix().translate(p.x, p.y).scale(scaleFactor).translate(-p.x, -p.y),
                t = svgContainer.getCTM().multiply(k);

            actualScale = t.a;
            offsetX = t.e;
            offsetY = t.f;
            var transform = "matrix(" + t.a + ", 0, 0," + t.d + "," + t.e + "," + t.f + ")";
            svgContainer.attr("transform", transform);

            fireRescaled(this);
            return actualScale;
        },

        resetScale : function () {
            actualScale = 1;
            var transform = "matrix(1, 0, 0, 1, 0, 0)";
            svgContainer.attr("transform", transform);
            fireRescaled(this);
            return this;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render.
        */
        init : function (container) {
            container.appendChild(svgRoot);
            updateTransform();
            // Notify the world if someone waited for update. TODO: should send an event
            if (typeof initCallback === "function") {
                initCallback(svgRoot);
            }
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider release occupied resources.
        */
        release : function (container) {
            if (svgRoot && container) {
                container.removeChild(svgRoot);
            }
        },

        /**
         * Called by Viva.Graph.View.renderer to let concrete graphic output
         * provider prepare to render given link of the graph
         *
         * @param link - model of a link
         */
        addLink: function (link, pos) {
            var linkUI = linkBuilder(link);
            if (!linkUI) { return; }
            linkUI.position = pos;
            linkUI.link = link;
            allLinks[link.id] = linkUI;
            if (svgContainer.childElementCount > 0) {
                svgContainer.insertBefore(linkUI, svgContainer.firstChild);
            } else {
                svgContainer.appendChild(linkUI);
            }
            return linkUI;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider remove link from rendering surface.
        *
        * @param linkUI visual representation of the link created by link() execution.
        **/
        releaseLink : function (link) {
            var linkUI = allLinks[link.id];
            if (linkUI) {
                svgContainer.removeChild(linkUI);
                delete allLinks[link.id];
            }
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given node of the graph.
        *
        * @param nodeUI visual representation of the node created by node() execution.
        **/
        addNode : function (node, pos) {
            var nodeUI = nodeBuilder(node);
            if (!nodeUI) {
                return;
            }
            nodeUI.position = pos;
            nodeUI.node = node;
            allNodes[node.id] = nodeUI;

            svgContainer.appendChild(nodeUI);

            return nodeUI;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider remove node from rendering surface.
        *
        * @param node graph's node
        **/
        releaseNode : function (node) {
            var nodeUI = allNodes[node.id];
            if (nodeUI) {
                svgContainer.removeChild(nodeUI);
                delete allNodes[node.id];
            }
        },

        renderNodes : function () {
            for (var key in allNodes) {
                if (allNodes.hasOwnProperty(key)) {
                    var nodeUI = allNodes[key];
                    cachedPos.x = nodeUI.position.x;
                    cachedPos.y = nodeUI.position.y;
                    nodePositionCallback(nodeUI, cachedPos, nodeUI.node);
                }
            }
        },

        renderLinks : function () {
            for (var key in allLinks) {
                if (allLinks.hasOwnProperty(key)) {
                    var linkUI = allLinks[key];
                    cachedFromPos.x = linkUI.position.from.x;
                    cachedFromPos.y = linkUI.position.from.y;
                    cachedToPos.x = linkUI.position.to.x;
                    cachedToPos.y = linkUI.position.to.y;
                    linkPositionCallback(linkUI, cachedFromPos, cachedToPos, linkUI.link);
                }
            }
        },

        /**
         * Returns root element which hosts graphics.
         */
        getGraphicsRoot : function (callbackWhenReady) {
            // todo: should fire an event, instead of having this context.
            if (typeof callbackWhenReady === "function") {
                if (svgRoot) {
                    callbackWhenReady(svgRoot);
                } else {
                    initCallback = callbackWhenReady;
                }
            }
            return svgRoot;
        },
        /**
         * Returns root SVG element.
         *
         * Note: This is internal method specific to this renderer
         */
        getSvgRoot : function () {
            return svgRoot;
        }
    };


    // Let graphics fire events before we return it to the caller.
    eventify(graphics);

    return graphics;

    function createSvgRoot() {
        var svgRoot = svg("svg");

        svgContainer = svg("g")
              .attr("buffered-rendering", "dynamic");

        svgRoot.appendChild(svgContainer);
        return svgRoot;
    }
}

},{"../Input/domInputManager.js":49,"ngraph.events":21,"simplesvg":42}],65:[function(require,module,exports){
/**
 * @fileOverview Defines a graph renderer that uses WebGL based drawings.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

module.exports = webglGraphics;

var webglInputManager = require('../Input/webglInputManager.js');
var webglLinkProgram = require('../WebGL/webglLinkProgram.js');
var webglNodeProgram = require('../WebGL/webglNodeProgram.js');
var webglSquare = require('../WebGL/webglSquare.js');
var webglLine = require('../WebGL/webglLine.js');
var eventify = require('ngraph.events');
var merge = require('ngraph.merge');

/**
 * Performs webgl-based graph rendering. This module does not perform
 * layout, but only visualizes nodes and edges of the graph.
 *
 * @param options - to customize graphics  behavior. Currently supported parameter
 *  enableBlending - true by default, allows to use transparency in node/links colors.
 *  preserveDrawingBuffer - false by default, tells webgl to preserve drawing buffer.
 *                    See https://www.khronos.org/registry/webgl/specs/1.0/#5.2
 */

function webglGraphics(options) {
    options = merge(options, {
        enableBlending : true,
        preserveDrawingBuffer : false,
        clearColor: false,
        clearColorValue : {
            r : 1,
            g : 1,
            b : 1,
            a : 1
        }
    });

    var container,
        graphicsRoot,
        gl,
        width,
        height,
        nodesCount = 0,
        linksCount = 0,
        transform = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ],
        userPlaceNodeCallback,
        userPlaceLinkCallback,
        nodes = [],
        links = [],
        initCallback,

        allNodes = {},
        allLinks = {},
        linkProgram = webglLinkProgram(),
        nodeProgram = webglNodeProgram(),
/*jshint unused: false */
        nodeUIBuilder = function (node) {
            return webglSquare(); // Just make a square, using provided gl context (a nodeProgram);
        },

        linkUIBuilder = function (link) {
            return webglLine(0xb3b3b3ff);
        },
/*jshint unused: true */
        updateTransformUniform = function () {
            linkProgram.updateTransform(transform);
            nodeProgram.updateTransform(transform);
        },

        resetScaleInternal = function () {
            transform = [1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1];
        },

        updateSize = function () {
            if (container && graphicsRoot) {
                width = graphicsRoot.width = Math.max(container.offsetWidth, 1);
                height = graphicsRoot.height = Math.max(container.offsetHeight, 1);
                if (gl) { gl.viewport(0, 0, width, height); }
                if (linkProgram) { linkProgram.updateSize(width / 2, height / 2); }
                if (nodeProgram) { nodeProgram.updateSize(width / 2, height / 2); }
            }
        },

        fireRescaled = function (graphics) {
            graphics.fire("rescaled");
        };

    graphicsRoot = window.document.createElement("canvas");

    var graphics = {
        getLinkUI: function (linkId) {
            return allLinks[linkId];
        },

        getNodeUI: function (nodeId) {
            return allNodes[nodeId];
        },

        /**
         * Sets the callback that creates node representation.
         *
         * @param builderCallback a callback function that accepts graph node
         * as a parameter and must return an element representing this node.
         *
         * @returns If builderCallbackOrNode is a valid callback function, instance of this is returned;
         * Otherwise undefined value is returned
         */
        node : function (builderCallback) {
            if (typeof builderCallback !== "function") {
                return; // todo: throw? This is not compatible with old versions
            }

            nodeUIBuilder = builderCallback;

            return this;
        },

        /**
         * Sets the callback that creates link representation
         *
         * @param builderCallback a callback function that accepts graph link
         * as a parameter and must return an element representing this link.
         *
         * @returns If builderCallback is a valid callback function, instance of this is returned;
         * Otherwise undefined value is returned.
         */
        link : function (builderCallback) {
            if (typeof builderCallback !== "function") {
                return; // todo: throw? This is not compatible with old versions
            }

            linkUIBuilder = builderCallback;
            return this;
        },


        /**
         * Allows to override default position setter for the node with a new
         * function. newPlaceCallback(nodeUI, position) is function which
         * is used by updateNodePosition().
         */
        placeNode : function (newPlaceCallback) {
            userPlaceNodeCallback = newPlaceCallback;
            return this;
        },

        placeLink : function (newPlaceLinkCallback) {
            userPlaceLinkCallback = newPlaceLinkCallback;
            return this;
        },

        /**
         * Custom input manager listens to mouse events to process nodes drag-n-drop inside WebGL canvas
         */
        inputManager : webglInputManager,

        /**
         * Called every time before renderer starts rendering.
         */
        beginRender : function () {
            // this function could be replaced by this.init,
            // based on user options.
        },

        /**
         * Called every time when renderer finishes one step of rendering.
         */
        endRender : function () {
            if (linksCount > 0) {
                linkProgram.render();
            }
            if (nodesCount > 0) {
                nodeProgram.render();
            }
        },

        bringLinkToFront : function (linkUI) {
            var frontLinkId = linkProgram.getFrontLinkId(),
                srcLinkId,
                temp;

            linkProgram.bringToFront(linkUI);

            if (frontLinkId > linkUI.id) {
                srcLinkId = linkUI.id;

                temp = links[frontLinkId];
                links[frontLinkId] = links[srcLinkId];
                links[frontLinkId].id = frontLinkId;
                links[srcLinkId] = temp;
                links[srcLinkId].id = srcLinkId;
            }
        },

        /**
         * Sets translate operation that should be applied to all nodes and links.
         */
        graphCenterChanged : function (x, y) {
            transform[12] = (2 * x / width) - 1;
            transform[13] = 1 - (2 * y / height);
            updateTransformUniform();
        },

        /**
         * Called by Viva.Graph.View.renderer to let concrete graphic output
         * provider prepare to render given link of the graph
         *
         * @param link - model of a link
         */
        addLink: function (link, boundPosition) {
            var uiid = linksCount++,
                ui = linkUIBuilder(link);
            ui.id = uiid;
            ui.pos = boundPosition;

            linkProgram.createLink(ui);

            links[uiid] = ui;
            allLinks[link.id] = ui;
            return ui;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render given node of the graph.
        *
        * @param nodeUI visual representation of the node created by node() execution.
        **/
        addNode : function (node, boundPosition) {
            var uiid = nodesCount++,
                ui = nodeUIBuilder(node);

            ui.id = uiid;
            ui.position = boundPosition;
            ui.node = node;

            nodeProgram.createNode(ui);

            nodes[uiid] = ui;
            allNodes[node.id] = ui;
            return ui;
        },

        translateRel : function (dx, dy) {
            transform[12] += (2 * transform[0] * dx / width) / transform[0];
            transform[13] -= (2 * transform[5] * dy / height) / transform[5];
            updateTransformUniform();
        },

        scale : function (scaleFactor, scrollPoint) {
            // Transform scroll point to clip-space coordinates:
            var cx = 2 * scrollPoint.x / width - 1,
                cy = 1 - (2 * scrollPoint.y) / height;

            cx -= transform[12];
            cy -= transform[13];

            transform[12] += cx * (1 - scaleFactor);
            transform[13] += cy * (1 - scaleFactor);

            transform[0] *= scaleFactor;
            transform[5] *= scaleFactor;

            updateTransformUniform();
            fireRescaled(this);

            return transform[0];
        },

        resetScale : function () {
            resetScaleInternal();

            if (gl) {
                updateSize();
                // TODO: what is this?
                // gl.useProgram(linksProgram);
                // gl.uniform2f(linksProgram.screenSize, width, height);
                updateTransformUniform();
            }
            return this;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider prepare to render.
        */
        init : function (c) {
            var contextParameters = {};

            if (options.preserveDrawingBuffer) {
                contextParameters.preserveDrawingBuffer = true;
            }

            container = c;

            updateSize();
            resetScaleInternal();
            container.appendChild(graphicsRoot);


            gl = graphicsRoot.getContext("experimental-webgl", contextParameters);
            if (!gl) {
                var msg = "Could not initialize WebGL. Seems like the browser doesn't support it.";
                window.alert(msg);
                throw msg;
            }
            if (options.enableBlending) {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.enable(gl.BLEND);
            }
            if (options.clearColor) {
                var color = options.clearColorValue;
                gl.clearColor(color.r, color.g, color.b, color.a);
                // TODO: not the best way, really. Should come up with something better
                // what if we need more updates inside beginRender, like depth buffer?
                this.beginRender = function () {
                    gl.clear(gl.COLOR_BUFFER_BIT);
                };
            }

            linkProgram.load(gl);
            linkProgram.updateSize(width / 2, height / 2);

            nodeProgram.load(gl);
            nodeProgram.updateSize(width / 2, height / 2);

            updateTransformUniform();

            // Notify the world if someone waited for update. TODO: should send an event
            if (typeof initCallback === "function") {
                initCallback(graphicsRoot);
            }
        },

        /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider release occupied resources.
        */
        release : function (container) {
            if (graphicsRoot && container) {
                container.removeChild(graphicsRoot);
                // TODO: anything else?
            }
        },

       /**
        * Checks whether webgl is supported by this browser.
        */
        isSupported : function () {
            var c = window.document.createElement("canvas"),
                gl = c && c.getContext && c.getContext("experimental-webgl");
            return gl;
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider remove link from rendering surface.
        *
        * @param linkUI visual representation of the link created by link() execution.
        **/
        releaseLink : function (link) {
            if (linksCount > 0) { linksCount -= 1; }
            var linkUI = allLinks[link.id];
            delete allLinks[link.id];

            linkProgram.removeLink(linkUI);

            var linkIdToRemove = linkUI.id;
            if (linkIdToRemove < linksCount) {
                if (linksCount === 0 || linksCount === linkIdToRemove) {
                    return; // no more links or removed link is the last one.
                }

                var lastLinkUI = links[linksCount];
                links[linkIdToRemove] = lastLinkUI;
                lastLinkUI.id = linkIdToRemove;
            }
        },

       /**
        * Called by Viva.Graph.View.renderer to let concrete graphic output
        * provider remove node from rendering surface.
        *
        * @param nodeUI visual representation of the node created by node() execution.
        **/
        releaseNode : function (node) {
            if (nodesCount > 0) { nodesCount -= 1; }
            var nodeUI = allNodes[node.id];
            delete allNodes[node.id];

            nodeProgram.removeNode(nodeUI);

            var nodeIdToRemove = nodeUI.id;
            if (nodeIdToRemove < nodesCount) {
                if (nodesCount === 0 || nodesCount === nodeIdToRemove) {
                    return; // no more nodes or removed node is the last in the list.
                }

                var lastNodeUI = nodes[nodesCount];

                nodes[nodeIdToRemove] = lastNodeUI;
                lastNodeUI.id = nodeIdToRemove;

                // Since concrete shaders may cache properties in the UI element
                // we are letting them to make this swap (e.g. image node shader
                // uses this approach to update node's offset in the atlas)
                nodeProgram.replaceProperties(nodeUI, lastNodeUI);
            }
        },

        renderNodes: function () {
            var pos = {x : 0, y : 0};
            // WebGL coordinate system is different. Would be better
            // to have this transform in the shader code, but it would
            // require every shader to be updated..
            for (var i = 0; i < nodesCount; ++i) {
                var ui = nodes[i];
                pos.x = ui.position.x;
                pos.y = ui.position.y;
                if (userPlaceNodeCallback) {
                    userPlaceNodeCallback(ui, pos);
                }

                nodeProgram.position(ui, pos);
            }
        },

        renderLinks: function () {
            if (this.omitLinksRendering) { return; }

            var toPos = {x : 0, y : 0};
            var fromPos = {x : 0, y : 0};
            for (var i = 0; i < linksCount; ++i) {
                var ui = links[i];
                var pos = ui.pos.from;
                fromPos.x = pos.x;
                fromPos.y = -pos.y;
                pos = ui.pos.to;
                toPos.x = pos.x;
                toPos.y = -pos.y;
                if (userPlaceLinkCallback) {
                    userPlaceLinkCallback(ui, fromPos, toPos);
                }

                linkProgram.position(ui, fromPos, toPos);
            }
        },

        /**
         * Returns root element which hosts graphics.
         */
        getGraphicsRoot : function (callbackWhenReady) {
            // todo: should fire an event, instead of having this context.
            if (typeof callbackWhenReady === "function") {
                if (graphicsRoot) {
                    callbackWhenReady(graphicsRoot);
                } else {
                    initCallback = callbackWhenReady;
                }
            }
            return graphicsRoot;
        },

        /**
         * Updates default shader which renders nodes
         *
         * @param newProgram to use for nodes.
         */
        setNodeProgram : function (newProgram) {
            if (!gl && newProgram) {
                // Nothing created yet. Just set shader to the new one
                // and let initialization logic take care about the rest.
                nodeProgram = newProgram;
            } else if (newProgram) {
                throw "Not implemented. Cannot swap shader on the fly... Yet.";
                // TODO: unload old shader and reinit.
            }
        },

        /**
         * Updates default shader which renders links
         *
         * @param newProgram to use for links.
         */
        setLinkProgram : function (newProgram) {
            if (!gl && newProgram) {
                // Nothing created yet. Just set shader to the new one
                // and let initialization logic take care about the rest.
                linkProgram = newProgram;
            } else if (newProgram) {
                throw "Not implemented. Cannot swap shader on the fly... Yet.";
                // TODO: unload old shader and reinit.
            }
        },

        /**
         * Transforms client coordinates into layout coordinates. Client coordinates
         * are DOM coordinates relative to the rendering container. Layout
         * coordinates are those assigned by by layout algorithm to each node.
         *
         * @param {Object} p - a point object with `x` and `y` attributes.
         * This method mutates p.
         */
        transformClientToGraphCoordinates: function (p) {
          // TODO: could be a problem when container has margins?
            // normalize
            p.x = ((2 * p.x) / width) - 1;
            p.y = 1 - ((2 * p.y) / height);

            // apply transform
            p.x = (p.x - transform[12]) / transform[0];
            p.y = (p.y - transform[13]) / transform[5];

            // transform to graph coordinates
            p.x = p.x * (width / 2);
            p.y = p.y * (-height / 2);

            return p;
        },

        /**
         * Transforms WebGL coordinates into client coordinates. Reverse of 
         * `transformClientToGraphCoordinates()`
         *
         * @param {Object} p - a point object with `x` and `y` attributes, which
         * represents a layout coordinate. This method mutates p.
         */
        transformGraphToClientCoordinates: function (p) {
          // TODO: could be a problem when container has margins?
            // transform from graph coordinates
            p.x = p.x / (width / 2);
            p.y = p.y / (-height / 2);

            // apply transform
            p.x = (p.x * transform[0]) + transform[12];
            p.y = (p.y * transform[5]) + transform[13];

            // denormalize
            p.x = ((p.x + 1) * width) / 2;
            p.y = ((1 - p.y) * height) / 2;

            return p;
        },

        getNodeAtClientPos: function (clientPos, preciseCheck) {
            if (typeof preciseCheck !== "function") {
                // we don't know anything about your node structure here :(
                // potentially this could be delegated to node program, but for
                // right now, we are giving up if you don't pass boundary check
                // callback. It answers to a question is nodeUI covers  (x, y)
                return null;
            }
            // first transform to graph coordinates:
            this.transformClientToGraphCoordinates(clientPos);
            // now using precise check iterate over each node and find one within box:
            // TODO: This is poor O(N) performance.
            for (var i = 0; i < nodesCount; ++i) {
                if (preciseCheck(nodes[i], clientPos.x, clientPos.y)) {
                    return nodes[i].node;
                }
            }
            return null;
        }
    };

    // Let graphics fire events before we return it to the caller.
    eventify(graphics);

    return graphics;
}

},{"../Input/webglInputManager.js":51,"../WebGL/webglLine.js":73,"../WebGL/webglLinkProgram.js":74,"../WebGL/webglNodeProgram.js":75,"../WebGL/webglSquare.js":76,"ngraph.events":21,"ngraph.merge":39}],66:[function(require,module,exports){
module.exports = parseColor;

function parseColor(color) {
  var parsedColor = 0x009ee8ff;

  if (typeof color === 'string' && color) {
    if (color.length === 4) { // #rgb
      color = color.replace(/([^#])/g, '$1$1'); // duplicate each letter except first #.
    }
    if (color.length === 9) { // #rrggbbaa
      parsedColor = parseInt(color.substr(1), 16);
    } else if (color.length === 7) { // or #rrggbb.
      parsedColor = (parseInt(color.substr(1), 16) << 8) | 0xff;
    } else {
      throw 'Color expected in hex format with preceding "#". E.g. #00ff00. Got value: ' + color;
    }
  } else if (typeof color === 'number') {
    parsedColor = color;
  }

  return parsedColor;
}

},{}],67:[function(require,module,exports){
module.exports = Texture;

/**
 * Single texture in the webglAtlas.
 */
function Texture(size) {
  this.canvas = window.document.createElement("canvas");
  this.ctx = this.canvas.getContext("2d");
  this.isDirty = false;
  this.canvas.width = this.canvas.height = size;
}

},{}],68:[function(require,module,exports){
/**
 * @fileOverview Utility functions for webgl rendering.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

module.exports = webgl;

function webgl(gl) {

  return {
    createProgram: createProgram,
    extendArray: extendArray,
    copyArrayPart: copyArrayPart,
    swapArrayPart: swapArrayPart,
    getLocations: getLocations,
    context: gl
  };

  function createShader(shaderText, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, shaderText);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var msg = gl.getShaderInfoLog(shader);
      window.alert(msg);
      throw msg;
    }

    return shader;
  }

  function createProgram(vertexShaderSrc, fragmentShaderSrc) {
    var program = gl.createProgram();
    var vs = createShader(vertexShaderSrc, gl.VERTEX_SHADER);
    var fs = createShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var msg = gl.getShaderInfoLog(program);
      window.alert(msg);
      throw msg;
    }

    return program;
  }

  function extendArray(buffer, itemsInBuffer, elementsPerItem) {
    if ((itemsInBuffer + 1) * elementsPerItem > buffer.length) {
      // Every time we run out of space create new array twice bigger.
      // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
      var extendedArray = new Float32Array(buffer.length * elementsPerItem * 2);
      extendedArray.set(buffer);

      return extendedArray;
    }

    return buffer;
  }

  function getLocations(program, uniformOrAttributeNames) {
    var foundLocations = {};
    for (var i = 0; i < uniformOrAttributeNames.length; ++i) {
      var name = uniformOrAttributeNames[i];
      var location = -1;
      if (name[0] === 'a' && name[1] === '_') {
        location = gl.getAttribLocation(program, name);
        if (location === -1) {
          throw new Error("Program doesn't have required attribute: " + name);
        }

        foundLocations[name.slice(2)] = location;
      } else if (name[0] === 'u' && name[1] === '_') {
        location = gl.getUniformLocation(program, name);
        if (location === null) {
          throw new Error("Program doesn't have required uniform: " + name);
        }

        foundLocations[name.slice(2)] = location;
      } else {
        throw new Error("Couldn't figure out your intent. All uniforms should start with 'u_' prefix, and attributes with 'a_'");
      }
    }

    return foundLocations;
  }
}

function copyArrayPart(array, to, from, elementsCount) {
  for (var i = 0; i < elementsCount; ++i) {
    array[to + i] = array[from + i];
  }
}

function swapArrayPart(array, from, to, elementsCount) {
  for (var i = 0; i < elementsCount; ++i) {
    var tmp = array[from + i];
    array[from + i] = array[to + i];
    array[to + i] = tmp;
  }
}

},{}],69:[function(require,module,exports){
var Texture = require('./texture.js');

module.exports = webglAtlas;

/**
 * My naive implementation of textures atlas. It allows clients to load
 * multiple images into atlas and get canvas representing all of them.
 *
 * @param tilesPerTexture - indicates how many images can be loaded to one
 *          texture of the atlas. If number of loaded images exceeds this
 *          parameter a new canvas will be created.
 */
function webglAtlas(tilesPerTexture) {
  var tilesPerRow = Math.sqrt(tilesPerTexture || 1024) << 0,
    tileSize = tilesPerRow,
    lastLoadedIdx = 1,
    loadedImages = {},
    dirtyTimeoutId,
    skipedDirty = 0,
    textures = [],
    trackedUrls = [];

  if (!isPowerOf2(tilesPerTexture)) {
    throw "Tiles per texture should be power of two.";
  }

  // this is the return object
  var api = {
    /**
     * indicates whether atlas has changed texture in it. If true then
     * some of the textures has isDirty flag set as well.
     */
    isDirty: false,

    /**
     * Clears any signs of atlas changes.
     */
    clearDirty: clearDirty,

    /**
     * Removes given url from collection of tiles in the atlas.
     */
    remove: remove,

    /**
     * Gets all textures in the atlas.
     */
    getTextures: getTextures,

    /**
     * Gets coordinates of the given image in the atlas. Coordinates is an object:
     * {offset : int } - where offset is an absolute position of the image in the
     * atlas.
     *
     * Absolute means it can be larger than tilesPerTexture parameter, and in that
     * case clients should get next texture in getTextures() collection.
     */
    getCoordinates: getCoordinates,

    /**
     * Asynchronously Loads the image to the atlas. Cross-domain security
     * limitation applies.
     */
    load: load
  };

  return api;

  function clearDirty() {
    var i;
    api.isDirty = false;
    for (i = 0; i < textures.length; ++i) {
      textures[i].isDirty = false;
    }
  }

  function remove(imgUrl) {
    var coordinates = loadedImages[imgUrl];
    if (!coordinates) {
      return false;
    }
    delete loadedImages[imgUrl];
    lastLoadedIdx -= 1;


    if (lastLoadedIdx === coordinates.offset) {
      return true; // Ignore if it's last image in the whole set.
    }

    var tileToRemove = getTileCoordinates(coordinates.offset),
      lastTileInSet = getTileCoordinates(lastLoadedIdx);

    copy(lastTileInSet, tileToRemove);

    var replacedOffset = loadedImages[trackedUrls[lastLoadedIdx]];
    replacedOffset.offset = coordinates.offset;
    trackedUrls[coordinates.offset] = trackedUrls[lastLoadedIdx];

    markDirty();
    return true;
  }

  function getTextures() {
    return textures; // I trust you...
  }

  function getCoordinates(imgUrl) {
    return loadedImages[imgUrl];
  }

  function load(imgUrl, callback) {
    if (loadedImages.hasOwnProperty(imgUrl)) {
      callback(loadedImages[imgUrl]);
    } else {
      var img = new window.Image(),
        imgId = lastLoadedIdx;

      lastLoadedIdx += 1;
      img.crossOrigin = "anonymous";
      img.onload = function() {
        markDirty();
        drawAt(imgId, img, callback);
      };

      img.src = imgUrl;
    }
  }

  function createTexture() {
    var texture = new Texture(tilesPerRow * tileSize);
    textures.push(texture);
  }

  function drawAt(tileNumber, img, callback) {
    var tilePosition = getTileCoordinates(tileNumber),
      coordinates = {
        offset: tileNumber
      };

    if (tilePosition.textureNumber >= textures.length) {
      createTexture();
    }
    var currentTexture = textures[tilePosition.textureNumber];

    currentTexture.ctx.drawImage(img, tilePosition.col * tileSize, tilePosition.row * tileSize, tileSize, tileSize);
    trackedUrls[tileNumber] = img.src;

    loadedImages[img.src] = coordinates;
    currentTexture.isDirty = true;

    callback(coordinates);
  }

  function getTileCoordinates(absolutePosition) {
    var textureNumber = (absolutePosition / tilesPerTexture) << 0,
      localTileNumber = (absolutePosition % tilesPerTexture),
      row = (localTileNumber / tilesPerRow) << 0,
      col = (localTileNumber % tilesPerRow);

    return {
      textureNumber: textureNumber,
      row: row,
      col: col
    };
  }

  function markDirtyNow() {
    api.isDirty = true;
    skipedDirty = 0;
    dirtyTimeoutId = null;
  }

  function markDirty() {
    // delay this call, since it results in texture reload
    if (dirtyTimeoutId) {
      window.clearTimeout(dirtyTimeoutId);
      skipedDirty += 1;
      dirtyTimeoutId = null;
    }

    if (skipedDirty > 10) {
      markDirtyNow();
    } else {
      dirtyTimeoutId = window.setTimeout(markDirtyNow, 400);
    }
  }

  function copy(from, to) {
    var fromCanvas = textures[from.textureNumber].canvas,
      toCtx = textures[to.textureNumber].ctx,
      x = to.col * tileSize,
      y = to.row * tileSize;

    toCtx.drawImage(fromCanvas, from.col * tileSize, from.row * tileSize, tileSize, tileSize, x, y, tileSize, tileSize);
    textures[from.textureNumber].isDirty = true;
    textures[to.textureNumber].isDirty = true;
  }
}

function isPowerOf2(n) {
  return (n & (n - 1)) === 0;
}

},{"./texture.js":67}],70:[function(require,module,exports){
module.exports = webglImage;

/**
 * Represents a model for image.
 */
function webglImage(size, src) {
    return {
        /**
         * Gets texture index where current image is placed.
         */
        _texture : 0,

        /**
         * Gets offset in the texture where current image is placed.
         */
        _offset : 0,

        /**
         * Gets size of the square with the image.
         */
        size : typeof size === 'number' ? size : 32,

        /**
         * Source of the image. If image is coming not from your domain
         * certain origin restrictions applies.
         * See http://www.khronos.org/registry/webgl/specs/latest/#4.2 for more details.
         */
        src  : src
    };
}

},{}],71:[function(require,module,exports){
/**
 * @fileOverview Defines an image nodes for webglGraphics class.
 * Shape of nodes is square.
 *
 * @author Andrei Kashcha (aka anvaka) / http://anvaka.blogspot.com
 */

var WebglAtlas = require('./webglAtlas.js');
var glUtils = require('./webgl.js');

module.exports = webglImageNodeProgram;

/**
 * Defines simple UI for nodes in webgl renderer. Each node is rendered as an image.
 */
function webglImageNodeProgram() {
  // WebGL is gian state machine, we store some properties of the state here:
  var ATTRIBUTES_PER_PRIMITIVE = 18;
  var nodesFS = createNodeFragmentShader();
  var nodesVS = createNodeVertexShader();
  var tilesPerTexture = 1024; // TODO: Get based on max texture size
  var atlas;
  var program;
  var gl;
  var buffer;
  var utils;
  var locations;
  var nodesCount = 0;
  var nodes = new Float32Array(64);
  var width;
  var height;
  var transform;
  var sizeDirty;


  return {
    load: load,

    /**
     * Updates position of current node in the buffer of nodes.
     *
     * @param idx - index of current node.
     * @param pos - new position of the node.
     */
    position: position,

    createNode: createNode,

    removeNode: removeNode,

    replaceProperties: replaceProperties,

    updateTransform: updateTransform,

    updateSize: updateSize,

    render: render
  };

  function refreshTexture(texture, idx) {
    if (texture.nativeObject) {
      gl.deleteTexture(texture.nativeObject);
    }

    var nativeObject = gl.createTexture();
    gl.activeTexture(gl["TEXTURE" + idx]);
    gl.bindTexture(gl.TEXTURE_2D, nativeObject);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(locations["sampler" + idx], idx);

    texture.nativeObject = nativeObject;
  }

  function ensureAtlasTextureUpdated() {
    if (atlas.isDirty) {
      var textures = atlas.getTextures(),
        i;
      for (i = 0; i < textures.length; ++i) {
        if (textures[i].isDirty || !textures[i].nativeObject) {
          refreshTexture(textures[i], i);
        }
      }

      atlas.clearDirty();
    }
  }

  function load(glContext) {
    gl = glContext;
    utils = glUtils(glContext);

    atlas = new WebglAtlas(tilesPerTexture);

    program = utils.createProgram(nodesVS, nodesFS);
    gl.useProgram(program);
    locations = utils.getLocations(program, ["a_vertexPos", "a_customAttributes", "u_screenSize", "u_transform", "u_sampler0", "u_sampler1", "u_sampler2", "u_sampler3", "u_tilesPerTexture"]);

    gl.uniform1f(locations.tilesPerTexture, tilesPerTexture);

    gl.enableVertexAttribArray(locations.vertexPos);
    gl.enableVertexAttribArray(locations.customAttributes);

    buffer = gl.createBuffer();
  }

  function position(nodeUI, pos) {
    var idx = nodeUI.id * ATTRIBUTES_PER_PRIMITIVE;
    nodes[idx] = pos.x - nodeUI.size;
    nodes[idx + 1] = pos.y - nodeUI.size;
    nodes[idx + 2] = nodeUI._offset * 4;

    nodes[idx + 3] = pos.x + nodeUI.size;
    nodes[idx + 4] = pos.y - nodeUI.size;
    nodes[idx + 5] = nodeUI._offset * 4 + 1;

    nodes[idx + 6] = pos.x - nodeUI.size;
    nodes[idx + 7] = pos.y + nodeUI.size;
    nodes[idx + 8] = nodeUI._offset * 4 + 2;

    nodes[idx + 9] = pos.x - nodeUI.size;
    nodes[idx + 10] = pos.y + nodeUI.size;
    nodes[idx + 11] = nodeUI._offset * 4 + 2;

    nodes[idx + 12] = pos.x + nodeUI.size;
    nodes[idx + 13] = pos.y - nodeUI.size;
    nodes[idx + 14] = nodeUI._offset * 4 + 1;

    nodes[idx + 15] = pos.x + nodeUI.size;
    nodes[idx + 16] = pos.y + nodeUI.size;
    nodes[idx + 17] = nodeUI._offset * 4 + 3;
  }

  function createNode(ui) {
    nodes = utils.extendArray(nodes, nodesCount, ATTRIBUTES_PER_PRIMITIVE);
    nodesCount += 1;

    var coordinates = atlas.getCoordinates(ui.src);
    if (coordinates) {
      ui._offset = coordinates.offset;
    } else {
      ui._offset = 0;
      // Image is not yet loaded into the atlas. Reload it:
      atlas.load(ui.src, function(coordinates) {
        ui._offset = coordinates.offset;
      });
    }
  }

  function removeNode(nodeUI) {
    if (nodesCount > 0) {
      nodesCount -= 1;
    }

    if (nodeUI.id < nodesCount && nodesCount > 0) {
      if (nodeUI.src) {
        atlas.remove(nodeUI.src);
      }

      utils.copyArrayPart(nodes, nodeUI.id * ATTRIBUTES_PER_PRIMITIVE, nodesCount * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
    }
  }

  function replaceProperties(replacedNode, newNode) {
    newNode._offset = replacedNode._offset;
  }

  function updateTransform(newTransform) {
    sizeDirty = true;
    transform = newTransform;
  }

  function updateSize(w, h) {
    width = w;
    height = h;
    sizeDirty = true;
  }

  function render() {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodes, gl.DYNAMIC_DRAW);

    if (sizeDirty) {
      sizeDirty = false;
      gl.uniformMatrix4fv(locations.transform, false, transform);
      gl.uniform2f(locations.screenSize, width, height);
    }

    gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(locations.customAttributes, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * 4);

    ensureAtlasTextureUpdated();

    gl.drawArrays(gl.TRIANGLES, 0, nodesCount * 6);
  }
}

// TODO: Use glslify for shaders
function createNodeFragmentShader() {
  return [
    "precision mediump float;",
    "varying vec4 color;",
    "varying vec3 vTextureCoord;",
    "uniform sampler2D u_sampler0;",
    "uniform sampler2D u_sampler1;",
    "uniform sampler2D u_sampler2;",
    "uniform sampler2D u_sampler3;",

    "void main(void) {",
    "   if (vTextureCoord.z == 0.) {",
    "     gl_FragColor = texture2D(u_sampler0, vTextureCoord.xy);",
    "   } else if (vTextureCoord.z == 1.) {",
    "     gl_FragColor = texture2D(u_sampler1, vTextureCoord.xy);",
    "   } else if (vTextureCoord.z == 2.) {",
    "     gl_FragColor = texture2D(u_sampler2, vTextureCoord.xy);",
    "   } else if (vTextureCoord.z == 3.) {",
    "     gl_FragColor = texture2D(u_sampler3, vTextureCoord.xy);",
    "   } else { gl_FragColor = vec4(0, 1, 0, 1); }",
    "}"
  ].join("\n");
}

function createNodeVertexShader() {
  return [
    "attribute vec2 a_vertexPos;",

    "attribute float a_customAttributes;",
    "uniform vec2 u_screenSize;",
    "uniform mat4 u_transform;",
    "uniform float u_tilesPerTexture;",
    "varying vec3 vTextureCoord;",

    "void main(void) {",
    "   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0, 1);",
    "float corner = mod(a_customAttributes, 4.);",
    "float tileIndex = mod(floor(a_customAttributes / 4.), u_tilesPerTexture);",
    "float tilesPerRow = sqrt(u_tilesPerTexture);",
    "float tileSize = 1./tilesPerRow;",
    "float tileColumn = mod(tileIndex, tilesPerRow);",
    "float tileRow = floor(tileIndex/tilesPerRow);",

    "if(corner == 0.0) {",
    "  vTextureCoord.xy = vec2(0, 1);",
    "} else if(corner == 1.0) {",
    "  vTextureCoord.xy = vec2(1, 1);",
    "} else if(corner == 2.0) {",
    "  vTextureCoord.xy = vec2(0, 0);",
    "} else {",
    "  vTextureCoord.xy = vec2(1, 0);",
    "}",

    "vTextureCoord *= tileSize;",
    "vTextureCoord.x += tileColumn * tileSize;",
    "vTextureCoord.y += tileRow * tileSize;",
    "vTextureCoord.z = floor(floor(a_customAttributes / 4.)/u_tilesPerTexture);",
    "}"
  ].join("\n");
}

},{"./webgl.js":68,"./webglAtlas.js":69}],72:[function(require,module,exports){
var documentEvents = require('../Utils/documentEvents.js');

module.exports = webglInputEvents;

/**
 * Monitors graph-related mouse input in webgl graphics and notifies subscribers.
 *
 * @param {Viva.Graph.View.webglGraphics} webglGraphics
 */
function webglInputEvents(webglGraphics) {
  if (webglGraphics.webglInputEvents) {
    // Don't listen twice, if we are already attached to this graphics:
    return webglGraphics.webglInputEvents;
  }

  var mouseCapturedNode = null,
    mouseEnterCallback = [],
    mouseLeaveCallback = [],
    mouseDownCallback = [],
    mouseUpCallback = [],
    mouseMoveCallback = [],
    clickCallback = [],
    dblClickCallback = [],
    prevSelectStart,
    boundRect;

  var root = webglGraphics.getGraphicsRoot();
  startListen(root);

  var api = {
    mouseEnter: mouseEnter,
    mouseLeave: mouseLeave,
    mouseDown: mouseDown,
    mouseUp: mouseUp,
    mouseMove: mouseMove,
    click: click,
    dblClick: dblClick,
    mouseCapture: mouseCapture,
    releaseMouseCapture: releaseMouseCapture
  };

  // TODO I don't remember why this is needed:
  webglGraphics.webglInputEvents = api;

  return api;

  function releaseMouseCapture() {
    mouseCapturedNode = null;
  }

  function mouseCapture(node) {
    mouseCapturedNode = node;
  }

  function dblClick(callback) {
    if (typeof callback === 'function') {
      dblClickCallback.push(callback);
    }
    return api;
  }

  function click(callback) {
    if (typeof callback === 'function') {
      clickCallback.push(callback);
    }
    return api;
  }

  function mouseMove(callback) {
    if (typeof callback === 'function') {
      mouseMoveCallback.push(callback);
    }
    return api;
  }

  function mouseUp(callback) {
    if (typeof callback === 'function') {
      mouseUpCallback.push(callback);
    }
    return api;
  }

  function mouseDown(callback) {
    if (typeof callback === 'function') {
      mouseDownCallback.push(callback);
    }
    return api;
  }

  function mouseLeave(callback) {
    if (typeof callback === 'function') {
      mouseLeaveCallback.push(callback);
    }
    return api;
  }

  function mouseEnter(callback) {
    if (typeof callback === 'function') {
      mouseEnterCallback.push(callback);
    }
    return api;
  }

  function preciseCheck(nodeUI, x, y) {
    if (nodeUI && nodeUI.size) {
      var pos = nodeUI.position,
        half = nodeUI.size;

      return pos.x - half < x && x < pos.x + half &&
        pos.y - half < y && y < pos.y + half;
    }

    return true;
  }

  function getNodeAtClientPos(pos) {
    return webglGraphics.getNodeAtClientPos(pos, preciseCheck);
  }

  function stopPropagation(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
    }
  }

  function handleDisabledEvent(e) {
    stopPropagation(e);
    return false;
  }

  function invoke(callbacksChain, args) {
    var i, stopPropagation;
    for (i = 0; i < callbacksChain.length; i += 1) {
      stopPropagation = callbacksChain[i].apply(undefined, args);
      if (stopPropagation) {
        return true;
      }
    }
  }

  function startListen(root) {
    var pos = {
        x: 0,
        y: 0
      },
      lastFound = null,
      lastUpdate = 1,
      lastClickTime = +new Date(),

      handleMouseMove = function(e) {
        invoke(mouseMoveCallback, [lastFound, e]);
        pos.x = e.clientX;
        pos.y = e.clientY;
      },

      handleMouseUp = function() {
        documentEvents.off('mousemove', handleMouseMove);
        documentEvents.off('mouseup', handleMouseUp);
      },

      updateBoundRect = function() {
        boundRect = root.getBoundingClientRect();
      };

    window.addEventListener('resize', updateBoundRect);
    updateBoundRect();

    // mouse move inside container serves only to track mouse enter/leave events.
    root.addEventListener('mousemove',
      function(e) {
        if (mouseCapturedNode) {
          return;
        }
        if (lastUpdate++ % 7 === 0) {
          // since there is no bullet proof method to detect resize
          // event, we preemptively update the bounding rectangle
          updateBoundRect();
          lastUpdate = 1;
        }
        var cancelBubble = false,
          node;

        pos.x = e.clientX - boundRect.left;
        pos.y = e.clientY - boundRect.top;

        node = getNodeAtClientPos(pos);

        if (node && lastFound !== node) {
          lastFound = node;
          cancelBubble = cancelBubble || invoke(mouseEnterCallback, [lastFound]);
        } else if (node === null && lastFound !== node) {
          cancelBubble = cancelBubble || invoke(mouseLeaveCallback, [lastFound]);
          lastFound = null;
        }

        if (cancelBubble) {
          stopPropagation(e);
        }
      });

    root.addEventListener('mousedown',
      function(e) {
        var cancelBubble = false,
          args;
        updateBoundRect();
        pos.x = e.clientX - boundRect.left;
        pos.y = e.clientY - boundRect.top;

        args = [getNodeAtClientPos(pos), e];
        if (args[0]) {
          cancelBubble = invoke(mouseDownCallback, args);
          // we clicked on a node. Following drag should be handled on document events:
          documentEvents.on('mousemove', handleMouseMove);
          documentEvents.on('mouseup', handleMouseUp);

          prevSelectStart = window.document.onselectstart;

          window.document.onselectstart = handleDisabledEvent;

          lastFound = args[0];
        } else {
          lastFound = null;
        }
        if (cancelBubble) {
          stopPropagation(e);
        }
      });

    root.addEventListener('mouseup',
      function(e) {
        var clickTime = +new Date(),
          args;

        pos.x = e.clientX - boundRect.left;
        pos.y = e.clientY - boundRect.top;

        args = [getNodeAtClientPos(pos), e];
        if (args[0]) {
          window.document.onselectstart = prevSelectStart;

          if (clickTime - lastClickTime < 400 && args[0] === lastFound) {
            invoke(dblClickCallback, args);
          } else {
            invoke(clickCallback, args);
          }
          lastClickTime = clickTime;

          if (invoke(mouseUpCallback, args)) {
            stopPropagation(e);
          }
        }
      });
  }
}

},{"../Utils/documentEvents.js":55}],73:[function(require,module,exports){
var parseColor = require('./parseColor.js');

module.exports = webglLine;

/**
 * Defines a webgl line. This class has no rendering logic at all,
 * it's just passed to corresponding shader and the shader should
 * figure out how to render it.
 *
 */
function webglLine(color) {
  return {
    /**
     * Gets or sets color of the line. If you set this property externally
     * make sure it always come as integer of 0xRRGGBBAA format
     */
    color: parseColor(color)
  };
}

},{"./parseColor.js":66}],74:[function(require,module,exports){
/**
 * @fileOverview Defines a naive form of links for webglGraphics class.
 * This form allows to change color of links.
 **/

var glUtils = require('./webgl.js');

module.exports = webglLinkProgram;

/**
 * Defines UI for links in webgl renderer.
 */
function webglLinkProgram() {
    var ATTRIBUTES_PER_PRIMITIVE = 6, // primitive is Line with two points. Each has x,y and color = 3 * 2 attributes.
        BYTES_PER_LINK = 2 * (2 * Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT), // two nodes * (x, y + color)
        linksFS = [
            'precision mediump float;',
            'varying vec4 color;',
            'void main(void) {',
            '   gl_FragColor = color;',
            '}'
        ].join('\n'),

        linksVS = [
            'attribute vec2 a_vertexPos;',
            'attribute vec4 a_color;',

            'uniform vec2 u_screenSize;',
            'uniform mat4 u_transform;',

            'varying vec4 color;',

            'void main(void) {',
            '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0.0, 1.0);',
            '   color = a_color.abgr;',
            '}'
        ].join('\n'),

        program,
        gl,
        buffer,
        utils,
        locations,
        linksCount = 0,
        frontLinkId, // used to track z-index of links.
        storage = new ArrayBuffer(16 * BYTES_PER_LINK),
        positions = new Float32Array(storage),
        colors = new Uint32Array(storage),
        width,
        height,
        transform,
        sizeDirty,

        ensureEnoughStorage = function () {
            // TODO: this is a duplicate of webglNodeProgram code. Extract it to webgl.js
            if ((linksCount+1)*BYTES_PER_LINK > storage.byteLength) {
                // Every time we run out of space create new array twice bigger.
                // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
                var extendedStorage = new ArrayBuffer(storage.byteLength * 2),
                    extendedPositions = new Float32Array(extendedStorage),
                    extendedColors = new Uint32Array(extendedStorage);

                extendedColors.set(colors); // should be enough to copy just one view.
                positions = extendedPositions;
                colors = extendedColors;
                storage = extendedStorage;
            }
        };

    return {
        load : function (glContext) {
            gl = glContext;
            utils = glUtils(glContext);

            program = utils.createProgram(linksVS, linksFS);
            gl.useProgram(program);
            locations = utils.getLocations(program, ['a_vertexPos', 'a_color', 'u_screenSize', 'u_transform']);

            gl.enableVertexAttribArray(locations.vertexPos);
            gl.enableVertexAttribArray(locations.color);

            buffer = gl.createBuffer();
        },

        position: function (linkUi, fromPos, toPos) {
            var linkIdx = linkUi.id,
                offset = linkIdx * ATTRIBUTES_PER_PRIMITIVE;
            positions[offset] = fromPos.x;
            positions[offset + 1] = fromPos.y;
            colors[offset + 2] = linkUi.color;

            positions[offset + 3] = toPos.x;
            positions[offset + 4] = toPos.y;
            colors[offset + 5] = linkUi.color;
        },

        createLink : function (ui) {
            ensureEnoughStorage();

            linksCount += 1;
            frontLinkId = ui.id;
        },

        removeLink : function (ui) {
            if (linksCount > 0) { linksCount -= 1; }
            // swap removed link with the last link. This will give us O(1) performance for links removal:
            if (ui.id < linksCount && linksCount > 0) {
                // using colors as a view to array buffer is okay here.
                utils.copyArrayPart(colors, ui.id * ATTRIBUTES_PER_PRIMITIVE, linksCount * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
            }
        },

        updateTransform : function (newTransform) {
            sizeDirty = true;
            transform = newTransform;
        },

        updateSize : function (w, h) {
            width = w;
            height = h;
            sizeDirty = true;
        },

        render : function () {
            gl.useProgram(program);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, storage, gl.DYNAMIC_DRAW);

            if (sizeDirty) {
                sizeDirty = false;
                gl.uniformMatrix4fv(locations.transform, false, transform);
                gl.uniform2f(locations.screenSize, width, height);
            }

            gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
            gl.vertexAttribPointer(locations.color, 4, gl.UNSIGNED_BYTE, true, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * 4);

            gl.drawArrays(gl.LINES, 0, linksCount * 2);

            frontLinkId = linksCount - 1;
        },

        bringToFront : function (link) {
            if (frontLinkId > link.id) {
                utils.swapArrayPart(positions, link.id * ATTRIBUTES_PER_PRIMITIVE, frontLinkId * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
            }
            if (frontLinkId > 0) {
                frontLinkId -= 1;
            }
        },

        getFrontLinkId : function () {
            return frontLinkId;
        }
    };
}

},{"./webgl.js":68}],75:[function(require,module,exports){
/**
 * @fileOverview Defines a naive form of nodes for webglGraphics class.
 * This form allows to change color of node. Shape of nodes is rectangular.
 *
 * @author Andrei Kashcha (aka anvaka) / https://github.com/anvaka
 */

var glUtils = require('./webgl.js');

module.exports = webglNodeProgram;

/**
 * Defines simple UI for nodes in webgl renderer. Each node is rendered as square. Color and size can be changed.
 */
function webglNodeProgram() {
  var ATTRIBUTES_PER_PRIMITIVE = 4; // Primitive is point, x, y, size, color
  // x, y, z - floats, color = uint.
  var BYTES_PER_NODE = 3 * Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT;
  var nodesFS = [
    'precision mediump float;',
    'varying vec4 color;',

    'void main(void) {',
    '   gl_FragColor = color;',
    '}'
  ].join('\n');
  var nodesVS = [
    'attribute vec3 a_vertexPos;',
    'attribute vec4 a_color;',
    'uniform vec2 u_screenSize;',
    'uniform mat4 u_transform;',
    'varying vec4 color;',

    'void main(void) {',
    '   gl_Position = u_transform * vec4(a_vertexPos.xy/u_screenSize, 0, 1);',
    '   gl_PointSize = a_vertexPos.z * u_transform[0][0];',
    '   color = a_color.abgr;',
    '}'
  ].join('\n');

  var program;
  var gl;
  var buffer;
  var locations;
  var utils;
  var storage = new ArrayBuffer(16 * BYTES_PER_NODE);
  var positions = new Float32Array(storage);
  var colors = new Uint32Array(storage);
  var nodesCount = 0;
  var width;
  var height;
  var transform;
  var sizeDirty;

  return {
    load: load,

    /**
     * Updates position of node in the buffer of nodes.
     *
     * @param idx - index of current node.
     * @param pos - new position of the node.
     */
    position: position,

    updateTransform: updateTransform,

    updateSize: updateSize,

    removeNode: removeNode,

    createNode: createNode,

    replaceProperties: replaceProperties,

    render: render
  };

  function ensureEnoughStorage() {
    if ((nodesCount + 1) * BYTES_PER_NODE >= storage.byteLength) {
      // Every time we run out of space create new array twice bigger.
      // TODO: it seems buffer size is limited. Consider using multiple arrays for huge graphs
      var extendedStorage = new ArrayBuffer(storage.byteLength * 2),
        extendedPositions = new Float32Array(extendedStorage),
        extendedColors = new Uint32Array(extendedStorage);

      extendedColors.set(colors); // should be enough to copy just one view.
      positions = extendedPositions;
      colors = extendedColors;
      storage = extendedStorage;
    }
  }

  function load(glContext) {
    gl = glContext;
    utils = glUtils(glContext);

    program = utils.createProgram(nodesVS, nodesFS);
    gl.useProgram(program);
    locations = utils.getLocations(program, ['a_vertexPos', 'a_color', 'u_screenSize', 'u_transform']);

    gl.enableVertexAttribArray(locations.vertexPos);
    gl.enableVertexAttribArray(locations.color);

    buffer = gl.createBuffer();
  }

  function position(nodeUI, pos) {
    var idx = nodeUI.id;

    positions[idx * ATTRIBUTES_PER_PRIMITIVE] = pos.x;
    positions[idx * ATTRIBUTES_PER_PRIMITIVE + 1] = -pos.y;
    positions[idx * ATTRIBUTES_PER_PRIMITIVE + 2] = nodeUI.size;

    colors[idx * ATTRIBUTES_PER_PRIMITIVE + 3] = nodeUI.color;
  }

  function updateTransform(newTransform) {
    sizeDirty = true;
    transform = newTransform;
  }

  function updateSize(w, h) {
    width = w;
    height = h;
    sizeDirty = true;
  }

  function removeNode(node) {
      if (nodesCount > 0) {
        nodesCount -= 1;
      }

      if (node.id < nodesCount && nodesCount > 0) {
        // we can use colors as a 'view' into array array buffer.
        utils.copyArrayPart(colors, node.id * ATTRIBUTES_PER_PRIMITIVE, nodesCount * ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);
      }
    }

  function createNode() {
    ensureEnoughStorage();
    nodesCount += 1;
  }

  function replaceProperties(/* replacedNode, newNode */) {}

  function render() {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, storage, gl.DYNAMIC_DRAW);

    if (sizeDirty) {
      sizeDirty = false;
      gl.uniformMatrix4fv(locations.transform, false, transform);
      gl.uniform2f(locations.screenSize, width, height);
    }

    gl.vertexAttribPointer(locations.vertexPos, 3, gl.FLOAT, false, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(locations.color, 4, gl.UNSIGNED_BYTE, true, ATTRIBUTES_PER_PRIMITIVE * Float32Array.BYTES_PER_ELEMENT, 3 * 4);

    gl.drawArrays(gl.POINTS, 0, nodesCount);
  }
}

},{"./webgl.js":68}],76:[function(require,module,exports){
var parseColor = require('./parseColor.js');

module.exports = webglSquare;

/**
 * Can be used as a callback in the webglGraphics.node() function, to
 * create a custom looking node.
 *
 * @param size - size of the node in pixels.
 * @param color - color of the node in '#rrggbbaa' or '#rgb' format.
 */
function webglSquare(size, color) {
  return {
    /**
     * Gets or sets size of the square side.
     */
    size: typeof size === 'number' ? size : 10,

    /**
     * Gets or sets color of the square.
     */
    color: parseColor(color)
  };
}

},{"./parseColor.js":66}],77:[function(require,module,exports){
// todo: this should be generated at build time.
module.exports = '0.8.1';

},{}],78:[function(require,module,exports){
/**
 * This is an entry point for global namespace. If you want to use separate
 * modules individually - you are more than welcome to do so.
 */

var random = require('ngraph.random');

var Viva = {
  lazyExtend: function() {
    return require('ngraph.merge').apply(this, arguments);
  },
  randomIterator: function() {
    return random.randomIterator.apply(random, arguments);
  },
  random: function() {
    return random.random.apply(random, arguments);
  },
  events: require('ngraph.events')
};

Viva.Graph = {
  version: require('./version.js'),
  graph: require('ngraph.graph'),

  serializer: function() {
    return {
      loadFromJSON: require('ngraph.fromjson'),
      storeToJSON: require('ngraph.tojson')
    };
  },

  centrality: require('./Algorithms/centrality.js'),
  operations: require('./Algorithms/operations.js'),

  geom: function() {
    return {
      intersect: require('gintersect'),
      intersectRect: require('./Utils/intersectRect.js')
    };
  },

  webgl: require('./WebGL/webgl.js'),
  webglInputEvents: require('./WebGL/webglInputEvents.js'),

  generator: function() {
    return require('ngraph.generators');
  },

  Input: {
    domInputManager: require('./Input/domInputManager.js'),
    webglInputManager: require('./Input/webglInputManager.js')
  },

  Utils: {
    // TODO: move to Input
    dragndrop: require('./Input/dragndrop.js'),
    findElementPosition: require('./Utils/findElementPosition.js'),
    timer: require('./Utils/timer.js'),
    getDimension: require('./Utils/getDimensions.js'),
    events: require('./Utils/backwardCompatibleEvents.js')
  },

  Layout: {
    forceDirected: require('ngraph.forcelayout'),
    constant: require('./Layout/constant.js')
  },

  View: {
    // TODO: Move `webglXXX` out to webgl namespace
    Texture: require('./WebGL/texture.js'),
    // TODO: This should not be even exported
    webglAtlas: require('./WebGL/webglAtlas.js'),
    webglImageNodeProgram: require('./WebGL/webglImageNodeProgram.js'),
    webglLinkProgram: require('./WebGL/webglLinkProgram.js'),
    webglNodeProgram: require('./WebGL/webglNodeProgram.js'),
    webglLine: require('./WebGL/webglLine.js'),
    webglSquare: require('./WebGL/webglSquare.js'),
    webglImage: require('./WebGL/webglImage.js'),
    webglGraphics: require('./View/webglGraphics.js'),
    // TODO: Deprecate this:
    _webglUtil: {
      parseColor: require('./WebGL/parseColor.js')
    },

    // TODO: move to svg namespace
    svgGraphics: require('./View/svgGraphics.js'),

    renderer: require('./View/renderer.js'),

    // deprecated
    cssGraphics: function() {
      throw new Error('cssGraphics is deprecated. Please use older version of vivagraph (< 0.7) if you need it');
    },

    svgNodeFactory: function() {
      throw new Error('svgNodeFactory is deprecated. Please use older version of vivagraph (< 0.7) if you need it');
    },

    community: function() {
      throw new Error('community is deprecated. Please use vivagraph < 0.7 if you need it, or `https://github.com/anvaka/ngraph.slpa` module');
    }
  },

  Rect: require('./Utils/rect.js'),

  svg: require('simplesvg'),

  // TODO: should be camelCase
  BrowserInfo: require('./Utils/browserInfo.js')
};

module.exports = Viva;

},{"./Algorithms/centrality.js":47,"./Algorithms/operations.js":48,"./Input/domInputManager.js":49,"./Input/dragndrop.js":50,"./Input/webglInputManager.js":51,"./Layout/constant.js":52,"./Utils/backwardCompatibleEvents.js":53,"./Utils/browserInfo.js":54,"./Utils/findElementPosition.js":56,"./Utils/getDimensions.js":57,"./Utils/intersectRect.js":58,"./Utils/rect.js":60,"./Utils/timer.js":61,"./View/renderer.js":63,"./View/svgGraphics.js":64,"./View/webglGraphics.js":65,"./WebGL/parseColor.js":66,"./WebGL/texture.js":67,"./WebGL/webgl.js":68,"./WebGL/webglAtlas.js":69,"./WebGL/webglImage.js":70,"./WebGL/webglImageNodeProgram.js":71,"./WebGL/webglInputEvents.js":72,"./WebGL/webglLine.js":73,"./WebGL/webglLinkProgram.js":74,"./WebGL/webglNodeProgram.js":75,"./WebGL/webglSquare.js":76,"./version.js":77,"gintersect":17,"ngraph.events":21,"ngraph.forcelayout":22,"ngraph.fromjson":36,"ngraph.generators":37,"ngraph.graph":38,"ngraph.merge":39,"ngraph.random":40,"ngraph.tojson":41,"simplesvg":42}],79:[function(require,module,exports){

function getDataPercentage(data) {
    var arrayData = [];
    var total = 0;

    data.map(function(x){
        total += x;
    });

     for (i = 0; i<data.length; i++){
        var result = (data[i]/total) * 360;
        if (data[i] == 0) arrayData.push(data[i]);
        else arrayData.push(result);
     }

    return arrayData;
}

function assignQuadrant(dataInPercentage, colorIndexes){

    maxSize = dataInPercentage.length;
    newDataArray = [];
    newIndexArray = [];
    remaining = 0;
    totalAngles = 0;
    prevTotalAngles = 0;
    countData = 0;

    fourQuadrants = [];
    fourIndexes = [];

    if (dataInPercentage.length == 0){
        return [[0],[0]];
    }
    else{
    
        while(totalAngles +  dataInPercentage[countData] <= 90){
            totalAngles += dataInPercentage[countData];
            newDataArray.push(dataInPercentage[countData]);
            newIndexArray.push(colorIndexes[countData]);
            countData++;
        }
        remaining = 90 - totalAngles;
        if (remaining > 0){
            newDataArray.push(remaining);
            newIndexArray.push(colorIndexes[countData]);
            dataInPercentage[countData] = dataInPercentage[countData] - remaining;
            totalAngles += remaining;
        } 

        fourQuadrants.push(newDataArray);
        fourIndexes.push(newIndexArray);

        newIndexArray = [];
        newDataArray = [];

        while(totalAngles +  dataInPercentage[countData] <= 180){
            totalAngles += dataInPercentage[countData];
            newDataArray.push(dataInPercentage[countData]);
            newIndexArray.push(colorIndexes[countData]);
            countData++;
        }
        if(totalAngles > 0) remaining = 180 - totalAngles;
        else remaining = 90;
        if (remaining > 0){
            newDataArray.push(remaining);
            newIndexArray.push(colorIndexes[countData]);
            dataInPercentage[countData] = dataInPercentage[countData] - remaining;
            totalAngles += remaining;
        } 

        fourQuadrants.push(newDataArray);
        fourIndexes.push(newIndexArray);

        newIndexArray = [];
        newDataArray = [];

        while(totalAngles +  dataInPercentage[countData] <= 270){
            totalAngles += dataInPercentage[countData];
            newDataArray.push(dataInPercentage[countData]);
            newIndexArray.push(colorIndexes[countData]);
            countData++;
        }
        if(totalAngles > 0) remaining = 270 - totalAngles;
        else remaining = 90;
        if (remaining > 0){
            newDataArray.push(remaining);
            newIndexArray.push(colorIndexes[countData]);
            dataInPercentage[countData] = dataInPercentage[countData] - remaining;
            totalAngles += remaining;
        } 

        fourQuadrants.push(newDataArray);
        fourIndexes.push(newIndexArray);

        newIndexArray = [];
        newDataArray = [];

        while(totalAngles +  dataInPercentage[countData] <= 360){
            totalAngles += dataInPercentage[countData];
            newDataArray.push(dataInPercentage[countData]);
            newIndexArray.push(colorIndexes[countData]);
            countData++;
        }

        fourQuadrants.push(newDataArray);
        fourIndexes.push(newIndexArray);

        newIndexArray = [];
        newDataArray = [];

        return [fourQuadrants, fourIndexes];
    }

}




function graphRenderingFunctions(){

    var Vivagraph = require('vivagraphjs');



    return {

        // Lets start from the easiest part - model object for node ui in webgl
        WebglCircle: function(size, baseColor, data, colors, rawData) {
                circleDataArray = assignQuadrant(getDataPercentage(data), colors);
                this.size = size;
                this.backupSize = size;
                this.baseColor = baseColor;
                this.data = circleDataArray[0];
                this.colorIndexes = circleDataArray[1];
                this.backupColor = circleDataArray[1];
                this.rawData = circleDataArray[2];

        },

        buildCircleNodeShader: function() {

                    Math.radians = function(degrees) {
                      return degrees * Math.PI / 180;
                    };

                    // For each primitive we need 4 attributes: x, y, color and size.
                    var ATTRIBUTES_PER_PRIMITIVE = 8,
                        nodesFS = [
                        'precision mediump float;',
                        'varying float quadrant;',

                        'varying vec4 color;',
                        'varying float angle;',
                        'varying float prevAngle;',
                        'varying float totalAngles;',

                        'void main(){',

                            'bool found = false;',
                            'float rad = 0.0;',
                            'int prevAngleNumber = 0;',
                            'float prevTotal = 0.0;',

                            'vec4 parts = vec4(22.5);',


                            'if (quadrant == 1.0 && gl_PointCoord.y < 0.5 && gl_PointCoord.x > 0.5){',
                                    'rad = radians(angle);',
                                    'if (totalAngles == 90.0 && tan(prevAngle) <= (- 2.0 * ( 0.5 - gl_PointCoord.x)) / (- 2.0 * (gl_PointCoord.y - 0.5))){',
                                        'gl_FragColor = color;',
                                        'found = true;',
                                    '}',
                                    'else if (tan(rad + prevAngle) >= (- 2.0 * ( 0.5 - gl_PointCoord.x)) / (- 2.0 * (gl_PointCoord.y - 0.5)) && tan(prevAngle) <= (- 2.0 * ( 0.5 - gl_PointCoord.x)) / (- 2.0 * (gl_PointCoord.y - 0.5)) ){',
                                            'gl_FragColor = color;',
                                            'found = true;',
                                    '}',
                            '}',

                           'else if (quadrant == 2.0 && gl_PointCoord.y >= 0.5 && gl_PointCoord.x >= 0.5){',

                                    'rad = radians(angle);',
                                    'if (totalAngles == 180.0 && tan(prevAngle) <= (- 2.0 * ( 0.5 - gl_PointCoord.y)) / (- 2.0 * ( 0.5 - gl_PointCoord.x))){',
                                        'gl_FragColor = color;',
                                        'found = true;',
                                    '}',
                                    'else if (tan(rad + prevAngle) >= (- 2.0 * ( 0.5 - gl_PointCoord.y)) / (- 2.0 * ( 0.5 - gl_PointCoord.x)) && tan(prevAngle) <= (- 2.0 * ( 0.5 - gl_PointCoord.y)) / (- 2.0 * ( 0.5 - gl_PointCoord.x)) ){',
                                            'gl_FragColor = color;',
                                            'found = true;',
                                    '}',
                            '}',

                            'else if (quadrant == 3.0 && gl_PointCoord.y >= 0.5 && gl_PointCoord.x <= 0.5){',

                                    'rad = radians(angle);',
                                    'if (totalAngles == 270.0 && tan(prevAngle) <= (- 2.0 * (gl_PointCoord.x - 0.5)) / (- 2.0 * ( 0.5 - gl_PointCoord.y))){',
                                        'gl_FragColor = color;',
                                        'found = true;',
                                    '}',
                                    'else if (tan((rad + prevAngle)) >= (- 2.0 * (gl_PointCoord.x - 0.5)) / (- 2.0 * ( 0.5 - gl_PointCoord.y)) && tan((prevAngle)) <= (- 2.0 * (gl_PointCoord.x - 0.5)) / (- 2.0 * ( 0.5 - gl_PointCoord.y)) ){',
                                            'gl_FragColor = color;',
                                            'found = true;',
                                    '}',
                           '}',

                            'if (quadrant == 4.0 && gl_PointCoord.y <= 0.5 && gl_PointCoord.x <= 0.5){',
                                    'rad = radians(angle);',
                                    'if (angle != 0.0 && totalAngles == 360.0 && (tan(prevAngle) <= (gl_PointCoord.y - 0.5) / (gl_PointCoord.x - 0.5))){',
                                        'gl_FragColor = color;',
                                        'found = true;',
                                    '}',
                                    'else if ((tan(rad + prevAngle) >= (gl_PointCoord.y - 0.5) / (gl_PointCoord.x - 0.5)) && (tan(prevAngle) <= (gl_PointCoord.y - 0.5) / (gl_PointCoord.x - 0.5))){',
                                            'gl_FragColor = color;',
                                            'found = true;',
                                    '}',

                            '}',

                            

                        'if (found == false){',
                            'if ((gl_PointCoord.x - 0.5) * (gl_PointCoord.x - 0.5) + (gl_PointCoord.y - 0.5) * (gl_PointCoord.y - 0.5) < 0.25){',
                                'gl_FragColor = vec4(0);',
                            '}',
                            'else{',
                                'gl_FragColor = vec4(0);',
                            '}',
                        '}',
                         'else if ((gl_PointCoord.x - 0.5) * (gl_PointCoord.x - 0.5) + (gl_PointCoord.y - 0.5) * (gl_PointCoord.y - 0.5) > 0.25){',
                            ' gl_FragColor = vec4(0);',
                         '}',
                            
                        '}'].join('\n');

                        nodesVS = [
                        'attribute vec2 a_vertexPos;',
                        // Pack clor and size into vector. First elemnt is color, second - size.
                        // Since it's floating point we can only use 24 bit to pack colors...
                        // thus alpha channel is dropped, and is always assumed to be 1.
                        'attribute float a_quadrant;',
                        'attribute vec3 a_anglesAndColor;',
                        'attribute float a_totalAngles;',
                        'attribute float a_size;',

                        'uniform vec2 u_screenSize;',
                        'uniform mat4 u_transform;',

                        'varying vec4 color;',
                        'varying float angle;',
                        'varying float prevAngle;',
                        'varying float totalAngles;',

                        'varying float quadrant;',

                        'vec4 unpackColor(float c){',
                            '   vec4 colorToUse;',
                             '   colorToUse.b = mod(c, 256.0); c = floor(c/256.0);',
                             '   colorToUse.g = mod(c, 256.0); c = floor(c/256.0);',
                             '   colorToUse.r = mod(c, 256.0); c = floor(c/256.0); colorToUse /= 255.0;',
                             '   colorToUse.a = 1.0;',
                             
                             '  return colorToUse;',
                         '}',

                        'void main(void) {',
                        '   gl_Position = u_transform * vec4(a_vertexPos/u_screenSize, 0, 1);',
                        '   gl_PointSize = a_size * u_transform[0][0];',
                        
                        '   angle = a_anglesAndColor[0];',
                        '   color = unpackColor(a_anglesAndColor[1]);',
                        '   prevAngle = a_anglesAndColor[2];',
                        '   totalAngles = a_totalAngles;',
                        //'   color4 = unpackColor(a_fourthColor);',
                         //'   angle = a_angle;',
                         //'   prevAngle = radians(a_customAttributes[3]);',
                        '   quadrant = a_quadrant;',
                        '}'].join('\n');

                    var program,
                        gl,
                        buffer,
                        locations,
                        utils,
                        isfirst = true, 
                        allNodes = [],
                        allNodesNumberAttr = [],
                        nodes1 = new Float32Array(7),
                        nodes2 = new Float32Array(7),
                        nodes3 = new Float32Array(7),
                        nodes4 = new Float32Array(7),
                        nodesCount = 0,
                        canvasWidth, canvasHeight, transform,
                        isCanvasDirty;

                    return {
                        /**
                         * Called by webgl renderer to load the shader into gl context.
                         */
                        load : function (glContext) {
                            gl = glContext;
                            webglUtils = Vivagraph.Graph.webgl(glContext);

                            program = webglUtils.createProgram(nodesVS, nodesFS);
                            gl.useProgram(program);
                            locations = webglUtils.getLocations(program, ['a_vertexPos', 'a_quadrant', 'a_anglesAndColor', 'a_totalAngles', 'a_size', 'u_screenSize', 'u_transform']);

                            gl.enableVertexAttribArray(locations.vertexPos);
                            gl.enableVertexAttribArray(locations.quadrant);
                            gl.enableVertexAttribArray(locations.anglesAndColor);
                            gl.enableVertexAttribArray(locations.totalAngles);
                            gl.enableVertexAttribArray(locations.size);



                            buffer = gl.createBuffer();
                        },

                        /**
                         * Called by webgl renderer to update node position in the buffer array
                         *
                         * @param nodeUI - data model for the rendered node (WebGLCircle in this case)
                         * @param pos - {x, y} coordinates of the node.
                         */
                        position : function (nodeUI, pos) {
                            var idx = nodeUI.id;
                            //var prevAngles = [0, 25];
                            var currentTotal = 0;
                            var prevAngles = 0.0;

                            allNodes[idx] = [];

                            var interArray = [];

                            allNodesNumberAttr[idx] = 0;

                            interNodeSize = (nodeUI.data[0].length + nodeUI.data[1].length + nodeUI.data[2].length +nodeUI.data[3].length) * ATTRIBUTES_PER_PRIMITIVE;

                            var interNode = new Float32Array(interNodeSize);

                            var countProperties = 0;

                            for (x=0; x < nodeUI.data.length;x++){

                                var numberOfAngles = nodeUI.data[x].length;
                                //console.log(numberOfAngles);
                                var angleToUse = nodeUI.data[x];

                                var colors = nodeUI.colorIndexes[x];
                                //var interNode = new Float32Array(numberOfAngles*ATTRIBUTES_PER_PRIMITIVE);
                                //var countProp = 0;
                                
                                allNodesNumberAttr[idx] += numberOfAngles;


                                for (i = 0; i < numberOfAngles; i++){

                                    currentTotal += angleToUse[i];

                                    if (i==0) prevAngles = 0;
                                    else prevAngles += angleToUse[i-1];
                                    
                                    interNode[countProperties] = pos.x;
                                    interNode[countProperties+1] = -pos.y;
                                    interNode[countProperties+2] = x+1; //quadrant
                                    interNode[countProperties+3] = angleToUse[i]; //angle
                                    interNode[countProperties+4] = colors[i]; //color
                                    interNode[countProperties+5] = Math.radians(prevAngles); //prevAngle
                                    interNode[countProperties+6] = currentTotal; //total Angles
                                    interNode[countProperties+7] = nodeUI.size; //total Angles

                                    countProperties += ATTRIBUTES_PER_PRIMITIVE;

                                }     
                            }

                            allNodes[idx].push(interNode);

                        },

                        /**
                         * Request from webgl renderer to actually draw our stuff into the
                         * gl context. This is the core of our shader.
                         */
                        render : function() {
                            //console.log(allNodes);
                            gl.useProgram(program);
                            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

                            gl.vertexAttribPointer(locations.vertexPos, 2, gl.FLOAT, false, (ATTRIBUTES_PER_PRIMITIVE)* Float32Array.BYTES_PER_ELEMENT, 0);
                            gl.vertexAttribPointer(locations.quadrant, 1, gl.FLOAT, false, (ATTRIBUTES_PER_PRIMITIVE)* Float32Array.BYTES_PER_ELEMENT, 2*4);
                            gl.vertexAttribPointer(locations.anglesAndColor, 3, gl.FLOAT, false, (ATTRIBUTES_PER_PRIMITIVE)* Float32Array.BYTES_PER_ELEMENT, 3*4);
                            gl.vertexAttribPointer(locations.totalAngles, 1, gl.FLOAT, false, (ATTRIBUTES_PER_PRIMITIVE)* Float32Array.BYTES_PER_ELEMENT, 6*4);
                            gl.vertexAttribPointer(locations.size, 1, gl.FLOAT, false, (ATTRIBUTES_PER_PRIMITIVE)* Float32Array.BYTES_PER_ELEMENT, 7*4);

                            if (isCanvasDirty) {
                                isCanvasDirty = false;
                                gl.uniformMatrix4fv(locations.transform, false, transform);
                                gl.uniform2f(locations.screenSize, canvasWidth, canvasHeight);
                                //gl.uniform1f(locations.size, 24.0);
                            }

                            for (i=0; i<allNodes.length;i++){
                                //console.log(allNodesNumberAttr[i]);
                                gl.bufferData(gl.ARRAY_BUFFER, allNodes[i][0], gl.DYNAMIC_DRAW);
                                gl.drawArrays(gl.POINTS, 0, allNodesNumberAttr[i]);
                                
                            }

                        },

                        /**
                         * Called by webgl renderer when user scales/pans the canvas with nodes.
                         */
                        updateTransform : function (newTransform) {
                            transform = newTransform;
                            isCanvasDirty = true;
                        },

                        /**
                         * Called by webgl renderer when user resizes the canvas with nodes.
                         */
                        updateSize : function (newCanvasWidth, newCanvasHeight) {
                            canvasWidth = newCanvasWidth;
                            canvasHeight = newCanvasHeight;
                            isCanvasDirty = true;
                        },

                        /**
                         * Called by webgl renderer to notify us that the new node was created in the graph
                         */
                        createNode : function (node) {
                            nodesCount += 1;
                            allNodes = new Array(nodesCount);
                            allNodesNumberAttr = new Array(nodesCount);
                        },

                        /**
                         * Called by webgl renderer to notify us that the node was removed from the graph
                         */
                        removeNode : function (node) {
                            if (nodesCount > 0) { nodesCount -=1; }

                            if (node.id < nodesCount && nodesCount > 0) {
                                // we do not really delete anything from the buffer.
                                // Instead we swap deleted node with the "last" node in the
                                // buffer and decrease marker of the "last" node. Gives nice O(1)
                                // performance, but make code slightly harder than it could be:
                                webglUtils.copyArrayPart(nodes1, node.id*ATTRIBUTES_PER_PRIMITIVE, nodesCount*ATTRIBUTES_PER_PRIMITIVE, ATTRIBUTES_PER_PRIMITIVE);

                            }
                        },

                        /**
                         * This method is called by webgl renderer when it changes parts of its
                         * buffers. We don't use it here, but it's needed by API (see the comment
                         * in the removeNode() method)
                         */
                        replaceProperties : function(replacedNode, newNode) {},
                    };
                }
    }
}

module.exports = {
    graphRenderingFunctions: graphRenderingFunctions,
    assignQuadrant: assignQuadrant,
    getDataPercentage: getDataPercentage
}


},{"vivagraphjs":78}],80:[function(require,module,exports){

function createInput(dataToGraph, callback){

	var dataset = dataToGraph;
	var isNewick = false;

	if (dataset.newick != undefined) isNewick = true;
	//console.log(typeof dataset.newick);

	if (isNewick){
		var newickParser = require('./parsers/newickParser');
		
		newickParser(dataset, function(graph){
				callback(graph);
	    });
	}
	else{
		var profileParser = require('./parsers/profileParser');
		profileParser(dataset, function(graph){
			callback(graph);
		});
	}
}


module.exports = function(dataToGraph, callback){

	createInput(dataToGraph, function(graph){
		callback(graph);
	});
}

},{"./parsers/newickParser":83,"./parsers/profileParser":84}],81:[function(require,module,exports){
/*
* A generic Newick hand-rolled tokenizer and recursive descent parser with options tailored for OneZoom style nwk strings (see grammar/grammar.specialized.gram)
*
* This parser accepts all valid forms of Newick, including unnamed nodes, no distances, and partial distances
* Author: Bremen Braun (konapun) for TimeTree (www.timetree.org), 2013
*/
var nwk = {};
nwk.parser = {
	tokenize: function(src, tokens) { // I'm going to reuse this tokenizer for OneZoom name parsing later on, so tokens can be specified for specific uses
		tokens = tokens || {
			'(': /\(/,
			')': /\)/,
			':': /:/,
			';': /;/,
			',': /,/,
			'NUMBER': /\d+\.*\d*|\.\d+/, // optional beginning 0 for decimal numbers
			'STRING': /[a-zA-Z_\+\.\\\-\d'\s\[\]\*\/{}]+/, // your mileage with this regex may vary
		};
		
		var
		classify = function(tkn) {
			var tokenClass;
			Object.keys(tokens).some(function(key) {
				var classifier = new RegExp(tokens[key]);
				
				if (tkn.match(classifier)) {
					tokenClass = key;
					return true;
				}
			});
			
			return tokenClass;
		},
		index = 0,
		regex = "";
		
		// Build the regex
		Object.keys(tokens).forEach(function(key) {
			var tokenizer = tokens[key];
			
			if (index > 0) { 
				regex += '|';
			}
			
			regex += '(' + tokenizer.source + ')'; // capture separating tokens for classification
			index++;
		});
		
		// Tokenize the source string
		var
		tokenized = src.split(new RegExp(regex)),
		named = [];
		for (var i = 0; i < tokenized.length; i++) {
			var token = tokenized[i];
			if (token) { // skip undef and empty string
				named.push({
					symbol: token,
					type: classify(token)
				});
			}
		}
		
		return named; // tokens as classified symbols
	},
	
	/* A recursive descent parser */
	parse: function(srcOrTokens) {
		var tokens;
		//console.log(srcOrTokens);
		if (Object.prototype.toString.call(srcOrTokens) === '[object Array]') { // parsing tokens
			tokens = srcOrTokens;
		}
		else {
			tokens = this.tokenize(srcOrTokens); // parsing source string
		}
		
		var
		enumerator = 0, // assign unique node IDs
		node = function() {
			this.id = enumerator++; // for debugging
			this.data = "";
			this.branchlength = 0;
			this.children = [];
		},
		currnode = null, // created on ( or ,
		root = null,
		currtok = tokens.shift(),
		scope = [], // stack of parent nodes, initially contains only the unnamed root
		
		// Parser utils
		accept = function(symbol) {
			if (currtok.type === symbol) {
				var returnSym = currtok.symbol;
				currtok = tokens.shift();
				return returnSym;
			}
			
			return false;
		},
		expect = function(type) {
			var returnSym = currtok.symbol;
			if (accept(type)) {
				return returnSym;
			}
			
			throw new Error("Unexpected symbol " + returnSym + ", expected " + type);
		},
		
		// Begin production rules
		length = function() {
			if (accept(':')) {
				var len = expect('NUMBER');
				currnode.branchlength = parseFloat(len);
			}
			// EMPTY - optional length
		},
		name = function() {
			var
			nodename = currtok.symbol,
			name = "";
			if (accept('STRING') || accept('NUMBER')) {
				name = nodename;
			}
			// Else, empty - name not required
			
			return name;
		},
		branch = function() {
			subtree();
			length();
		},
		branchset = function() {
			branch();
			while (accept(',')) {	
				branch();
			}
		},
		internal = function() {
			if (accept('(')) {
				var scopeNode = new node();
				scope.push(scopeNode);
				if (!root) {
					root = scopeNode;
				}
				
				branchset();
				expect(')');
				
				var
				popped = scope.pop(),
				nodename = name(),
				parent = scope[scope.length-1] || root;
				popped.data = nodename;
				
				if (popped !== parent) parent.addChild(popped);
				currnode = popped;
			}
			else {
				throw new Error("Expected (");
			}
		},
		leaf = function() {
			var
			nodename = name(),
			child = new node();
			
			child.data = nodename;
			if (scope.length-1 >= 0) {
				scope[scope.length-1].addChild(child);
			}
			else { // 1-element tree
				root = child;
			}
			currnode = child;
		},
		subtree = function() {
			if (currtok.symbol === '(') {
				internal();
			}
			else {
				leaf();
			}
		},
		tree = function() { //FIXME: ambiguous... need a longer lookahead
			if (currtok.symbol === '(') {
				subtree();
			}
			else {
				branch();
			}
			
			expect(';');
			
			return root;
		},
		file = function() {
			return tree();
		};
		
		node.prototype.addChild = function(n) { 
			this.children.push(n);
		};
		node.prototype.visit = function(callback) { // depth first traversal
			callback(this);
			for (var i = 0; i < this.children.length; i++) {
				if (this.children[i].visit(callback) === false) {
					break; // return false from your callback to end the traversal
				}
			}
		};
		node.prototype.clone = function(deep) {
			if (typeof deep === 'undefined') deep = false;
			
			var
			shallowCopy = function(n) {
				var copy = new node();
				for (property in n) {
					if (n.hasOwnProperty(property)) {
						copy[property] = n[property];
					}
				}
				
				copy.id = enumerator++; // maintain unique IDs
				return copy;
			},
			deepCopy = function(n) {
				var copy = shallowCopy(n);
				copy.children = [];
				for (var i = 0; i < n.children.length; i++) {
					copy.addChild(deepCopy(n.children[i]));
				}
				
				return copy;
			};
			
			if (deep) return deepCopy(this);
			return shallowCopy(this);
		};
		
		return file();
	}
};

/* Format Conversions */
nwk.converter = {};
nwk.converter.toBinary = function(tree) { // modify tree by adding unnamed ancestors and modifying branchlengths thus producing a binary tree with the same meaning
	var
	findNearestChild = function(node) { // the nearest node will be retained, while others are rerooted on an unnamed node
		var nearest;
		if (node.children.length > 0) nearest = node.children[0];
		for (var i = 1; i < node.children.length; i++) {
			var curr = node.children[i];
			if (curr.branchlength < nearest.branchlength) {
				nearest = curr;
			}
		}
		
		return nearest;
	},
	convertToBinary = function(node) {
		if (node.children.length < 3) { // already binary
			return node;
		}
		
		var
		children = node.children,
		nearest = findNearestChild(node),
		toReroot = [];
		
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			
			if (child !== nearest) {
				child.branchlength -= nearest.branchlength;
				toReroot.push(child);
			}
		}
			
		var unnamedRoot = node.clone();
		unnamedRoot.data = "";
		unnamedRoot.branchlength = nearest.branchlength;
		unnamedRoot.children = toReroot;
		node.children = [nearest, unnamedRoot];
	};
	
	var binary = tree.clone(true); // deep clone
	binary.visit(function(node) {
		convertToBinary(node);
	});
	
	return binary;
};
nwk.converter.toOneZoom = function(tree, allowNonbinary) {
	allowNonbinary = allowNonbinary || false;
	
	var ozNode = function() { // node structure as used by OneZoom
		this.cname = null; // common name
		this.name1 = null; // genus
		this.name2 = null; // species
		this.hasname1 = false;
		this.hasname2 = false;
		this.lengthbr = null; // branch length (Mya)
		this.phylogenetic_diversity = 0.0;
		this.richness_val = 0;
		this.child1 = null;
		this.child2 = null;
		this.popstab = "U";  // One of U, I, S, D
		this.redlist = "NE"; // One of EX, EW, CR, EN, VU, NT, LC, DD, NE
	},
	
	parseName = function(cplname) {
		/*
		* A name is given in the format:
		* 	name1_name2{cname_popstab_redlist}
		* [ is replaced by (
		* ] is replaced by )
		* * is replaced by a comma
		*/
		cplname = cplname.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\*/g, ',');
		var tokenize = function(srcString) {
			var tokens = {
				'{': /{/,
				'}': /}/,
				'_': /_/,
				'CONS_SYM': /^EX|EW|CR|EN|VU|NT|LC|DD|NE$/,
				'STAB_SYM': /^[U|I|S|D]$/,
				'STRING': /[a-zA-Z\+\.\(\),\\\-\d'\s\/]+/
			};
			
			return nwk.parser.tokenize(srcString, tokens);
		},
		
		tokens = tokenize(cplname),
		currtok = tokens.shift(),
		nameObj = {
			commonName: "",
			genus: "",
			species: "",
			stability: "U", // unknown by default
			conservationStatus: "NE" // not evaluated by default
		},
		
		accept = function(symbol) {
			if (currtok) {
				if (currtok.type === symbol) {
					var returnSym = currtok.symbol;
					currtok = tokens.shift();
					return returnSym;
				}
			}
			
			return false;
		},
		fuzzyExpect = function(type) {
			if (currtok) {
				var returnSym = currtok.symbol;
				if (accept(type)) {
					return returnSym;
				}
			}
			
			return false;
		},
		expect = function(type) {
			var ret = fuzzyExpect(type);
			if (ret === false) {
				throw new Error("Unexpected symbol in \"" + cplname + "\", expected " + type);
			}
		},
		
		popstats = function() { // population statistics
			if (accept('_')) {
				nameObj.conservationStatus = accept('CONS_SYM');
				expect('_');
				nameObj.stability = accept('STAB_SYM');
			}
			// EMPTY
		},
		commonName = function() {
			var comm = accept('STRING');
			if (comm) nameObj.commonName = comm;
			
			// OR EMPTY
		},
		infoPart = function() {
			if (accept('{')) {
				commonName();
				popstats();
				expect('}');
			}
			// EMPTY
		},
		latinName = function() {
			var genus = accept('STRING');
			if (genus) nameObj.genus = genus;
			if (fuzzyExpect('_')) {
				nameObj.species = accept('STRING');
			}
		},
		complexName = function() {
			latinName();
			infoPart();
		};
				
		complexName();
		return nameObj;
	},
	convertNode = function(node) { // convert a generic node into a OneZoom node
		var oz = new ozNode(),
		name = node.data,
		complexName = parseName(name);
		
		oz.cname = complexName.commonName;
		oz.name1 = complexName.genus;
		oz.name2 = complexName.species;
		oz.popstab = complexName.stability;
		oz.redlist = complexName.conservationStatus;
		oz.lengthbr = node.branchlength;
		oz.phylogenetic_diversity = 0.0;
		oz.richness_val = 0;
		
		if (oz.name1) oz.hasname1 = true;
		if (oz.name2) oz.hasname2 = true;
		
		return oz;
	},
	convert = function(n) {
		var recurse = function(gn) { // recurse over a generic node
			var currnode = convertNode(gn);
			for (var i = 0; i < gn.children.length; i++) {
				currnode.addChild(recurse(gn.children[i]));
			}
			
			return currnode;
		};
		
		return recurse(n);
	};
	
	ozNode.prototype.addChild = function(node) {
		if (this.child1 == null) {
			this.child1 = node;
		}
		else if (this.child2 == null) {
			this.child2 = node;
		}
		else {
			if (!allowNonbinary) {
				throw new Error("Can't convert tree to OneZoom - not a binary tree");
			}
			else {
				this.child2 = node;
			}
		}
	};
	ozNode.prototype.visit = function(callback) {
		callback(this);
		if (this.child1) this.child1.visit(callback);
		if (this.child2) this.child2.visit(callback);
	};
	
	return convert(tree);
};
nwk.converter.toJSON = function(tree, opts) {
	return JSON.stringify(tree);
};

/* Debugging Utilities */
nwk.debugger = {};
nwk.debugger.findNonbinaryNodes = function(tree) {
	var targets = [];
	tree.visit(function(node) {
		if (node.children.length > 2) targets.push(node);
	});
	
	return targets;
};
nwk.debugger.findUnnamedNodes = function(tree) {
	var targets = [];
	tree.visit(function(node) {
		if (node.data === "") targets.push(node);
	});
	
	return targets;
};
nwk.debugger.findUnlengthedNodes = function(tree) {
	var targets = [];
	tree.visit(function(node) {
		if (node.branchlength == 0) targets.push(node);
	});
	
	return targets;
};
nwk.debugger.findLeaves = function(tree) {
	var targets = [];
	tree.visit(function(node) {
		if (node.children.length == 0) targets.push(node);
	});
	
	return targets;
};

/* For node */
exports = typeof exports !== 'undefined' ? exports : {};
exports.parser = nwk.parser;
exports.converter = nwk.converter;
exports.debugger = nwk.debugger;

},{}],82:[function(require,module,exports){
var newick_parser = require('./dependencies/nwk.parser');

module.exports = newick_parser;
},{"./dependencies/nwk.parser":81}],83:[function(require,module,exports){

function newickParser(dataset, callback){

	var newickParser = require('./index.js');

	if (Object.keys(dataset).length == 0) {
		callback({error: 'Dataset does not exists.'});
		return false;
	}

	try{
		JSONnewick = newickParser.parser.parse(dataset.newick);
	}
	catch(err){
		var graph ={};
		graph.error = 'Newick parser error: ' + err.message;
		callback(graph);
		return false;
	}

	countTransitionNodes = 0;

	var nodes = {};
	var links = [];
	var graph = {};
	var sameProfileHas = {};
	var maxLinkValue = -1;


	checkChildren(JSONnewick, function(){

			checkIsolates(dataset, function(){

				graph.nodes = Object.keys(nodes).map(function(k) { return nodes[k] }); // nodeObject to array
				graph.links = links;
				graph.schemeGenes = dataset.schemegenes;
				graph.metadata = dataset.metadata;
				graph.key = dataset.key;
				graph.data_type = dataset.data_type;
				graph.dataset_name = dataset.name;

				if(Object.keys(dataset.distanceMatrix).length == 0) graph.distanceMatrix = {}; //graph.positions = JSON.parse(dataset.positions);
				else graph.distanceMatrix = dataset.distanceMatrix;

				if(Object.keys(dataset.positions).length == 0) graph.positions = {}; //graph.positions = JSON.parse(dataset.positions);
				else graph.positions = dataset.positions;

				callback(graph);

			})		
	});



	function checkChildren(JSONnewick, callback){

		JSONnewick.visit(function(node) {
			var nodeName = '';
			
			if (node.data == '') nodeName = 'TransitionNode' + String(node.id);
			else nodeName = node.data;
				
			nodes[nodeName] = {key : nodeName, isolates: [], profile: []};

			for(i in node.children){
				targetName = '';
				if (node.children[i].data == '') targetName = 'TransitionNode' + String(node.children[i].id);
				else targetName = node.children[i].data;

				links.push({source: nodeName, target: targetName, value: node.children[i].branchlength});	
				
				if (maxLinkValue < node.children[i].branchlength) maxLinkValue = node.children[i].branchlength;
			}

		});

		callback();

	}


	function checkIsolates(dataset, callback){

		dataset.isolates.forEach(function(isolate){

			if (sameProfileHas.hasOwnProperty(isolate[dataset.key])){
				isolate[dataset.key] = sameProfileHas[isolate[dataset.key]];
			}

			if(nodes[isolate[dataset.key]]){
				var arr = [];
				for (i in dataset.metadata) arr.push(isolate[dataset.metadata[i]]);
				//var arr = Object.keys(isolate).map(function(k) { return isolate[k]; });
			}

			try{
				nodes[isolate[dataset.key]].isolates.push(arr);
			}
			catch (err){
				var x = true;
			}
			
		});

		callback();
	}
}


module.exports = function(JSONnewick, callback){

	newickParser(JSONnewick, function(graph){
		callback(graph);
	});
}
},{"./index.js":82}],84:[function(require,module,exports){

function createProfileInput(dataset, callback){

	if (Object.keys(dataset).length == 0) {
		callback({error: 'Dataset does not exists.'});
		return false;
	}
	
	var linksToUse = dataset.links;
	
	var graph = {};
	var nodes = {};
	var links = [];
	var existsProfile = {};
	var profileKey = {};
	var sameProfileHas = {};

	checkNodes(dataset, function(error){
		checkIsolates(dataset, function(){
			checkLinks(linksToUse, function(){
				
				graph.nodes = Object.keys(nodes).map(function(k) { return nodes[k] }); // nodeObject to array
				//console.log(graph.nodes.length);
				graph.links = links;
				graph.schemeGenes = dataset.schemegenes;
				graph.metadata = dataset.metadata;
				graph.key = dataset.key;
				graph.data_type = dataset.data_type;
				graph.dataset_name = dataset.name;
				
				if(Object.keys(dataset.distanceMatrix).length == 0) graph.distanceMatrix = {}; //graph.positions = JSON.parse(dataset.positions);
				else graph.distanceMatrix = dataset.distanceMatrix;

				if(Object.keys(dataset.positions).length == 0) graph.positions = {}; //graph.positions = JSON.parse(dataset.positions);
				else graph.positions = dataset.positions;

				//getMissingData(dataset.profiles, function(missingData){
				//  graph.missingData = missingData;
                //  callback(graph);
                //});

				callback(graph);
				
			});
		});
	});

	function checkNodes(dataset, callback){

		dataset.profiles.forEach(function(profile){
			var arr = [];
			for (i in dataset.schemegenes) arr.push(profile[dataset.schemegenes[i]]);
			//var arr = Object.keys(profile).map(function(k) { return profile[k] });
			var key = arr.shift();
			//arr = arr.reverse();
			var node = {key: key, profile: arr, isolates: []};

			
			if(existsProfile[String(arr)]) {
				sameProfileHas[String(key)] = profileKey[String(arr)];
				//console.log('profile already exists');
			}
			
			else{
				profileKey[String(arr)] = key;
				existsProfile[String(arr)] = true;
				nodes[key] = node;
			}
		});

		callback();
	}

	function checkIsolates(dataset, callback){

		dataset.isolates.forEach(function(isolate){

			if (sameProfileHas.hasOwnProperty(isolate[dataset.key])){
				isolate[dataset.key] = sameProfileHas[isolate[dataset.key]];
			}

			if(nodes[isolate[dataset.key]]){
				var arr = [];
				for (i in dataset.metadata) arr.push(isolate[dataset.metadata[i]]);
				//var arr = Object.keys(isolate).map(function(k) { return isolate[k]; });
			}

			try{
				nodes[isolate[dataset.key]].isolates.push(arr);
			}
			catch (err){
				var x = true;
			}
			
		});

		callback();
	}

	function checkLinks(linksToUse, callback){

		linksToUse.forEach(function(link){
			links.push({source: link.source, target: link.target, value: link.value});
		});

		callback();
	}
}


function getMissingData(data, callback){

  var profiles = data.map(function(k) { 
    var arrayToUse = Object.keys(k).map(function(z){
                    return k[z];
                  }); 

    return arrayToUse.slice(1,arrayToUse.length);
  });

  var missingDataArray = profiles.map(function(d,i){
    var countMissing = 0;
    d.map(function(x){
      if (x == "-" || x =="") countMissing += 1;
    });
    return countMissing;
  });

  callback(missingDataArray);



}


module.exports = function(dataset, callback){

	createProfileInput(dataset, function(graph){
		callback(graph);
	});
}
},{}],85:[function(require,module,exports){

function changeNodeUIData(linkInformation, callback){


	var objectOfType = linkInformation.data_link_info.objectOfType;
	var graphics = linkInformation.graphObject.graphics;
	var propertyIndexes = linkInformation.data_link_info.propertyIndexes;
	var arrayColors = linkInformation.data_link_info.arrayColors;
	var renderer = linkInformation.graphObject.renderer;

	var assignQuadrant = linkInformation.graphObject.assignQuadrant;
	var getDataPercentage = linkInformation.graphObject.getDataPercentage;


	for(i in objectOfType){
	    var dataToChange = [];
	    var indexes = [];
	    var nodeUI = graphics.getNodeUI(i);
	    
	    if(Object.keys(objectOfType[i]).length > 0){

		    nodeUI.rawData = objectOfType[i];

		    for (j in objectOfType[i]){
		      dataToChange.push(objectOfType[i][j]);
		      indexes.push(arrayColors[propertyIndexes[j]]);
		    }
		}

		noDataColor = 0xDEDEDE; //Color to use when there is no associated data to the nodes
	    if (dataToChange.length < 1) newValues = assignQuadrant(getDataPercentage([1]), [noDataColor]);
	    else newValues = assignQuadrant(getDataPercentage(dataToChange), indexes);
	    
	    dataToChange = newValues[0];
	    indexes = newValues[1];
	    
	    nodeUI.data = dataToChange;  //Apply data to the nodeUI
	    nodeUI.colorIndexes = indexes; //Apply data to the nodeUI
	    nodeUI.backupColor = indexes;

  	}

  	callback();

}

module.exports = changeNodeUIData;
},{}],86:[function(require,module,exports){
var linkMetadata = require('./linkMetadata.js');
var linkSchemeData = require('./linkSchemeData.js');
var changeNodeUIData = require('./changeNodeUIData.js');
var utils = require('./link_utils.js');
var phylovizUtils = require('phyloviz_utils');


function phyloviz_link(graphObject, callback){

	var arrayColorsIsolates = [];
	var arrayColorsProfiles = [];
	var property_IndexIsolates = {};

	phylovizObject = {
		graphObject: graphObject,
		data_link_info: {},
		Utils: phylovizUtils
	}

	phylovizObject.data_link_info.linkMethod = graphObject.linkMethod;
	phylovizObject.data_link_info.propertyIndex = graphObject.propertyIndex;

	utils.getDataFromNodes(phylovizObject, function(DataFromIndex){
		phylovizObject.data_link_info.DataFromIndex = DataFromIndex;

		utils.gatherDuplicatesAndCounts(DataFromIndex, function(data){
			phylovizObject.data_link_info.dataArray = data;

			utils.getColors(data, function(results){
				phylovizObject.data_link_info.arrayColors = results.arrayColors;
				phylovizObject.data_link_info.propertyIndexes = results.propertyIndex;

				if (phylovizObject.data_link_info.linkMethod == 'isolates'){
					linkMetadata(phylovizObject, function(){
						changeNodeUIData(phylovizObject, function(){
							callback(phylovizObject);
						});
					});
				}
				else if(phylovizObject.data_link_info.linkMethod == 'profiles'){
					linkSchemeData(phylovizObject, function(){
						changeNodeUIData(phylovizObject, function(){
							callback(phylovizObject);
						});

					});
				}
			});
		});
	});

}

module.exports = phyloviz_link;



},{"./changeNodeUIData.js":85,"./linkMetadata.js":87,"./linkSchemeData.js":88,"./link_utils.js":89,"phyloviz_utils":95}],87:[function(require,module,exports){

function linkMetadata(linkInformation, callback){

	var graph = linkInformation.graphObject.graphInput;
	var propertyIndex = linkInformation.data_link_info.propertyIndex;

	gatherMetadata(graph, propertyIndex, function(results){
		linkInformation.data_link_info.objectOfTotal = results.objectOfTotal;
		linkInformation.data_link_info.objectOfType = results.objectOfType;
		linkInformation.data_link_info.countProperties = results.countProperties;

		callback();
	});
}


function gatherMetadata(graph, propertyIndex, callback){

	var objectOfTotal = {};
	var objectOfType = {};

	var countProperties = 0;
	var maxDiffProperties = 1;

	graph.nodes.forEach(function(node){

		objectOfType[node.key] = [];
		var numberTypes = 0;


		if (node.isolates.length > 0){

		  for (i = 0; i < node.isolates.length; i++){

		      if(objectOfTotal[String(node.isolates[i][propertyIndex])]) objectOfTotal[String(node.isolates[i][propertyIndex])] += 1;
		      else{
		        objectOfTotal[String(node.isolates[i][propertyIndex])] = 1;
		        countProperties += 1;
		      } 

      		  if(objectOfType[node.key][String(node.isolates[i][propertyIndex])]) objectOfType[node.key][String(node.isolates[i][propertyIndex])] += 1;
		      else{
		        numberTypes += 1;
		        objectOfType[node.key][String(node.isolates[i][propertyIndex])] = 1;
		      } 
		      
		  }
		}
		

  	});

  	var results = {
  		objectOfTotal: objectOfTotal,
  		objectOfType: objectOfType,
  		countProperties: countProperties
  	}

  	callback(results);
}

module.exports = linkMetadata;
},{}],88:[function(require,module,exports){

function linkSchemeData(linkInformation, callback){

	var graph = linkInformation.graphObject.graphInput;
	var propertyIndex = linkInformation.data_link_info.propertyIndex;

	gatherSchemeData(graph, propertyIndex, function(results){
		linkInformation.data_link_info.objectOfTotal = results.objectOfTotal;
		linkInformation.data_link_info.objectOfType = results.objectOfType;
		linkInformation.data_link_info.countProperties = results.countProperties;
		
		callback();
	});
}


function gatherSchemeData(graph, propertyIndex, callback){

	var objectOfTotal = {};
	var objectOfProfile = {};
	var countProperties = 0;

	graph.nodes.forEach(function(node){

	    objectOfProfile[node.key] = [];
	    var numberTypes = 0;

    	var schemeGenes = graph.schemeGenes.slice();
			schemeGenes.shift();

        if(objectOfTotal[String(node.profile[propertyIndex])]) objectOfTotal[String(node.profile[propertyIndex])] += 1;
        else{
            objectOfTotal[String(node.profile[propertyIndex])] = 1;
            countProperties += 1;
          }

        if(objectOfProfile[node.key][String(node.profile[propertyIndex])]) objectOfProfile[node.key][String(node.profile[propertyIndex])] += 1;
        else{
          numberTypes += 1;
          objectOfProfile[node.key][String(node.profile[propertyIndex])] = 1;
        }
			

	});

	var results = {
  		objectOfTotal: objectOfTotal,
  		objectOfType: objectOfProfile,
  		countProperties: countProperties
  	}

	callback(results);

}

module.exports = linkSchemeData;
},{}],89:[function(require,module,exports){
var d3 = require('d3');

function getColors(data, callback){
	var arrayColors = [];
	var propertyIndex = {};
	var results = {};

	var color = d3.scaleCategory20();

	for (i in data){
		arrayColors.push(color(i).replace('#', '0x'));
		propertyIndex[data[i].label] = i;
	}

	results.arrayColors = arrayColors;
	results.propertyIndex = propertyIndex;

	callback(results);

}

function getDataFromNodes(linkInformation, callback){

	//var data = [];
	var linkMethod = linkInformation.data_link_info.linkMethod;
	var nodes = linkInformation.graphObject.graphInput.nodes;
	var propertyIndex = linkInformation.data_link_info.propertyIndex;

	var dataToCheck = [];

	if (linkMethod == 'isolates'){
		nodes.map(function(x){
			x.isolates.map(function(y){
				dataToCheck.push(y[propertyIndex]);
			});
		});
	}
	else if (linkMethod == 'profiles'){
		nodes.map(function(x){
			x.profile.map(function(y){
				dataToCheck.push(y);
			});
		});
	}

	callback(dataToCheck);


}


function gatherDuplicatesAndCounts(dataArray, callback){
	var gatherData = {};
	var data = [];
	
	for(i in dataArray){
		if (Number.isInteger(parseInt(i))){
			if (gatherData.hasOwnProperty(dataArray[i])) gatherData[dataArray[i]] += 1;
			else gatherData[dataArray[i]] = 1;
		}
	}

	for(i in gatherData){
	 	data.push({label: i, value: gatherData[i]});
	}

	callback(data);
}

module.exports = {
	getColors: getColors,
	getDataFromNodes: getDataFromNodes,
	gatherDuplicatesAndCounts: gatherDuplicatesAndCounts
}
},{"d3":90}],90:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('d3', ['exports'], factory) :
	(factory((global.d3 = {})));
}(this, function (exports) { 'use strict';

	var version = "4.0.0-alpha.9";

	function ascending(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	};

	function bisector(compare) {
	  if (compare.length === 1) compare = ascendingComparator(compare);
	  return {
	    left: function(a, x, lo, hi) {
	      if (arguments.length < 3) lo = 0;
	      if (arguments.length < 4) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) < 0) lo = mid + 1;
	        else hi = mid;
	      }
	      return lo;
	    },
	    right: function(a, x, lo, hi) {
	      if (arguments.length < 3) lo = 0;
	      if (arguments.length < 4) hi = a.length;
	      while (lo < hi) {
	        var mid = lo + hi >>> 1;
	        if (compare(a[mid], x) > 0) hi = mid;
	        else lo = mid + 1;
	      }
	      return lo;
	    }
	  };
	};

	function ascendingComparator(f) {
	  return function(d, x) {
	    return ascending(f(d), x);
	  };
	}

	var ascendingBisect = bisector(ascending);
	var bisectRight = ascendingBisect.right;
	var bisectLeft = ascendingBisect.left;

	function descending(a, b) {
	  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
	};

	function number$1(x) {
	  return x === null ? NaN : +x;
	};

	function variance(array, f) {
	  var n = array.length,
	      m = 0,
	      a,
	      d,
	      s = 0,
	      i = -1,
	      j = 0;

	  if (arguments.length === 1) {
	    while (++i < n) {
	      if (!isNaN(a = number$1(array[i]))) {
	        d = a - m;
	        m += d / ++j;
	        s += d * (a - m);
	      }
	    }
	  }

	  else {
	    while (++i < n) {
	      if (!isNaN(a = number$1(f(array[i], i, array)))) {
	        d = a - m;
	        m += d / ++j;
	        s += d * (a - m);
	      }
	    }
	  }

	  if (j > 1) return s / (j - 1);
	};

	function deviation() {
	  var v = variance.apply(this, arguments);
	  return v ? Math.sqrt(v) : v;
	};

	function extent(array, f) {
	  var i = -1,
	      n = array.length,
	      a,
	      b,
	      c;

	  if (arguments.length === 1) {
	    while (++i < n) if ((b = array[i]) != null && b >= b) { a = c = b; break; }
	    while (++i < n) if ((b = array[i]) != null) {
	      if (a > b) a = b;
	      if (c < b) c = b;
	    }
	  }

	  else {
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = c = b; break; }
	    while (++i < n) if ((b = f(array[i], i, array)) != null) {
	      if (a > b) a = b;
	      if (c < b) c = b;
	    }
	  }

	  return [a, c];
	};

	function constant(x) {
	  return function() {
	    return x;
	  };
	};

	function identity$3(x) {
	  return x;
	};

	function sequence(start, stop, step) {
	  if ((n = arguments.length) < 3) {
	    step = 1;
	    if (n < 2) {
	      stop = start;
	      start = 0;
	    }
	  }

	  var i = -1,
	      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
	      range = new Array(n);

	  while (++i < n) {
	    range[i] = start + i * step;
	  }

	  return range;
	};

	var e10 = Math.sqrt(50);
	var e5 = Math.sqrt(10);
	var e2 = Math.sqrt(2);
	function ticks(start, stop, count) {
	  var step = tickStep(start, stop, count);
	  return sequence(
	    Math.ceil(start / step) * step,
	    Math.floor(stop / step) * step + step / 2, // inclusive
	    step
	  );
	};

	function tickStep(start, stop, count) {
	  var step0 = Math.abs(stop - start) / Math.max(0, count),
	      step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
	      error = step0 / step1;
	  if (error >= e10) step1 *= 10;
	  else if (error >= e5) step1 *= 5;
	  else if (error >= e2) step1 *= 2;
	  return stop < start ? -step1 : step1;
	};

	function sturges(values) {
	  return Math.ceil(Math.log(values.length) / Math.LN2) + 1;
	};

	function number(x) {
	  return +x;
	}

	function histogram() {
	  var value = identity$3,
	      domain = extent,
	      threshold = sturges;

	  function histogram(data) {
	    var i,
	        n = data.length,
	        x,
	        values = new Array(n);

	    // Coerce values to numbers.
	    for (i = 0; i < n; ++i) {
	      values[i] = +value(data[i], i, data);
	    }

	    var xz = domain(values),
	        x0 = +xz[0],
	        x1 = +xz[1],
	        tz = threshold(values, x0, x1);

	    // Convert number of thresholds into uniform thresholds.
	    if (!Array.isArray(tz)) tz = ticks(x0, x1, +tz);

	    // Coerce thresholds to numbers, ignoring any outside the domain.
	    var m = tz.length;
	    for (i = 0; i < m; ++i) tz[i] = +tz[i];
	    while (tz[0] <= x0) tz.shift(), --m;
	    while (tz[m - 1] >= x1) tz.pop(), --m;

	    var bins = new Array(m + 1),
	        bin;

	    // Initialize bins.
	    for (i = 0; i <= m; ++i) {
	      bin = bins[i] = [];
	      bin.x0 = i > 0 ? tz[i - 1] : x0;
	      bin.x1 = i < m ? tz[i] : x1;
	    }

	    // Assign data to bins by value, ignoring any outside the domain.
	    for (i = 0; i < n; ++i) {
	      x = values[i];
	      if (x0 <= x && x <= x1) {
	        bins[bisectRight(tz, x, 0, m)].push(data[i]);
	      }
	    }

	    return bins;
	  }

	  histogram.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant(+_), histogram) : value;
	  };

	  histogram.domain = function(_) {
	    return arguments.length ? (domain = typeof _ === "function" ? _ : constant([+_[0], +_[1]]), histogram) : domain;
	  };

	  histogram.thresholds = function(_) {
	    if (!arguments.length) return threshold;
	    threshold = typeof _ === "function" ? _
	        : Array.isArray(_) ? constant(Array.prototype.map.call(_, number))
	        : constant(+_);
	    return histogram;
	  };

	  return histogram;
	};

	function quantile(array, p, f) {
	  if (arguments.length < 3) f = number$1;
	  if (!(n = array.length)) return;
	  if ((p = +p) <= 0 || n < 2) return +f(array[0], 0, array);
	  if (p >= 1) return +f(array[n - 1], n - 1, array);
	  var n,
	      h = (n - 1) * p,
	      i = Math.floor(h),
	      a = +f(array[i], i, array),
	      b = +f(array[i + 1], i + 1, array);
	  return a + (b - a) * (h - i);
	};

	function freedmanDiaconis(values, min, max) {
	  values.sort(ascending);
	  return Math.ceil((max - min) / (2 * (quantile(values, 0.75) - quantile(values, 0.25)) * Math.pow(values.length, -1 / 3)));
	};

	function scott(values, min, max) {
	  return Math.ceil((max - min) / (3.5 * deviation(values) * Math.pow(values.length, -1 / 3)));
	};

	function max(array, f) {
	  var i = -1,
	      n = array.length,
	      a,
	      b;

	  if (arguments.length === 1) {
	    while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = array[i]) != null && b > a) a = b;
	  }

	  else {
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b > a) a = b;
	  }

	  return a;
	};

	function mean(array, f) {
	  var s = 0,
	      n = array.length,
	      a,
	      i = -1,
	      j = n;

	  if (arguments.length === 1) {
	    while (++i < n) if (!isNaN(a = number$1(array[i]))) s += a; else --j;
	  }

	  else {
	    while (++i < n) if (!isNaN(a = number$1(f(array[i], i, array)))) s += a; else --j;
	  }

	  if (j) return s / j;
	};

	function median(array, f) {
	  var numbers = [],
	      n = array.length,
	      a,
	      i = -1;

	  if (arguments.length === 1) {
	    while (++i < n) if (!isNaN(a = number$1(array[i]))) numbers.push(a);
	  }

	  else {
	    while (++i < n) if (!isNaN(a = number$1(f(array[i], i, array)))) numbers.push(a);
	  }

	  return quantile(numbers.sort(ascending), 0.5);
	};

	function merge(arrays) {
	  var n = arrays.length,
	      m,
	      i = -1,
	      j = 0,
	      merged,
	      array;

	  while (++i < n) j += arrays[i].length;
	  merged = new Array(j);

	  while (--n >= 0) {
	    array = arrays[n];
	    m = array.length;
	    while (--m >= 0) {
	      merged[--j] = array[m];
	    }
	  }

	  return merged;
	};

	function min(array, f) {
	  var i = -1,
	      n = array.length,
	      a,
	      b;

	  if (arguments.length === 1) {
	    while (++i < n) if ((b = array[i]) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = array[i]) != null && a > b) a = b;
	  }

	  else {
	    while (++i < n) if ((b = f(array[i], i, array)) != null && b >= b) { a = b; break; }
	    while (++i < n) if ((b = f(array[i], i, array)) != null && a > b) a = b;
	  }

	  return a;
	};

	function pairs(array) {
	  var i = 0, n = array.length - 1, p0, p1 = array[0], pairs = new Array(n < 0 ? 0 : n);
	  while (i < n) pairs[i] = [p0 = p1, p1 = array[++i]];
	  return pairs;
	};

	function permute(array, indexes) {
	  var i = indexes.length, permutes = new Array(i);
	  while (i--) permutes[i] = array[indexes[i]];
	  return permutes;
	};

	function scan(array, compare) {
	  if (!(n = array.length)) return;
	  var i = 0,
	      n,
	      j = 0,
	      xi,
	      xj = array[j];

	  if (!compare) compare = ascending;

	  while (++i < n) if (compare(xi = array[i], xj) < 0 || compare(xj, xj) !== 0) xj = xi, j = i;

	  if (compare(xj, xj) === 0) return j;
	};

	function shuffle(array, i0, i1) {
	  if ((m = arguments.length) < 3) {
	    i1 = array.length;
	    if (m < 2) i0 = 0;
	  }

	  var m = i1 - i0,
	      t,
	      i;

	  while (m) {
	    i = Math.random() * m-- | 0;
	    t = array[m + i0];
	    array[m + i0] = array[i + i0];
	    array[i + i0] = t;
	  }

	  return array;
	};

	function sum(array, f) {
	  var s = 0,
	      n = array.length,
	      a,
	      i = -1;

	  if (arguments.length === 1) {
	    while (++i < n) if (a = +array[i]) s += a; // Note: zero and null are equivalent.
	  }

	  else {
	    while (++i < n) if (a = +f(array[i], i, array)) s += a;
	  }

	  return s;
	};

	function transpose(matrix) {
	  if (!(n = matrix.length)) return [];
	  for (var i = -1, m = min(matrix, length), transpose = new Array(m); ++i < m;) {
	    for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
	      row[j] = matrix[j][i];
	    }
	  }
	  return transpose;
	};

	function length(d) {
	  return d.length;
	}

	function zip() {
	  return transpose(arguments);
	};

	var prefix = "$";

	function Map() {}

	Map.prototype = map.prototype = {
	  has: function(key) {
	    return (prefix + key) in this;
	  },
	  get: function(key) {
	    return this[prefix + key];
	  },
	  set: function(key, value) {
	    this[prefix + key] = value;
	    return this;
	  },
	  remove: function(key) {
	    var property = prefix + key;
	    return property in this && delete this[property];
	  },
	  clear: function() {
	    for (var property in this) if (property[0] === prefix) delete this[property];
	  },
	  keys: function() {
	    var keys = [];
	    for (var property in this) if (property[0] === prefix) keys.push(property.slice(1));
	    return keys;
	  },
	  values: function() {
	    var values = [];
	    for (var property in this) if (property[0] === prefix) values.push(this[property]);
	    return values;
	  },
	  entries: function() {
	    var entries = [];
	    for (var property in this) if (property[0] === prefix) entries.push({key: property.slice(1), value: this[property]});
	    return entries;
	  },
	  size: function() {
	    var size = 0;
	    for (var property in this) if (property[0] === prefix) ++size;
	    return size;
	  },
	  empty: function() {
	    for (var property in this) if (property[0] === prefix) return false;
	    return true;
	  },
	  each: function(f) {
	    for (var property in this) if (property[0] === prefix) f(this[property], property.slice(1), this);
	  }
	};

	function map(object, f) {
	  var map = new Map;

	  // Copy constructor.
	  if (object instanceof Map) object.each(function(value, key) { map.set(key, value); });

	  // Index array by numeric index or specified key function.
	  else if (Array.isArray(object)) {
	    var i = -1,
	        n = object.length,
	        o;

	    if (arguments.length === 1) while (++i < n) map.set(i, object[i]);
	    else while (++i < n) map.set(f(o = object[i], i, object), o);
	  }

	  // Convert object to map.
	  else if (object) for (var key in object) map.set(key, object[key]);

	  return map;
	}

	function nest() {
	  var keys = [],
	      sortKeys = [],
	      sortValues,
	      rollup,
	      nest;

	  function apply(array, depth, createResult, setResult) {
	    if (depth >= keys.length) return rollup
	        ? rollup(array) : (sortValues
	        ? array.sort(sortValues)
	        : array);

	    var i = -1,
	        n = array.length,
	        key = keys[depth++],
	        keyValue,
	        value,
	        valuesByKey = map(),
	        values,
	        result = createResult();

	    while (++i < n) {
	      if (values = valuesByKey.get(keyValue = key(value = array[i]) + "")) {
	        values.push(value);
	      } else {
	        valuesByKey.set(keyValue, [value]);
	      }
	    }

	    valuesByKey.each(function(values, key) {
	      setResult(result, key, apply(values, depth, createResult, setResult));
	    });

	    return result;
	  }

	  function entries(map, depth) {
	    if (depth >= keys.length) return map;

	    var array = [],
	        sortKey = sortKeys[depth++];

	    map.each(function(value, key) {
	      array.push({key: key, values: entries(value, depth)});
	    });

	    return sortKey
	        ? array.sort(function(a, b) { return sortKey(a.key, b.key); })
	        : array;
	  }

	  return nest = {
	    object: function(array) { return apply(array, 0, createObject, setObject); },
	    map: function(array) { return apply(array, 0, createMap, setMap); },
	    entries: function(array) { return entries(apply(array, 0, createMap, setMap), 0); },
	    key: function(d) { keys.push(d); return nest; },
	    sortKeys: function(order) { sortKeys[keys.length - 1] = order; return nest; },
	    sortValues: function(order) { sortValues = order; return nest; },
	    rollup: function(f) { rollup = f; return nest; }
	  };
	};

	function createObject() {
	  return {};
	}

	function setObject(object, key, value) {
	  object[key] = value;
	}

	function createMap() {
	  return map();
	}

	function setMap(map, key, value) {
	  map.set(key, value);
	}

	function Set() {}

	var proto = map.prototype;

	Set.prototype = set.prototype = {
	  has: proto.has,
	  add: function(value) {
	    value += "";
	    this[prefix + value] = value;
	    return this;
	  },
	  remove: proto.remove,
	  clear: proto.clear,
	  values: proto.keys,
	  size: proto.size,
	  empty: proto.empty,
	  each: proto.each
	};

	function set(object, f) {
	  var set = new Set;

	  // Copy constructor.
	  if (object instanceof Set) object.each(function(value) { set.add(value); });

	  // Otherwise, assume it’s an array.
	  else if (object) {
	    var i = -1, n = object.length, o;
	    if (arguments.length === 1) while (++i < n) set.add(object[i]);
	    else while (++i < n) set.add(f(o = object[i], i, object));
	  }

	  return set;
	}

	function keys(map) {
	  var keys = [];
	  for (var key in map) keys.push(key);
	  return keys;
	};

	function values(map) {
	  var values = [];
	  for (var key in map) values.push(map[key]);
	  return values;
	};

	function entries(map) {
	  var entries = [];
	  for (var key in map) entries.push({key: key, value: map[key]});
	  return entries;
	};

	function uniform(min, max) {
	  var n = arguments.length;
	  if (!n) min = 0, max = 1;
	  else if (n === 1) max = +min, min = 0;
	  else min = +min, max = +max - min;
	  return function() {
	    return Math.random() * max + min;
	  };
	};

	function normal(mu, sigma) {
	  var n = arguments.length;
	  if (!n) mu = 0, sigma = 1;
	  else if (n === 1) mu = +mu, sigma = 1;
	  else mu = +mu, sigma = +sigma;
	  return function() {
	    var x, y, r;
	    do {
	      x = Math.random() * 2 - 1;
	      y = Math.random() * 2 - 1;
	      r = x * x + y * y;
	    } while (!r || r > 1);
	    return mu + sigma * x * Math.sqrt(-2 * Math.log(r) / r);
	  };
	};

	function logNormal() {
	  var randomNormal = normal.apply(this, arguments);
	  return function() {
	    return Math.exp(randomNormal());
	  };
	};

	function irwinHall(n) {
	  return function() {
	    for (var sum = 0, i = 0; i < n; ++i) sum += Math.random();
	    return sum;
	  };
	};

	function bates(n) {
	  var randomIrwinHall = irwinHall(n);
	  return function() {
	    return randomIrwinHall() / n;
	  };
	};

	function exponential(lambda) {
	  return function() {
	    return -Math.log(1 - Math.random()) / lambda;
	  };
	};

	var slice = Array.prototype.slice;

	function bind1(type, a) {
	  return function(t) {
	    return type(t, a);
	  };
	}

	function bind2(type, a, b) {
	  return function(t) {
	    return type(t, a, b);
	  };
	}

	function bindN(type, args) {
	  args = slice.call(args);
	  args[0] = null;
	  return function(t) {
	    args[0] = t;
	    return type.apply(null, args);
	  };
	}

	function bind(type, a, b) {
	  switch (arguments.length) {
	    case 1: return type;
	    case 2: return bind1(type, a);
	    case 3: return bind2(type, a, b);
	    default: return bindN(type, arguments);
	  }
	};

	function linearIn(t) {
	  return +t;
	};

	function quadIn(t) {
	  return t * t;
	};

	function quadOut(t) {
	  return t * (2 - t);
	};

	function quadInOut(t) {
	  return ((t *= 2) <= 1 ? t * t : --t * (2 - t) + 1) / 2;
	};

	function cubicIn(t) {
	  return t * t * t;
	};

	function cubicOut(t) {
	  return --t * t * t + 1;
	};

	function cubicInOut(t) {
	  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
	};

	function polyIn(t, e) {
	  if (e == null) e = 3;
	  return Math.pow(t, e);
	};

	function polyOut(t, e) {
	  if (e == null) e = 3;
	  return 1 - Math.pow(1 - t, e);
	};

	function polyInOut(t, e) {
	  if (e == null) e = 3;
	  return ((t *= 2) <= 1 ? Math.pow(t, e) : 2 - Math.pow(2 - t, e)) / 2;
	};

	var pi = Math.PI;
	var halfPi = pi / 2;
	function sinIn(t) {
	  return 1 - Math.cos(t * halfPi);
	};

	function sinOut(t) {
	  return Math.sin(t * halfPi);
	};

	function sinInOut(t) {
	  return (1 - Math.cos(pi * t)) / 2;
	};

	function expIn(t) {
	  return Math.pow(2, 10 * t - 10);
	};

	function expOut(t) {
	  return 1 - Math.pow(2, -10 * t);
	};

	function expInOut(t) {
	  return ((t *= 2) <= 1 ? Math.pow(2, 10 * t - 10) : 2 - Math.pow(2, 10 - 10 * t)) / 2;
	};

	function circleIn(t) {
	  return 1 - Math.sqrt(1 - t * t);
	};

	function circleOut(t) {
	  return Math.sqrt(1 - --t * t);
	};

	function circleInOut(t) {
	  return ((t *= 2) <= 1 ? 1 - Math.sqrt(1 - t * t) : Math.sqrt(1 - (t -= 2) * t) + 1) / 2;
	};

	var b1 = 4 / 11;
	var b2 = 6 / 11;
	var b3 = 8 / 11;
	var b4 = 3 / 4;
	var b5 = 9 / 11;
	var b6 = 10 / 11;
	var b7 = 15 / 16;
	var b8 = 21 / 22;
	var b9 = 63 / 64;
	var b0 = 1 / b1 / b1;
	function bounceIn(t) {
	  return 1 - bounceOut(1 - t);
	};

	function bounceOut(t) {
	  return t < b1 ? b0 * t * t : t < b3 ? b0 * (t -= b2) * t + b4 : t < b6 ? b0 * (t -= b5) * t + b7 : b0 * (t -= b8) * t + b9;
	};

	function bounceInOut(t) {
	  return ((t *= 2) <= 1 ? 1 - bounceOut(1 - t) : bounceOut(t - 1) + 1) / 2;
	};

	function backIn(t, s) {
	  s = s == null ? 1.70158 : +s;
	  return t * t * ((s + 1) * t - s);
	};

	function backOut(t, s) {
	  s = s == null ? 1.70158 : +s;
	  return --t * t * ((s + 1) * t + s) + 1;
	};

	function backInOut(t, s) {
	  s = s == null ? 1.70158 : +s;
	  return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) : (t -= 2) * t * ((s + 1) * t + s) + 2) / 2;
	};

	var tau = 2 * Math.PI;

	function elasticIn(t, a, p) {
	  a = a == null ? 1 : Math.max(1, a);
	  p = (p == null ? 0.3 : p) / tau;
	  return a * Math.pow(2, 10 * --t) * Math.sin((p * Math.asin(1 / a) - t) / p);
	};

	function elasticOut(t, a, p) {
	  a = a == null ? 1 : Math.max(1, a);
	  p = (p == null ? 0.3 : p) / tau;
	  return 1 - a * Math.pow(2, -10 * t) * Math.sin((+t + p * Math.asin(1 / a)) / p);
	};

	function elasticInOut(t, a, p) {
	  a = a == null ? 1 : Math.max(1, a);
	  p = (p == null ? 0.3 : p) / tau;
	  var s = p * Math.asin(1 / a);
	  return ((t = t * 2 - 1) < 0
	      ? a * Math.pow(2, 10 * t) * Math.sin((s - t) / p)
	      : 2 - a * Math.pow(2, -10 * t) * Math.sin((s + t) / p)) / 2;
	};

	function area(polygon) {
	  var i = -1,
	      n = polygon.length,
	      a,
	      b = polygon[n - 1],
	      area = 0;

	  while (++i < n) {
	    a = b;
	    b = polygon[i];
	    area += a[1] * b[0] - a[0] * b[1];
	  }

	  return area / 2;
	};

	function centroid(polygon) {
	  var i = -1,
	      n = polygon.length,
	      x = 0,
	      y = 0,
	      a,
	      b = polygon[n - 1],
	      c,
	      k = 0;

	  while (++i < n) {
	    a = b;
	    b = polygon[i];
	    k += c = a[0] * b[1] - b[0] * a[1];
	    x += (a[0] + b[0]) * c;
	    y += (a[1] + b[1]) * c;
	  }

	  return k *= 3, [x / k, y / k];
	};

	// Returns the 2D cross product of AB and AC vectors, i.e., the z-component of
	// the 3D cross product in a quadrant I Cartesian coordinate system (+x is
	// right, +y is up). Returns a positive value if ABC is counter-clockwise,
	// negative if clockwise, and zero if the points are collinear.
	function cross$1(a, b, c) {
	  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
	};

	function lexicographicOrder(a, b) {
	  return a[0] - b[0] || a[1] - b[1];
	}

	// Computes the upper convex hull per the monotone chain algorithm.
	// Assumes points.length >= 3, is sorted by x, unique in y.
	// Returns an array of indices into points in left-to-right order.
	function computeUpperHullIndexes(points) {
	  var n = points.length,
	      indexes = [0, 1],
	      size = 2;

	  for (var i = 2; i < n; ++i) {
	    while (size > 1 && cross$1(points[indexes[size - 2]], points[indexes[size - 1]], points[i]) <= 0) --size;
	    indexes[size++] = i;
	  }

	  return indexes.slice(0, size); // remove popped points
	}

	function hull(points) {
	  if ((n = points.length) < 3) return null;

	  var i,
	      n,
	      sortedPoints = new Array(n),
	      flippedPoints = new Array(n);

	  for (i = 0; i < n; ++i) sortedPoints[i] = [+points[i][0], +points[i][1], i];
	  sortedPoints.sort(lexicographicOrder);
	  for (i = 0; i < n; ++i) flippedPoints[i] = [sortedPoints[i][0], -sortedPoints[i][1]];

	  var upperIndexes = computeUpperHullIndexes(sortedPoints),
	      lowerIndexes = computeUpperHullIndexes(flippedPoints);

	  // Construct the hull polygon, removing possible duplicate endpoints.
	  var skipLeft = lowerIndexes[0] === upperIndexes[0],
	      skipRight = lowerIndexes[lowerIndexes.length - 1] === upperIndexes[upperIndexes.length - 1],
	      hull = [];

	  // Add upper hull in right-to-l order.
	  // Then add lower hull in left-to-right order.
	  for (i = upperIndexes.length - 1; i >= 0; --i) hull.push(points[sortedPoints[upperIndexes[i]][2]]);
	  for (i = +skipLeft; i < lowerIndexes.length - skipRight; ++i) hull.push(points[sortedPoints[lowerIndexes[i]][2]]);

	  return hull;
	};

	function contains(polygon, point) {
	  var n = polygon.length,
	      p = polygon[n - 1],
	      x = point[0], y = point[1],
	      x0 = p[0], y0 = p[1],
	      x1, y1,
	      inside = false;

	  for (var i = 0; i < n; ++i) {
	    p = polygon[i], x1 = p[0], y1 = p[1];
	    if (((y1 > y) !== (y0 > y)) && (x < (x0 - x1) * (y - y1) / (y0 - y1) + x1)) inside = !inside;
	    x0 = x1, y0 = y1;
	  }

	  return inside;
	};

	function length$1(polygon) {
	  var i = -1,
	      n = polygon.length,
	      b = polygon[n - 1],
	      xa,
	      ya,
	      xb = b[0],
	      yb = b[1],
	      perimeter = 0;

	  while (++i < n) {
	    xa = xb;
	    ya = yb;
	    b = polygon[i];
	    xb = b[0];
	    yb = b[1];
	    xa -= xb;
	    ya -= yb;
	    perimeter += Math.sqrt(xa * xa + ya * ya);
	  }

	  return perimeter;
	};

	var pi$1 = Math.PI;
	var tau$1 = 2 * pi$1;
	var epsilon = 1e-6;
	var tauEpsilon = tau$1 - epsilon;
	function Path() {
	  this._x0 = this._y0 = // start of current subpath
	  this._x1 = this._y1 = null; // end of current subpath
	  this._ = [];
	}

	function path() {
	  return new Path;
	}

	Path.prototype = path.prototype = {
	  moveTo: function(x, y) {
	    this._.push("M", this._x0 = this._x1 = +x, ",", this._y0 = this._y1 = +y);
	  },
	  closePath: function() {
	    if (this._x1 !== null) {
	      this._x1 = this._x0, this._y1 = this._y0;
	      this._.push("Z");
	    }
	  },
	  lineTo: function(x, y) {
	    this._.push("L", this._x1 = +x, ",", this._y1 = +y);
	  },
	  quadraticCurveTo: function(x1, y1, x, y) {
	    this._.push("Q", +x1, ",", +y1, ",", this._x1 = +x, ",", this._y1 = +y);
	  },
	  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
	    this._.push("C", +x1, ",", +y1, ",", +x2, ",", +y2, ",", this._x1 = +x, ",", this._y1 = +y);
	  },
	  arcTo: function(x1, y1, x2, y2, r) {
	    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
	    var x0 = this._x1,
	        y0 = this._y1,
	        x21 = x2 - x1,
	        y21 = y2 - y1,
	        x01 = x0 - x1,
	        y01 = y0 - y1,
	        l01_2 = x01 * x01 + y01 * y01;

	    // Is the radius negative? Error.
	    if (r < 0) throw new Error("negative radius: " + r);

	    // Is this path empty? Move to (x1,y1).
	    if (this._x1 === null) {
	      this._.push(
	        "M", this._x1 = x1, ",", this._y1 = y1
	      );
	    }

	    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
	    else if (!(l01_2 > epsilon));

	    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
	    // Equivalently, is (x1,y1) coincident with (x2,y2)?
	    // Or, is the radius zero? Line to (x1,y1).
	    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
	      this._.push(
	        "L", this._x1 = x1, ",", this._y1 = y1
	      );
	    }

	    // Otherwise, draw an arc!
	    else {
	      var x20 = x2 - x0,
	          y20 = y2 - y0,
	          l21_2 = x21 * x21 + y21 * y21,
	          l20_2 = x20 * x20 + y20 * y20,
	          l21 = Math.sqrt(l21_2),
	          l01 = Math.sqrt(l01_2),
	          l = r * Math.tan((pi$1 - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
	          t01 = l / l01,
	          t21 = l / l21;

	      // If the start tangent is not coincident with (x0,y0), line to.
	      if (Math.abs(t01 - 1) > epsilon) {
	        this._.push(
	          "L", x1 + t01 * x01, ",", y1 + t01 * y01
	        );
	      }

	      this._.push(
	        "A", r, ",", r, ",0,0,", +(y01 * x20 > x01 * y20), ",", this._x1 = x1 + t21 * x21, ",", this._y1 = y1 + t21 * y21
	      );
	    }
	  },
	  arc: function(x, y, r, a0, a1, ccw) {
	    x = +x, y = +y, r = +r;
	    var dx = r * Math.cos(a0),
	        dy = r * Math.sin(a0),
	        x0 = x + dx,
	        y0 = y + dy,
	        cw = 1 ^ ccw,
	        da = ccw ? a0 - a1 : a1 - a0;

	    // Is the radius negative? Error.
	    if (r < 0) throw new Error("negative radius: " + r);

	    // Is this path empty? Move to (x0,y0).
	    if (this._x1 === null) {
	      this._.push(
	        "M", x0, ",", y0
	      );
	    }

	    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
	    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
	      this._.push(
	        "L", x0, ",", y0
	      );
	    }

	    // Is this arc empty? We’re done.
	    if (!r) return;

	    // Is this a complete circle? Draw two arcs to complete the circle.
	    if (da > tauEpsilon) {
	      this._.push(
	        "A", r, ",", r, ",0,1,", cw, ",", x - dx, ",", y - dy,
	        "A", r, ",", r, ",0,1,", cw, ",", this._x1 = x0, ",", this._y1 = y0
	      );
	    }

	    // Otherwise, draw an arc!
	    else {
	      if (da < 0) da = da % tau$1 + tau$1;
	      this._.push(
	        "A", r, ",", r, ",0,", +(da >= pi$1), ",", cw, ",", this._x1 = x + r * Math.cos(a1), ",", this._y1 = y + r * Math.sin(a1)
	      );
	    }
	  },
	  rect: function(x, y, w, h) {
	    this._.push("M", this._x0 = this._x1 = +x, ",", this._y0 = this._y1 = +y, "h", +w, "v", +h, "h", -w, "Z");
	  },
	  toString: function() {
	    return this._.join("");
	  }
	};

	function pointX(p) {
	  return p[0];
	}

	function pointY(p) {
	  return p[1];
	}

	function functor(x) {
	  return function() {
	    return x;
	  };
	}

	function Node() {
	  this.x = null;
	  this.y = null;
	  this.leaf = true;
	  this.data = null;
	  this.nodes = [];
	}

	function visit(callback, node, x1, y1, x2, y2) {
	  if (!callback(node, x1, y1, x2, y2)) {
	    var sx = (x1 + x2) / 2,
	        sy = (y1 + y2) / 2,
	        children = node.nodes;
	    if (children[0]) visit(callback, children[0], x1, y1, sx, sy);
	    if (children[1]) visit(callback, children[1], sx, y1, x2, sy);
	    if (children[2]) visit(callback, children[2], x1, sy, sx, y2);
	    if (children[3]) visit(callback, children[3], sx, sy, x2, y2);
	  }
	}

	function find(root, x, y, x0, y0, x3, y3) {
	  var minDistance2 = Infinity,
	      closestNode;

	  (function findChild(node, x1, y1, x2, y2) {

	    // stop searching if this cell can’t contain a closer node
	    if (x1 > x3 || y1 > y3 || x2 < x0 || y2 < y0) return;

	    // visit this point
	    if (node.x != null) {
	      var dx = x - node.x,
	          dy = y - node.y,
	          distance2 = dx * dx + dy * dy;
	      if (distance2 < minDistance2) {
	        var distance = Math.sqrt(minDistance2 = distance2);
	        x0 = x - distance, y0 = y - distance;
	        x3 = x + distance, y3 = y + distance;
	        closestNode = node;
	      }
	    }

	    // bisect the current node
	    var children = node.nodes,
	        xm = (x1 + x2) / 2,
	        ym = (y1 + y2) / 2,
	        right = x >= xm,
	        below = y >= ym;

	    // visit closest cell first
	    for (var i = below << 1 | right, j = i + 4; i < j; ++i) {
	      if (node = children[i & 3]) switch (i & 3) {
	        case 0: findChild(node, x1, y1, xm, ym); break;
	        case 1: findChild(node, xm, y1, x2, ym); break;
	        case 2: findChild(node, x1, ym, xm, y2); break;
	        case 3: findChild(node, xm, ym, x2, y2); break;
	      }
	    }
	  })(root, x0, y0, x3, y3);

	  return closestNode && closestNode.data;
	}

	function quadtree() {
	  var x = pointX,
	      y = pointY,
	      x1,
	      x2,
	      y1,
	      y2;

	  function quadtree(data) {
	    var d,
	        fx = typeof x === "function" ? x : functor(x),
	        fy = typeof y === "function" ? y : functor(y),
	        xs,
	        ys,
	        i,
	        n,
	        x1_,
	        y1_,
	        x2_,
	        y2_;

	    if (!data) data = [];

	    if (x1 != null) {
	      x1_ = x1, y1_ = y1, x2_ = x2, y2_ = y2;
	    } else {
	      // Compute bounds, and cache points temporarily.
	      x2_ = y2_ = -(x1_ = y1_ = Infinity);
	      xs = [], ys = [];
	      n = data.length;
	      for (i = 0; i < n; ++i) {
	        var x_ = +fx(d = data[i], i, data),
	            y_ = +fy(d, i, data);
	        if (x_ < x1_) x1_ = x_;
	        if (y_ < y1_) y1_ = y_;
	        if (x_ > x2_) x2_ = x_;
	        if (y_ > y2_) y2_ = y_;
	        xs.push(x_);
	        ys.push(y_);
	      }
	    }

	    // Squarify the bounds.
	    var dx = x2_ - x1_,
	        dy = y2_ - y1_;
	    if (isFinite(dx) && isFinite(dy)) {
	      if (dx > dy) y2_ = y1_ + dx;
	      else x2_ = x1_ + dy;
	    }

	    // Recursively inserts the specified point at the node or one of its
	    // descendants. The bounds are defined by [x1, x2] and [y1, y2].
	    function insert(node, d, x, y, x1, y1, x2, y2) {
	      if (isNaN(x) || isNaN(y)) return; // ignore invalid points
	      if (node.leaf) {
	        var nx = node.x,
	            ny = node.y;
	        if (nx != null) {
	          // If the point at this leaf node is at the same position as the new
	          // point we are adding, we leave the point associated with the
	          // internal node while adding the new point to a child node. This
	          // avoids infinite recursion.
	          if ((Math.abs(nx - x) + Math.abs(ny - y)) < .01) {
	            insertChild(node, d, x, y, x1, y1, x2, y2);
	          } else {
	            var d0 = node.data;
	            node.x = node.y = node.data = null;
	            insertChild(node, d0, nx, ny, x1, y1, x2, y2);
	            insertChild(node, d, x, y, x1, y1, x2, y2);
	          }
	        } else {
	          node.x = x, node.y = y, node.data = d;
	        }
	      } else {
	        insertChild(node, d, x, y, x1, y1, x2, y2);
	      }
	    }

	    // Recursively inserts the specified point [x, y] into a descendant of node
	    // n. The bounds are defined by [x1, x2] and [y1, y2].
	    function insertChild(node, d, x, y, x1, y1, x2, y2) {
	      // Compute the split point, and the quadrant in which to insert the point.
	      var xm = (x1 + x2) / 2,
	          ym = (y1 + y2) / 2,
	          right = x >= xm,
	          below = y >= ym,
	          i = below << 1 | right;

	      // Recursively insert into the child node.
	      node.leaf = false;
	      node = node.nodes[i] || (node.nodes[i] = new Node);

	      // Update the bounds as we recurse.
	      if (right) x1 = xm; else x2 = xm;
	      if (below) y1 = ym; else y2 = ym;
	      insert(node, d, x, y, x1, y1, x2, y2);
	    }

	    var root = new Node;

	    root.add = function(d) {
	      insert(root, d, +fx(d, ++i), +fy(d, i), x1_, y1_, x2_, y2_);
	      return root;
	    };

	    root.visit = function(callback) {
	      visit(callback, root, x1_, y1_, x2_, y2_);
	      return root;
	    };

	    // Find the closest point to the specified point.
	    // TODO allow the initial search extent to be specified?
	    // TODO allow the initial minimum distance to be specified?
	    // TODO allow searching below any node?
	    root.find = function(x, y) {
	      return find(root, x, y, x1_, y1_, x2_, y2_);
	    };

	    // Insert all points.
	    i = -1;
	    if (x1 == null) {
	      while (++i < n) {
	        insert(root, data[i], xs[i], ys[i], x1_, y1_, x2_, y2_);
	      }
	      --i; // index of last insertion
	    } else {
	      data.forEach(root.add);
	    }

	    // Discard captured fields.
	    xs = ys = data = d = null;

	    return root;
	  }

	  quadtree.x = function(_) {
	    return arguments.length ? (x = _, quadtree) : x;
	  };

	  quadtree.y = function(_) {
	    return arguments.length ? (y = _, quadtree) : y;
	  };

	  quadtree.extent = function(_) {
	    if (!arguments.length) return x1 == null ? null : [[x1, y1], [x2, y2]];
	    if (_ == null) x1 = y1 = x2 = y2 = null;
	    else x1 = +_[0][0], y1 = +_[0][1], x2 = +_[1][0], y2 = +_[1][1];
	    return quadtree;
	  };

	  quadtree.size = function(_) {
	    if (!arguments.length) return x1 == null ? null : [x2 - x1, y2 - y1];
	    if (_ == null) x1 = y1 = x2 = y2 = null;
	    else x1 = y1 = 0, x2 = +_[0], y2 = +_[1];
	    return quadtree;
	  };

	  return quadtree;
	};

	function constant$1(x) {
	  return function constant() {
	    return x;
	  };
	};

	var epsilon$1 = 1e-12;
	var pi$2 = Math.PI;
	var halfPi$1 = pi$2 / 2;
	var tau$2 = 2 * pi$2;

	function arcInnerRadius(d) {
	  return d.innerRadius;
	}

	function arcOuterRadius(d) {
	  return d.outerRadius;
	}

	function arcStartAngle(d) {
	  return d.startAngle;
	}

	function arcEndAngle(d) {
	  return d.endAngle;
	}

	function arcPadAngle(d) {
	  return d && d.padAngle; // Note: optional!
	}

	function asin(x) {
	  return x >= 1 ? halfPi$1 : x <= -1 ? -halfPi$1 : Math.asin(x);
	}

	function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
	  var x10 = x1 - x0, y10 = y1 - y0,
	      x32 = x3 - x2, y32 = y3 - y2,
	      t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / (y32 * x10 - x32 * y10);
	  return [x0 + t * x10, y0 + t * y10];
	}

	// Compute perpendicular offset line of length rc.
	// http://mathworld.wolfram.com/Circle-LineIntersection.html
	function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
	  var x01 = x0 - x1,
	      y01 = y0 - y1,
	      lo = (cw ? rc : -rc) / Math.sqrt(x01 * x01 + y01 * y01),
	      ox = lo * y01,
	      oy = -lo * x01,
	      x11 = x0 + ox,
	      y11 = y0 + oy,
	      x10 = x1 + ox,
	      y10 = y1 + oy,
	      x00 = (x11 + x10) / 2,
	      y00 = (y11 + y10) / 2,
	      dx = x10 - x11,
	      dy = y10 - y11,
	      d2 = dx * dx + dy * dy,
	      r = r1 - rc,
	      D = x11 * y10 - x10 * y11,
	      d = (dy < 0 ? -1 : 1) * Math.sqrt(Math.max(0, r * r * d2 - D * D)),
	      cx0 = (D * dy - dx * d) / d2,
	      cy0 = (-D * dx - dy * d) / d2,
	      cx1 = (D * dy + dx * d) / d2,
	      cy1 = (-D * dx + dy * d) / d2,
	      dx0 = cx0 - x00,
	      dy0 = cy0 - y00,
	      dx1 = cx1 - x00,
	      dy1 = cy1 - y00;

	  // Pick the closer of the two intersection points.
	  // TODO Is there a faster way to determine which intersection to use?
	  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

	  return {
	    cx: cx0,
	    cy: cy0,
	    x01: -ox,
	    y01: -oy,
	    x11: cx0 * (r1 / r - 1),
	    y11: cy0 * (r1 / r - 1)
	  };
	}

	function arc() {
	  var innerRadius = arcInnerRadius,
	      outerRadius = arcOuterRadius,
	      cornerRadius = constant$1(0),
	      padRadius = null,
	      startAngle = arcStartAngle,
	      endAngle = arcEndAngle,
	      padAngle = arcPadAngle,
	      context = null,
	      output = null;

	  function arc() {
	    var buffer,
	        r,
	        r0 = +innerRadius.apply(this, arguments),
	        r1 = +outerRadius.apply(this, arguments),
	        a0 = startAngle.apply(this, arguments) - halfPi$1,
	        a1 = endAngle.apply(this, arguments) - halfPi$1,
	        da = Math.abs(a1 - a0),
	        cw = a1 > a0;

	    if (!context) context = buffer = path();

	    // Ensure that the outer radius is always larger than the inner radius.
	    if (r1 < r0) r = r1, r1 = r0, r0 = r;

	    // Is it a point?
	    if (!(r1 > epsilon$1)) context.moveTo(0, 0);

	    // Or is it a circle or annulus?
	    else if (da > tau$2 - epsilon$1) {
	      context.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
	      context.arc(0, 0, r1, a0, a1, !cw);
	      if (r0 > epsilon$1) {
	        context.moveTo(r0 * Math.cos(a1), r0 * Math.sin(a1));
	        context.arc(0, 0, r0, a1, a0, cw);
	      }
	    }

	    // Or is it a circular or annular sector?
	    else {
	      var a01 = a0,
	          a11 = a1,
	          a00 = a0,
	          a10 = a1,
	          da0 = da,
	          da1 = da,
	          ap = padAngle.apply(this, arguments) / 2,
	          rp = (ap > epsilon$1) && (padRadius ? +padRadius.apply(this, arguments) : Math.sqrt(r0 * r0 + r1 * r1)),
	          rc = Math.min(Math.abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
	          rc0 = rc,
	          rc1 = rc;

	      // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
	      if (rp > epsilon$1) {
	        var p0 = asin(rp / r0 * Math.sin(ap)),
	            p1 = asin(rp / r1 * Math.sin(ap));
	        if ((da0 -= p0 * 2) > epsilon$1) p0 *= (cw ? 1 : -1), a00 += p0, a10 -= p0;
	        else da0 = 0, a00 = a10 = (a0 + a1) / 2;
	        if ((da1 -= p1 * 2) > epsilon$1) p1 *= (cw ? 1 : -1), a01 += p1, a11 -= p1;
	        else da1 = 0, a01 = a11 = (a0 + a1) / 2;
	      }

	      var x01 = r1 * Math.cos(a01),
	          y01 = r1 * Math.sin(a01),
	          x10 = r0 * Math.cos(a10),
	          y10 = r0 * Math.sin(a10);

	      // Apply rounded corners?
	      if (rc > epsilon$1) {
	        var x11 = r1 * Math.cos(a11),
	            y11 = r1 * Math.sin(a11),
	            x00 = r0 * Math.cos(a00),
	            y00 = r0 * Math.sin(a00);

	        // Restrict the corner radius according to the sector angle.
	        if (da < pi$2) {
	          var oc = da0 > epsilon$1 ? intersect(x01, y01, x00, y00, x11, y11, x10, y10) : [x10, y10],
	              ax = x01 - oc[0],
	              ay = y01 - oc[1],
	              bx = x11 - oc[0],
	              by = y11 - oc[1],
	              kc = 1 / Math.sin(Math.acos((ax * bx + ay * by) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by))) / 2),
	              lc = Math.sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
	          rc0 = Math.min(rc, (r0 - lc) / (kc - 1));
	          rc1 = Math.min(rc, (r1 - lc) / (kc + 1));
	        }
	      }

	      // Is the sector collapsed to a line?
	      if (!(da1 > epsilon$1)) context.moveTo(x01, y01);

	      // Does the sector’s outer ring have rounded corners?
	      else if (rc1 > epsilon$1) {
	        var t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw),
	            t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

	        context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

	        // Have the corners merged?
	        if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

	        // Otherwise, draw the two corners and the ring.
	        else {
	          context.arc(t0.cx, t0.cy, rc1, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
	          context.arc(0, 0, r1, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
	          context.arc(t1.cx, t1.cy, rc1, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
	        }
	      }

	      // Or is the outer ring just a circular arc?
	      else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

	      // Is there no inner ring, and it’s a circular sector?
	      // Or perhaps it’s an annular sector collapsed due to padding?
	      if (!(r0 > epsilon$1) || !(da0 > epsilon$1)) context.lineTo(x10, y10);

	      // Does the sector’s inner ring (or point) have rounded corners?
	      else if (rc0 > epsilon$1) {
	        var t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw),
	            t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

	        context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

	        // Have the corners merged?
	        if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t1.y01, t1.x01), !cw);

	        // Otherwise, draw the two corners and the ring.
	        else {
	          context.arc(t0.cx, t0.cy, rc0, Math.atan2(t0.y01, t0.x01), Math.atan2(t0.y11, t0.x11), !cw);
	          context.arc(0, 0, r0, Math.atan2(t0.cy + t0.y11, t0.cx + t0.x11), Math.atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
	          context.arc(t1.cx, t1.cy, rc0, Math.atan2(t1.y11, t1.x11), Math.atan2(t1.y01, t1.x01), !cw);
	        }
	      }

	      // Or is the inner ring just a circular arc?
	      else context.arc(0, 0, r0, a10, a00, cw);
	    }

	    context.closePath();

	    if (buffer) return context = null, buffer + "" || null;
	  }

	  arc.centroid = function() {
	    var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
	        a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi$2 / 2;
	    return [Math.cos(a) * r, Math.sin(a) * r];
	  };

	  arc.innerRadius = function(_) {
	    return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant$1(+_), arc) : innerRadius;
	  };

	  arc.outerRadius = function(_) {
	    return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant$1(+_), arc) : outerRadius;
	  };

	  arc.cornerRadius = function(_) {
	    return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant$1(+_), arc) : cornerRadius;
	  };

	  arc.padRadius = function(_) {
	    return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant$1(+_), arc) : padRadius;
	  };

	  arc.startAngle = function(_) {
	    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$1(+_), arc) : startAngle;
	  };

	  arc.endAngle = function(_) {
	    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$1(+_), arc) : endAngle;
	  };

	  arc.padAngle = function(_) {
	    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$1(+_), arc) : padAngle;
	  };

	  arc.context = function(_) {
	    return arguments.length ? ((context = output = _ == null ? null : _), arc) : context;
	  };

	  return arc;
	};

	var slice$5 = Array.prototype.slice;

	function bind$1(curve, args) {
	  if (args.length < 2) return curve;
	  args = slice$5.call(args);
	  args[0] = null;
	  return function(context) {
	    args[0] = context;
	    return curve.apply(null, args);
	  };
	};

	function Linear(context) {
	  this._context = context;
	}

	Linear.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; // proceed
	      default: this._context.lineTo(x, y); break;
	    }
	  }
	};

	function curveLinear(context) {
	  return new Linear(context);
	};

	function x(p) {
	  return p[0];
	};

	function y(p) {
	  return p[1];
	};

	function area$1() {
	  var x0 = x,
	      x1 = null,
	      y0 = constant$1(0),
	      y1 = y,
	      defined = constant$1(true),
	      context = null,
	      curve = curveLinear,
	      output = null;

	  function area(data) {
	    var i,
	        j,
	        k,
	        n = data.length,
	        d,
	        defined0 = false,
	        buffer,
	        x0z = new Array(n),
	        y0z = new Array(n);

	    if (!context) output = curve(buffer = path());

	    for (i = 0; i <= n; ++i) {
	      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
	        if (defined0 = !defined0) {
	          j = i;
	          output.areaStart();
	          output.lineStart();
	        } else {
	          output.lineEnd();
	          output.lineStart();
	          for (k = i - 1; k >= j; --k) {
	            output.point(x0z[k], y0z[k]);
	          }
	          output.lineEnd();
	          output.areaEnd();
	        }
	      }
	      if (defined0) {
	        x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
	        output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
	      }
	    }

	    if (buffer) return output = null, buffer + "" || null;
	  }

	  area.x = function(_) {
	    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$1(+_), x1 = null, area) : x0;
	  };

	  area.x0 = function(_) {
	    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant$1(+_), area) : x0;
	  };

	  area.x1 = function(_) {
	    return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant$1(+_), area) : x1;
	  };

	  area.y = function(_) {
	    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$1(+_), y1 = null, area) : y0;
	  };

	  area.y0 = function(_) {
	    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant$1(+_), area) : y0;
	  };

	  area.y1 = function(_) {
	    return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant$1(+_), area) : y1;
	  };

	  area.defined = function(_) {
	    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$1(!!_), area) : defined;
	  };

	  area.curve = function(_) {
	    return arguments.length ? (curve = bind$1(_, arguments), context != null && (output = curve(context)), area) : curve;
	  };

	  area.context = function(_) {
	    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
	  };

	  return area;
	};

	function line() {
	  var x$$ = x,
	      y$$ = y,
	      defined = constant$1(true),
	      context = null,
	      curve = curveLinear,
	      output = null;

	  function line(data) {
	    var i,
	        n = data.length,
	        d,
	        defined0 = false,
	        buffer;

	    if (!context) output = curve(buffer = path());

	    for (i = 0; i <= n; ++i) {
	      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
	        if (defined0 = !defined0) output.lineStart();
	        else output.lineEnd();
	      }
	      if (defined0) output.point(+x$$(d, i, data), +y$$(d, i, data));
	    }

	    if (buffer) return output = null, buffer + "" || null;
	  }

	  line.x = function(_) {
	    return arguments.length ? (x$$ = typeof _ === "function" ? _ : constant$1(+_), line) : x$$;
	  };

	  line.y = function(_) {
	    return arguments.length ? (y$$ = typeof _ === "function" ? _ : constant$1(+_), line) : y$$;
	  };

	  line.defined = function(_) {
	    return arguments.length ? (defined = typeof _ === "function" ? _ : constant$1(!!_), line) : defined;
	  };

	  line.curve = function(_) {
	    return arguments.length ? (curve = bind$1(_, arguments), context != null && (output = curve(context)), line) : curve;
	  };

	  line.context = function(_) {
	    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
	  };

	  return line;
	};

	function descending$2(a, b) {
	  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
	};

	function identity$4(d) {
	  return d;
	};

	function pie() {
	  var value = identity$4,
	      sortValues = descending$2,
	      sort = null,
	      startAngle = constant$1(0),
	      endAngle = constant$1(tau$2),
	      padAngle = constant$1(0);

	  function pie(data) {
	    var n = data.length,
	        sum = 0,
	        index = new Array(n),
	        arcs = new Array(n),
	        a0 = +startAngle.apply(this, arguments),
	        da = Math.min(tau$2, Math.max(-tau$2, endAngle.apply(this, arguments) - a0)),
	        a1,
	        p = Math.min(Math.abs(da) / n, padAngle.apply(this, arguments)),
	        pa = p * (da < 0 ? -1 : 1);

	    for (var i = 0, v; i < n; ++i) {
	      if ((v = arcs[index[i] = i] = +value(data[i], i, data)) > 0) {
	        sum += v;
	      }
	    }

	    // Optionally sort the arcs by previously-computed values or by data.
	    if (sortValues != null) index.sort(function(i, j) { return sortValues(arcs[i], arcs[j]); });
	    else if (sort !== null) index.sort(function(i, j) { return sort(data[i], data[j]); });

	    // Compute the arcs! They are stored in the original data's order.
	    for (var i = 0, j, k = sum ? (da - n * pa) / sum : 0; i < n; ++i, a0 = a1) {
	      j = index[i], v = arcs[j], a1 = a0 + (v > 0 ? v * k : 0) + pa, arcs[j] = {
	        data: data[j],
	        index: i,
	        value: v,
	        startAngle: a0,
	        endAngle: a1,
	        padAngle: p
	      };
	    }

	    return arcs;
	  }

	  pie.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant$1(+_), pie) : value;
	  };

	  pie.sortValues = function(_) {
	    return arguments.length ? (sortValues = _, sort = null, pie) : sortValues;
	  };

	  pie.sort = function(_) {
	    return arguments.length ? (sort = _, sortValues = null, pie) : sort;
	  };

	  pie.startAngle = function(_) {
	    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$1(+_), pie) : startAngle;
	  };

	  pie.endAngle = function(_) {
	    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$1(+_), pie) : endAngle;
	  };

	  pie.padAngle = function(_) {
	    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$1(+_), pie) : padAngle;
	  };

	  return pie;
	};

	function Radial(curve) {
	  this._curve = curve;
	}

	Radial.prototype = {
	  areaStart: function() {
	    this._curve.areaStart();
	  },
	  areaEnd: function() {
	    this._curve.areaEnd();
	  },
	  lineStart: function() {
	    this._curve.lineStart();
	  },
	  lineEnd: function() {
	    this._curve.lineEnd();
	  },
	  point: function(a, r) {
	    a -= halfPi$1, this._curve.point(r * Math.cos(a), r * Math.sin(a));
	  }
	};

	function curveRadial(curve, args) {
	  curve = bind$1(curve, args);

	  function radial(context) {
	    return new Radial(curve(context));
	  }

	  radial._curve = curve;

	  return radial;
	};

	function radialArea() {
	  var a = area$1(),
	      c = a.curve;

	  a.angle = a.x, delete a.x;
	  a.startAngle = a.x0, delete a.x0;
	  a.endAngle = a.x1, delete a.x1;
	  a.radius = a.y, delete a.y;
	  a.innerRadius = a.y0, delete a.y0;
	  a.outerRadius = a.y1, delete a.y1;

	  a.curve = function(_) {
	    return arguments.length ? c(curveRadial(_, arguments)) : c()._curve;
	  };

	  return a.curve(curveLinear);
	};

	function radialLine() {
	  var l = line(),
	      c = l.curve;

	  l.angle = l.x, delete l.x;
	  l.radius = l.y, delete l.y;

	  l.curve = function(_) {
	    return arguments.length ? c(curveRadial(_, arguments)) : c()._curve;
	  };

	  return l.curve(curveLinear);
	};

	var circle = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size / pi$2);
	    context.moveTo(r, 0);
	    context.arc(0, 0, r, 0, tau$2);
	  }
	};

	var cross = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size / 5) / 2;
	    context.moveTo(-3 * r, -r);
	    context.lineTo(-r, -r);
	    context.lineTo(-r, -3 * r);
	    context.lineTo(r, -3 * r);
	    context.lineTo(r, -r);
	    context.lineTo(3 * r, -r);
	    context.lineTo(3 * r, r);
	    context.lineTo(r, r);
	    context.lineTo(r, 3 * r);
	    context.lineTo(-r, 3 * r);
	    context.lineTo(-r, r);
	    context.lineTo(-3 * r, r);
	    context.closePath();
	  }
	};

	var tan30 = Math.sqrt(1 / 3);
	var tan30_2 = tan30 * 2;
	var diamond = {
	  draw: function(context, size) {
	    var y = Math.sqrt(size / tan30_2),
	        x = y * tan30;
	    context.moveTo(0, -y);
	    context.lineTo(x, 0);
	    context.lineTo(0, y);
	    context.lineTo(-x, 0);
	    context.closePath();
	  }
	};

	var ka = 0.89081309152928522810;
	var kr = Math.sin(pi$2 / 10) / Math.sin(7 * pi$2 / 10);
	var kx = Math.sin(tau$2 / 10) * kr;
	var ky = -Math.cos(tau$2 / 10) * kr;
	var star = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size * ka),
	        x = kx * r,
	        y = ky * r;
	    context.moveTo(0, -r);
	    context.lineTo(x, y);
	    for (var i = 1; i < 5; ++i) {
	      var a = tau$2 * i / 5,
	          c = Math.cos(a),
	          s = Math.sin(a);
	      context.lineTo(s * r, -c * r);
	      context.lineTo(c * x - s * y, s * x + c * y);
	    }
	    context.closePath();
	  }
	};

	var square = {
	  draw: function(context, size) {
	    var w = Math.sqrt(size),
	        x = -w / 2;
	    context.rect(x, x, w, w);
	  }
	};

	var sqrt3 = Math.sqrt(3);

	var triangle = {
	  draw: function(context, size) {
	    var y = -Math.sqrt(size / (sqrt3 * 3));
	    context.moveTo(0, y * 2);
	    context.lineTo(-sqrt3 * y, -y);
	    context.lineTo(sqrt3 * y, -y);
	    context.closePath();
	  }
	};

	var c$1 = -0.5;
	var s = Math.sqrt(3) / 2;
	var k = 1 / Math.sqrt(12);
	var a$1 = (k / 2 + 1) * 3;
	var wye = {
	  draw: function(context, size) {
	    var r = Math.sqrt(size / a$1),
	        x0 = r / 2,
	        y0 = r * k,
	        x1 = x0,
	        y1 = r * k + r,
	        x2 = -x1,
	        y2 = y1;
	    context.moveTo(x0, y0);
	    context.lineTo(x1, y1);
	    context.lineTo(x2, y2);
	    context.lineTo(c$1 * x0 - s * y0, s * x0 + c$1 * y0);
	    context.lineTo(c$1 * x1 - s * y1, s * x1 + c$1 * y1);
	    context.lineTo(c$1 * x2 - s * y2, s * x2 + c$1 * y2);
	    context.lineTo(c$1 * x0 + s * y0, c$1 * y0 - s * x0);
	    context.lineTo(c$1 * x1 + s * y1, c$1 * y1 - s * x1);
	    context.lineTo(c$1 * x2 + s * y2, c$1 * y2 - s * x2);
	    context.closePath();
	  }
	};

	var symbols = [
	  circle,
	  cross,
	  diamond,
	  square,
	  star,
	  triangle,
	  wye
	];

	function symbol() {
	  var type = constant$1(circle),
	      size = constant$1(64),
	      context = null;

	  function symbol() {
	    var buffer;
	    if (!context) context = buffer = path();
	    type.apply(this, arguments).draw(context, +size.apply(this, arguments));
	    if (buffer) return context = null, buffer + "" || null;
	  }

	  symbol.type = function(_) {
	    return arguments.length ? (type = typeof _ === "function" ? _ : constant$1(_), symbol) : type;
	  };

	  symbol.size = function(_) {
	    return arguments.length ? (size = typeof _ === "function" ? _ : constant$1(+_), symbol) : size;
	  };

	  symbol.context = function(_) {
	    return arguments.length ? (context = _ == null ? null : _, symbol) : context;
	  };

	  return symbol;
	};

	function noop() {};

	function point$1(that, x, y) {
	  that._context.bezierCurveTo(
	    (2 * that._x0 + that._x1) / 3,
	    (2 * that._y0 + that._y1) / 3,
	    (that._x0 + 2 * that._x1) / 3,
	    (that._y0 + 2 * that._y1) / 3,
	    (that._x0 + 4 * that._x1 + x) / 6,
	    (that._y0 + 4 * that._y1 + y) / 6
	  );
	};

	function Basis(context) {
	  this._context = context;
	}

	Basis.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 =
	    this._y0 = this._y1 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 3: point$1(this, this._x1, this._y1); // proceed
	      case 2: this._context.lineTo(this._x1, this._y1); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6); // proceed
	      default: point$1(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	  }
	};

	function basis(context) {
	  return new Basis(context);
	};

	function BasisClosed(context) {
	  this._context = context;
	}

	BasisClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 =
	    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 1: {
	        this._context.moveTo(this._x2, this._y2);
	        this._context.closePath();
	        break;
	      }
	      case 2: {
	        this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3);
	        this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3);
	        this._context.closePath();
	        break;
	      }
	      case 3: {
	        this.point(this._x2, this._y2);
	        this.point(this._x3, this._y3);
	        this.point(this._x4, this._y4);
	        break;
	      }
	    }
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._x2 = x, this._y2 = y; break;
	      case 1: this._point = 2; this._x3 = x, this._y3 = y; break;
	      case 2: this._point = 3; this._x4 = x, this._y4 = y; this._context.moveTo((this._x0 + 4 * this._x1 + x) / 6, (this._y0 + 4 * this._y1 + y) / 6); break;
	      default: point$1(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	  }
	};

	function basisClosed(context) {
	  return new BasisClosed(context);
	};

	function BasisOpen(context) {
	  this._context = context;
	}

	BasisOpen.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 =
	    this._y0 = this._y1 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; var x0 = (this._x0 + 4 * this._x1 + x) / 6, y0 = (this._y0 + 4 * this._y1 + y) / 6; this._line ? this._context.lineTo(x0, y0) : this._context.moveTo(x0, y0); break;
	      case 3: this._point = 4; // proceed
	      default: point$1(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	  }
	};

	function basisOpen(context) {
	  return new BasisOpen(context);
	};

	function Bundle(context, beta) {
	  this._basis = basis(context);
	  this._beta = beta;
	}

	Bundle.prototype = {
	  lineStart: function() {
	    this._x = [];
	    this._y = [];
	    this._basis.lineStart();
	  },
	  lineEnd: function() {
	    var x = this._x,
	        y = this._y,
	        j = x.length - 1;

	    if (j > 0) {
	      var x0 = x[0],
	          y0 = y[0],
	          dx = x[j] - x0,
	          dy = y[j] - y0,
	          i = -1,
	          t;

	      while (++i <= j) {
	        t = i / j;
	        this._basis.point(
	          this._beta * x[i] + (1 - this._beta) * (x0 + t * dx),
	          this._beta * y[i] + (1 - this._beta) * (y0 + t * dy)
	        );
	      }
	    }

	    this._x = this._y = null;
	    this._basis.lineEnd();
	  },
	  point: function(x, y) {
	    this._x.push(+x);
	    this._y.push(+y);
	  }
	};

	function bundle(context, beta) {
	  return beta == null ? new Bundle(context, 0.85)
	      : (beta = +beta) === 1 ? basis(context)
	      : new Bundle(context, beta);
	};

	function point$2(that, x, y) {
	  that._context.bezierCurveTo(
	    that._x1 + that._k * (that._x2 - that._x0),
	    that._y1 + that._k * (that._y2 - that._y0),
	    that._x2 + that._k * (that._x1 - x),
	    that._y2 + that._k * (that._y1 - y),
	    that._x2,
	    that._y2
	  );
	};

	function Cardinal(context, k) {
	  this._context = context;
	  this._k = k;
	}

	Cardinal.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 2: this._context.lineTo(this._x2, this._y2); break;
	      case 3: point$2(this, this._x1, this._y1); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; this._x1 = x, this._y1 = y; break;
	      case 2: this._point = 3; // proceed
	      default: point$2(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	function cardinal(context, tension) {
	  return new Cardinal(context, (tension == null ? 1 : 1 - tension) / 6);
	};

	function CardinalClosed(context, k) {
	  this._context = context;
	  this._k = k;
	}

	CardinalClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
	    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 1: {
	        this._context.moveTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 2: {
	        this._context.lineTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 3: {
	        this.point(this._x3, this._y3);
	        this.point(this._x4, this._y4);
	        this.point(this._x5, this._y5);
	        break;
	      }
	    }
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
	      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
	      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
	      default: point$2(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	function cardinalClosed(context, tension) {
	  return new CardinalClosed(context, (tension == null ? 1 : 1 - tension) / 6);
	};

	function CardinalOpen(context, k) {
	  this._context = context;
	  this._k = k;
	}

	CardinalOpen.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
	      case 3: this._point = 4; // proceed
	      default: point$2(this, x, y); break;
	    }
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	function cardinalOpen(context, tension) {
	  return new CardinalOpen(context, (tension == null ? 1 : 1 - tension) / 6);
	};

	function point$3(that, x, y) {
	  var x1 = that._x1,
	      y1 = that._y1,
	      x2 = that._x2,
	      y2 = that._y2;

	  if (that._l01_a > epsilon$1) {
	    var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a,
	        n = 3 * that._l01_a * (that._l01_a + that._l12_a);
	    x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
	    y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
	  }

	  if (that._l23_a > epsilon$1) {
	    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a,
	        m = 3 * that._l23_a * (that._l23_a + that._l12_a);
	    x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
	    y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
	  }

	  that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
	};

	function CatmullRom(context, alpha) {
	  this._context = context;
	  this._alpha = alpha;
	}

	CatmullRom.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._l01_a = this._l12_a = this._l23_a =
	    this._l01_2a = this._l12_2a = this._l23_2a =
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 2: this._context.lineTo(this._x2, this._y2); break;
	      case 3: this.point(this, this._x2, this._y2); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;

	    if (this._point) {
	      var x23 = this._x2 - x,
	          y23 = this._y2 - y;
	      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
	    }

	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; // proceed
	      default: point$3(this, x, y); break;
	    }

	    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
	    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	function catmullRom(context, alpha) {
	  return (alpha = alpha == null ? 0.5 : +alpha)
	      ? new CatmullRom(context, alpha)
	      : cardinal(context, 0);
	};

	function CatmullRomClosed(context, alpha) {
	  this._context = context;
	  this._alpha = alpha;
	}

	CatmullRomClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 =
	    this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
	    this._l01_a = this._l12_a = this._l23_a =
	    this._l01_2a = this._l12_2a = this._l23_2a =
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 1: {
	        this._context.moveTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 2: {
	        this._context.lineTo(this._x3, this._y3);
	        this._context.closePath();
	        break;
	      }
	      case 3: {
	        this.point(this._x3, this._y3);
	        this.point(this._x4, this._y4);
	        this.point(this._x5, this._y5);
	        break;
	      }
	    }
	  },
	  point: function(x, y) {
	    x = +x, y = +y;

	    if (this._point) {
	      var x23 = this._x2 - x,
	          y23 = this._y2 - y;
	      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
	    }

	    switch (this._point) {
	      case 0: this._point = 1; this._x3 = x, this._y3 = y; break;
	      case 1: this._point = 2; this._context.moveTo(this._x4 = x, this._y4 = y); break;
	      case 2: this._point = 3; this._x5 = x, this._y5 = y; break;
	      default: point$3(this, x, y); break;
	    }

	    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
	    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	function catmullRomClosed(context, alpha) {
	  return (alpha = alpha == null ? 0.5 : +alpha)
	      ? new CatmullRomClosed(context, alpha)
	      : cardinalClosed(context, 0);
	};

	function CatmullRomOpen(context, alpha) {
	  this._context = context;
	  this._alpha = alpha;
	}

	CatmullRomOpen.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 = this._x2 =
	    this._y0 = this._y1 = this._y2 = NaN;
	    this._l01_a = this._l12_a = this._l23_a =
	    this._l01_2a = this._l12_2a = this._l23_2a =
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._line || (this._line !== 0 && this._point === 3)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;

	    if (this._point) {
	      var x23 = this._x2 - x,
	          y23 = this._y2 - y;
	      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
	    }

	    switch (this._point) {
	      case 0: this._point = 1; break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2); break;
	      case 3: this._point = 4; // proceed
	      default: point$3(this, x, y); break;
	    }

	    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
	    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
	    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
	    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
	  }
	};

	function catmullRomOpen(context, alpha) {
	  return (alpha = alpha == null ? 0.5 : +alpha)
	      ? new CatmullRomOpen(context, alpha)
	      : cardinalOpen(context, 0);
	};

	function LinearClosed(context) {
	  this._context = context;
	}

	LinearClosed.prototype = {
	  areaStart: noop,
	  areaEnd: noop,
	  lineStart: function() {
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (this._point) this._context.closePath();
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    if (this._point) this._context.lineTo(x, y);
	    else this._point = 1, this._context.moveTo(x, y);
	  }
	};

	function linearClosed(context) {
	  return new LinearClosed(context);
	};

	function sign(x) {
	  return x < 0 ? -1 : 1;
	}

	// Calculate the slopes of the tangents (Hermite-type interpolation) based on
	// the following paper: Steffen, M. 1990. A Simple Method for Monotonic
	// Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
	// NOV(II), P. 443, 1990.
	function slope3(that, x2, y2) {
	  var h0 = that._x1 - that._x0,
	      h1 = x2 - that._x1,
	      s0 = (that._y1 - that._y0) / h0,
	      s1 = (y2 - that._y1) / h1,
	      p = (s0 * h1 + s1 * h0) / (h0 + h1);
	  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
	}

	// Calculate a one-sided slope.
	function slope2(that, t) {
	  var h = that._x1 - that._x0;
	  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
	}

	// According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
	// "you can express cubic Hermite interpolation in terms of cubic Bézier curves
	// with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
	function point$4(that, t0, t1) {
	  var x0 = that._x0,
	      y0 = that._y0,
	      x1 = that._x1,
	      y1 = that._y1,
	      dx = (x1 - x0) / 3;
	  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
	}

	function Monotone(context) {
	  this._context = context;
	}

	Monotone.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x0 = this._x1 =
	    this._y0 = this._y1 =
	    this._t0 = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    switch (this._point) {
	      case 2: this._context.lineTo(this._x1, this._y1); break;
	      case 3: point$4(this, this._t0, slope2(this, this._t0)); break;
	    }
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    var t1 = NaN;

	    x = +x, y = +y;
	    if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; break;
	      case 2: this._point = 3; point$4(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
	      default: point$4(this, this._t0, t1 = slope3(this, x, y)); break;
	    }

	    this._x0 = this._x1, this._x1 = x;
	    this._y0 = this._y1, this._y1 = y;
	    this._t0 = t1;
	  }
	}

	function monotone(context) {
	  return new Monotone(context);
	};

	function Natural(context) {
	  this._context = context;
	}

	Natural.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x = [];
	    this._y = [];
	  },
	  lineEnd: function() {
	    var x = this._x,
	        y = this._y,
	        n = x.length;

	    if (n) {
	      this._line ? this._context.lineTo(x[0], y[0]) : this._context.moveTo(x[0], y[0]);
	      if (n === 2) {
	        this._context.lineTo(x[1], y[1]);
	      } else {
	        var px = controlPoints(x),
	            py = controlPoints(y);
	        for (var i0 = 0, i1 = 1; i1 < n; ++i0, ++i1) {
	          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x[i1], y[i1]);
	        }
	      }
	    }

	    if (this._line || (this._line !== 0 && n === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	    this._x = this._y = null;
	  },
	  point: function(x, y) {
	    this._x.push(+x);
	    this._y.push(+y);
	  }
	};

	// See https://www.particleincell.com/2012/bezier-splines/ for derivation.
	function controlPoints(x) {
	  var i,
	      n = x.length - 1,
	      m,
	      a = new Array(n),
	      b = new Array(n),
	      r = new Array(n);
	  a[0] = 0, b[0] = 2, r[0] = x[0] + 2 * x[1];
	  for (i = 1; i < n - 1; ++i) a[i] = 1, b[i] = 4, r[i] = 4 * x[i] + 2 * x[i + 1];
	  a[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x[n - 1] + x[n];
	  for (i = 1; i < n; ++i) m = a[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
	  a[n - 1] = r[n - 1] / b[n - 1];
	  for (i = n - 2; i >= 0; --i) a[i] = (r[i] - a[i + 1]) / b[i];
	  b[n - 1] = (x[n] + a[n - 1]) / 2;
	  for (i = 0; i < n - 1; ++i) b[i] = 2 * x[i + 1] - a[i + 1];
	  return [a, b];
	}

	function natural(context) {
	  return new Natural(context);
	};

	function Step(context, t) {
	  this._context = context;
	  this._t = t;
	}

	Step.prototype = {
	  areaStart: function() {
	    this._line = 0;
	  },
	  areaEnd: function() {
	    this._line = NaN;
	  },
	  lineStart: function() {
	    this._x = this._y = NaN;
	    this._point = 0;
	  },
	  lineEnd: function() {
	    if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
	    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
	    this._line = 1 - this._line;
	  },
	  point: function(x, y) {
	    x = +x, y = +y;
	    switch (this._point) {
	      case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
	      case 1: this._point = 2; // proceed
	      default: {
	        var t = x > this._x ? this._t : 1 - this._t;
	        if (t <= 0) {
	          this._context.lineTo(this._x, y);
	          this._context.lineTo(x, y);
	        } else if (t >= 1) {
	          this._context.lineTo(x, this._y);
	          this._context.lineTo(x, y);
	        } else {
	          var x1 = (this._x + x) * t;
	          this._context.lineTo(x1, this._y);
	          this._context.lineTo(x1, y);
	        }
	        break;
	      }
	    }
	    this._x = x, this._y = y;
	  }
	};

	function step(context) {
	  return new Step(context, 0.5);
	};

	function stepBefore(context) {
	  return new Step(context, 0);
	};

	function stepAfter(context) {
	  return new Step(context, 1);
	};

	var slice$2 = Array.prototype.slice;

	function none(series, order) {
	  if (!((n = series.length) > 1)) return;
	  for (var i = 1, s0, s1 = series[order[0]], n, m = s1.length; i < n; ++i) {
	    s0 = s1, s1 = series[order[i]];
	    for (var j = 0; j < m; ++j) {
	      s1[j][1] += s1[j][0] = isNaN(s0[j][1]) ? s0[j][0] : s0[j][1];
	    }
	  }
	};

	function none$1(series) {
	  var n = series.length, o = new Array(n);
	  while (--n >= 0) o[n] = n;
	  return o;
	};

	function stackValue(d, key) {
	  return d[key];
	}

	function stack() {
	  var keys = constant$1([]),
	      order = none$1,
	      offset = none,
	      value = stackValue;

	  function stack(data) {
	    var kz = keys.apply(this, arguments),
	        m = data.length,
	        n = kz.length,
	        sz = new Array(n);

	    for (var i = 0; i < n; ++i) {
	      for (var ki = kz[i], si = sz[i] = new Array(m), j = 0, sij; j < m; ++j) {
	        si[j] = sij = [0, +value(data[j], ki, j, data)];
	        sij.data = data[j];
	      }
	      si.key = ki;
	    }

	    for (var i = 0, oz = order(sz); i < n; ++i) {
	      sz[oz[i]].index = i;
	    }

	    offset(sz, oz);
	    return sz;
	  }

	  stack.keys = function(_) {
	    return arguments.length ? (keys = typeof _ === "function" ? _ : constant$1(slice$2.call(_)), stack) : keys;
	  };

	  stack.value = function(_) {
	    return arguments.length ? (value = typeof _ === "function" ? _ : constant$1(+_), stack) : value;
	  };

	  stack.order = function(_) {
	    return arguments.length ? (order = _ == null ? orderDefault : typeof _ === "function" ? _ : constant$1(slice$2.call(_)), stack) : order;
	  };

	  stack.offset = function(_) {
	    return arguments.length ? (offset = _ == null ? offsetZero : _, stack) : offset;
	  };

	  return stack;
	};

	function expand(series, order) {
	  if (!((n = series.length) > 0)) return;
	  for (var j = 0, n, m = series[0].length; j < m; ++j) {
	    for (var i = 0, y = 0; i < n; ++i) y += series[i][j][1] || 0;
	    if (y) for (var i = 0; i < n; ++i) series[i][j][1] /= y;
	  }
	  none(series, order);
	};

	function silhouette(series, order) {
	  if (!((n = series.length) > 0)) return;
	  for (var j = 0, s0 = series[order[0]], n, m = s0.length; j < m; ++j) {
	    for (var i = 0, y = 0; i < n; ++i) y += series[i][j][1] || 0;
	    s0[j][1] += s0[j][0] = -y / 2;
	  }
	  none(series, order);
	};

	function wiggle(series, order) {
	  if (!((n = series.length) > 0) || !((m = (s0 = series[order[0]]).length) > 0)) return;
	  for (var y = 0, j = 1, s0, m, n; j < m; ++j) {
	    for (var i = 0, s1 = 0, s2 = 0; i < n; ++i) {
	      var si = series[order[i]],
	          sij0 = si[j][1] || 0,
	          sij1 = si[j - 1][1] || 0,
	          s3 = (sij0 - sij1) / 2;
	      for (var k = 0; k < i; ++k) {
	        var sk = series[order[k]],
	            skj0 = sk[j][1] || 0,
	            skj1 = sk[j - 1][1] || 0;
	        s3 += skj0 - skj1;
	      }
	      s1 += sij0, s2 += s3 * sij0;
	    }
	    s0[j - 1][1] += s0[j - 1][0] = y;
	    if (s1) y -= s2 / s1;
	  }
	  s0[j - 1][1] += s0[j - 1][0] = y;
	  none(series, order);
	};

	function ascending$1(series) {
	  var sums = series.map(sum$1);
	  return none$1(series).sort(function(a, b) { return sums[a] - sums[b]; });
	};

	function sum$1(series) {
	  var s = 0, i = -1, n = series.length, v;
	  while (++i < n) if (v = +series[i][1]) s += v;
	  return s;
	};

	function descending$1(series) {
	  return ascending$1(series).reverse();
	};

	function insideOut(series) {
	  var n = series.length,
	      i,
	      j,
	      sums = series.map(sum$1),
	      order = none$1(series).sort(function(a, b) { return sums[b] - sums[a]; }),
	      top = 0,
	      bottom = 0,
	      tops = [],
	      bottoms = [];

	  for (i = 0; i < n; ++i) {
	    j = order[i];
	    if (top < bottom) {
	      top += sums[j];
	      tops.push(j);
	    } else {
	      bottom += sums[j];
	      bottoms.push(j);
	    }
	  }

	  return bottoms.reverse().concat(tops);
	};

	function reverse(series) {
	  return none$1(series).reverse();
	};

	function Color() {};

	var darker = 0.7;
	var brighter = 1 / darker;

	var reHex3 = /^#([0-9a-f]{3})$/;
	var reHex6 = /^#([0-9a-f]{6})$/;
	var reRgbInteger = /^rgb\(\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*,\s*([-+]?\d+)\s*\)$/;
	var reRgbPercent = /^rgb\(\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
	var reHslPercent = /^hsl\(\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*,\s*([-+]?\d+(?:\.\d+)?)%\s*\)$/;
	var named = {
	  aliceblue: 0xf0f8ff,
	  antiquewhite: 0xfaebd7,
	  aqua: 0x00ffff,
	  aquamarine: 0x7fffd4,
	  azure: 0xf0ffff,
	  beige: 0xf5f5dc,
	  bisque: 0xffe4c4,
	  black: 0x000000,
	  blanchedalmond: 0xffebcd,
	  blue: 0x0000ff,
	  blueviolet: 0x8a2be2,
	  brown: 0xa52a2a,
	  burlywood: 0xdeb887,
	  cadetblue: 0x5f9ea0,
	  chartreuse: 0x7fff00,
	  chocolate: 0xd2691e,
	  coral: 0xff7f50,
	  cornflowerblue: 0x6495ed,
	  cornsilk: 0xfff8dc,
	  crimson: 0xdc143c,
	  cyan: 0x00ffff,
	  darkblue: 0x00008b,
	  darkcyan: 0x008b8b,
	  darkgoldenrod: 0xb8860b,
	  darkgray: 0xa9a9a9,
	  darkgreen: 0x006400,
	  darkgrey: 0xa9a9a9,
	  darkkhaki: 0xbdb76b,
	  darkmagenta: 0x8b008b,
	  darkolivegreen: 0x556b2f,
	  darkorange: 0xff8c00,
	  darkorchid: 0x9932cc,
	  darkred: 0x8b0000,
	  darksalmon: 0xe9967a,
	  darkseagreen: 0x8fbc8f,
	  darkslateblue: 0x483d8b,
	  darkslategray: 0x2f4f4f,
	  darkslategrey: 0x2f4f4f,
	  darkturquoise: 0x00ced1,
	  darkviolet: 0x9400d3,
	  deeppink: 0xff1493,
	  deepskyblue: 0x00bfff,
	  dimgray: 0x696969,
	  dimgrey: 0x696969,
	  dodgerblue: 0x1e90ff,
	  firebrick: 0xb22222,
	  floralwhite: 0xfffaf0,
	  forestgreen: 0x228b22,
	  fuchsia: 0xff00ff,
	  gainsboro: 0xdcdcdc,
	  ghostwhite: 0xf8f8ff,
	  gold: 0xffd700,
	  goldenrod: 0xdaa520,
	  gray: 0x808080,
	  green: 0x008000,
	  greenyellow: 0xadff2f,
	  grey: 0x808080,
	  honeydew: 0xf0fff0,
	  hotpink: 0xff69b4,
	  indianred: 0xcd5c5c,
	  indigo: 0x4b0082,
	  ivory: 0xfffff0,
	  khaki: 0xf0e68c,
	  lavender: 0xe6e6fa,
	  lavenderblush: 0xfff0f5,
	  lawngreen: 0x7cfc00,
	  lemonchiffon: 0xfffacd,
	  lightblue: 0xadd8e6,
	  lightcoral: 0xf08080,
	  lightcyan: 0xe0ffff,
	  lightgoldenrodyellow: 0xfafad2,
	  lightgray: 0xd3d3d3,
	  lightgreen: 0x90ee90,
	  lightgrey: 0xd3d3d3,
	  lightpink: 0xffb6c1,
	  lightsalmon: 0xffa07a,
	  lightseagreen: 0x20b2aa,
	  lightskyblue: 0x87cefa,
	  lightslategray: 0x778899,
	  lightslategrey: 0x778899,
	  lightsteelblue: 0xb0c4de,
	  lightyellow: 0xffffe0,
	  lime: 0x00ff00,
	  limegreen: 0x32cd32,
	  linen: 0xfaf0e6,
	  magenta: 0xff00ff,
	  maroon: 0x800000,
	  mediumaquamarine: 0x66cdaa,
	  mediumblue: 0x0000cd,
	  mediumorchid: 0xba55d3,
	  mediumpurple: 0x9370db,
	  mediumseagreen: 0x3cb371,
	  mediumslateblue: 0x7b68ee,
	  mediumspringgreen: 0x00fa9a,
	  mediumturquoise: 0x48d1cc,
	  mediumvioletred: 0xc71585,
	  midnightblue: 0x191970,
	  mintcream: 0xf5fffa,
	  mistyrose: 0xffe4e1,
	  moccasin: 0xffe4b5,
	  navajowhite: 0xffdead,
	  navy: 0x000080,
	  oldlace: 0xfdf5e6,
	  olive: 0x808000,
	  olivedrab: 0x6b8e23,
	  orange: 0xffa500,
	  orangered: 0xff4500,
	  orchid: 0xda70d6,
	  palegoldenrod: 0xeee8aa,
	  palegreen: 0x98fb98,
	  paleturquoise: 0xafeeee,
	  palevioletred: 0xdb7093,
	  papayawhip: 0xffefd5,
	  peachpuff: 0xffdab9,
	  peru: 0xcd853f,
	  pink: 0xffc0cb,
	  plum: 0xdda0dd,
	  powderblue: 0xb0e0e6,
	  purple: 0x800080,
	  rebeccapurple: 0x663399,
	  red: 0xff0000,
	  rosybrown: 0xbc8f8f,
	  royalblue: 0x4169e1,
	  saddlebrown: 0x8b4513,
	  salmon: 0xfa8072,
	  sandybrown: 0xf4a460,
	  seagreen: 0x2e8b57,
	  seashell: 0xfff5ee,
	  sienna: 0xa0522d,
	  silver: 0xc0c0c0,
	  skyblue: 0x87ceeb,
	  slateblue: 0x6a5acd,
	  slategray: 0x708090,
	  slategrey: 0x708090,
	  snow: 0xfffafa,
	  springgreen: 0x00ff7f,
	  steelblue: 0x4682b4,
	  tan: 0xd2b48c,
	  teal: 0x008080,
	  thistle: 0xd8bfd8,
	  tomato: 0xff6347,
	  turquoise: 0x40e0d0,
	  violet: 0xee82ee,
	  wheat: 0xf5deb3,
	  white: 0xffffff,
	  whitesmoke: 0xf5f5f5,
	  yellow: 0xffff00,
	  yellowgreen: 0x9acd32
	};

	color.prototype = Color.prototype = {
	  displayable: function() {
	    return this.rgb().displayable();
	  },
	  toString: function() {
	    return this.rgb() + "";
	  }
	};

	function color(format) {
	  var m;
	  format = (format + "").trim().toLowerCase();
	  return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf))) // #f00
	      : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
	      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3]) // rgb(255,0,0)
	      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100) // rgb(100%,0%,0%)
	      : (m = reHslPercent.exec(format)) ? new Hsl(m[1], m[2] / 100, m[3] / 100) // hsl(120,50%,50%)
	      : named.hasOwnProperty(format) ? rgbn(named[format])
	      : null;
	};

	function rgbn(n) {
	  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff);
	}

	function rgb(r, g, b) {
	  if (arguments.length === 1) {
	    if (!(r instanceof Color)) r = color(r);
	    if (r) {
	      r = r.rgb();
	      b = r.b;
	      g = r.g;
	      r = r.r;
	    } else {
	      r = g = b = NaN;
	    }
	  }
	  return new Rgb(r, g, b);
	};

	function Rgb(r, g, b) {
	  this.r = +r;
	  this.g = +g;
	  this.b = +b;
	};

	var _rgb = rgb.prototype = Rgb.prototype = new Color;

	_rgb.brighter = function(k) {
	  k = k == null ? brighter : Math.pow(brighter, k);
	  return new Rgb(this.r * k, this.g * k, this.b * k);
	};

	_rgb.darker = function(k) {
	  k = k == null ? darker : Math.pow(darker, k);
	  return new Rgb(this.r * k, this.g * k, this.b * k);
	};

	_rgb.rgb = function() {
	  return this;
	};

	_rgb.displayable = function() {
	  return (0 <= this.r && this.r <= 255)
	      && (0 <= this.g && this.g <= 255)
	      && (0 <= this.b && this.b <= 255);
	};

	_rgb.toString = function() {
	  var r = Math.round(this.r),
	      g = Math.round(this.g),
	      b = Math.round(this.b);
	  return "#"
	      + (isNaN(r) || r <= 0 ? "00" : r < 16 ? "0" + r.toString(16) : r >= 255 ? "ff" : r.toString(16))
	      + (isNaN(g) || g <= 0 ? "00" : g < 16 ? "0" + g.toString(16) : g >= 255 ? "ff" : g.toString(16))
	      + (isNaN(b) || b <= 0 ? "00" : b < 16 ? "0" + b.toString(16) : b >= 255 ? "ff" : b.toString(16));
	};

	function hsl(h, s, l) {
	  if (arguments.length === 1) {
	    if (h instanceof Hsl) {
	      l = h.l;
	      s = h.s;
	      h = h.h;
	    } else {
	      if (!(h instanceof Color)) h = color(h);
	      if (h) {
	        if (h instanceof Hsl) return h;
	        h = h.rgb();
	        var r = h.r / 255,
	            g = h.g / 255,
	            b = h.b / 255,
	            min = Math.min(r, g, b),
	            max = Math.max(r, g, b),
	            range = max - min;
	        l = (max + min) / 2;
	        if (range) {
	          s = l < 0.5 ? range / (max + min) : range / (2 - max - min);
	          if (r === max) h = (g - b) / range + (g < b) * 6;
	          else if (g === max) h = (b - r) / range + 2;
	          else h = (r - g) / range + 4;
	          h *= 60;
	        } else {
	          h = NaN;
	          s = l > 0 && l < 1 ? 0 : h;
	        }
	      } else {
	        h = s = l = NaN;
	      }
	    }
	  }
	  return new Hsl(h, s, l);
	};

	function Hsl(h, s, l) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	};

	var _hsl = hsl.prototype = Hsl.prototype = new Color;

	_hsl.brighter = function(k) {
	  k = k == null ? brighter : Math.pow(brighter, k);
	  return new Hsl(this.h, this.s, this.l * k);
	};

	_hsl.darker = function(k) {
	  k = k == null ? darker : Math.pow(darker, k);
	  return new Hsl(this.h, this.s, this.l * k);
	};

	_hsl.rgb = function() {
	  var h = this.h % 360 + (this.h < 0) * 360,
	      s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
	      l = this.l,
	      m2 = l + (l < 0.5 ? l : 1 - l) * s,
	      m1 = 2 * l - m2;
	  return new Rgb(
	    hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
	    hsl2rgb(h, m1, m2),
	    hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2)
	  );
	};

	_hsl.displayable = function() {
	  return (0 <= this.s && this.s <= 1 || isNaN(this.s))
	      && (0 <= this.l && this.l <= 1);
	};

	/* From FvD 13.37, CSS Color Module Level 3 */
	function hsl2rgb(h, m1, m2) {
	  return (h < 60 ? m1 + (m2 - m1) * h / 60
	      : h < 180 ? m2
	      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
	      : m1) * 255;
	}

	var deg2rad = Math.PI / 180;
	var rad2deg$1 = 180 / Math.PI;

	var Kn = 18;
	var Xn = 0.950470;
	var Yn = 1;
	var Zn = 1.088830;
	var t0 = 4 / 29;
	var t1 = 6 / 29;
	var t2 = 3 * t1 * t1;
	var t3 = t1 * t1 * t1;
	function lab(l, a, b) {
	  if (arguments.length === 1) {
	    if (l instanceof Lab) {
	      b = l.b;
	      a = l.a;
	      l = l.l;
	    } else if (l instanceof Hcl) {
	      var h = l.h * deg2rad;
	      b = Math.sin(h) * l.c;
	      a = Math.cos(h) * l.c;
	      l = l.l;
	    } else {
	      if (!(l instanceof Rgb)) l = rgb(l);
	      var r = rgb2xyz(l.r),
	          g = rgb2xyz(l.g),
	          b = rgb2xyz(l.b),
	          x = xyz2lab((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / Xn),
	          y = xyz2lab((0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / Yn),
	          z = xyz2lab((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / Zn);
	      b = 200 * (y - z);
	      a = 500 * (x - y);
	      l = 116 * y - 16;
	    }
	  }
	  return new Lab(l, a, b);
	};

	function Lab(l, a, b) {
	  this.l = +l;
	  this.a = +a;
	  this.b = +b;
	};

	var _lab = lab.prototype = Lab.prototype = new Color;

	_lab.brighter = function(k) {
	  return new Lab(this.l + Kn * (k == null ? 1 : k), this.a, this.b);
	};

	_lab.darker = function(k) {
	  return new Lab(this.l - Kn * (k == null ? 1 : k), this.a, this.b);
	};

	_lab.rgb = function() {
	  var y = (this.l + 16) / 116,
	      x = isNaN(this.a) ? y : y + this.a / 500,
	      z = isNaN(this.b) ? y : y - this.b / 200;
	  y = Yn * lab2xyz(y);
	  x = Xn * lab2xyz(x);
	  z = Zn * lab2xyz(z);
	  return new Rgb(
	    xyz2rgb( 3.2404542 * x - 1.5371385 * y - 0.4985314 * z), // D65 -> sRGB
	    xyz2rgb(-0.9692660 * x + 1.8760108 * y + 0.0415560 * z),
	    xyz2rgb( 0.0556434 * x - 0.2040259 * y + 1.0572252 * z)
	  );
	};

	function xyz2lab(t) {
	  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
	}

	function lab2xyz(t) {
	  return t > t1 ? t * t * t : t2 * (t - t0);
	}

	function xyz2rgb(x) {
	  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
	}

	function rgb2xyz(x) {
	  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
	}

	function hcl(h, c, l) {
	  if (arguments.length === 1) {
	    if (h instanceof Hcl) {
	      l = h.l;
	      c = h.c;
	      h = h.h;
	    } else {
	      if (!(h instanceof Lab)) h = lab(h);
	      l = h.l;
	      c = Math.sqrt(h.a * h.a + h.b * h.b);
	      h = Math.atan2(h.b, h.a) * rad2deg$1;
	      if (h < 0) h += 360;
	    }
	  }
	  return new Hcl(h, c, l);
	};

	function Hcl(h, c, l) {
	  this.h = +h;
	  this.c = +c;
	  this.l = +l;
	};

	var _hcl = hcl.prototype = Hcl.prototype = new Color;

	_hcl.brighter = function(k) {
	  return new Hcl(this.h, this.c, this.l + Kn * (k == null ? 1 : k));
	};

	_hcl.darker = function(k) {
	  return new Hcl(this.h, this.c, this.l - Kn * (k == null ? 1 : k));
	};

	_hcl.rgb = function() {
	  return lab(this).rgb();
	};

	var A = -0.14861;
	var B = +1.78277;
	var C = -0.29227;
	var D = -0.90649;
	var E = +1.97294;
	var ED = E * D;
	var EB = E * B;
	var BC_DA = B * C - D * A;
	function cubehelix(h, s, l) {
	  if (arguments.length === 1) {
	    if (h instanceof Cubehelix) {
	      l = h.l;
	      s = h.s;
	      h = h.h;
	    } else {
	      if (!(h instanceof Rgb)) h = rgb(h);
	      var r = h.r / 255, g = h.g / 255, b = h.b / 255;
	      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB);
	      var bl = b - l, k = (E * (g - l) - C * bl) / D;
	      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)); // NaN if l=0 or l=1
	      h = s ? Math.atan2(k, bl) * rad2deg$1 - 120 : NaN;
	      if (h < 0) h += 360;
	    }
	  }
	  return new Cubehelix(h, s, l);
	};

	function Cubehelix(h, s, l) {
	  this.h = +h;
	  this.s = +s;
	  this.l = +l;
	};

	var _cubehelix = cubehelix.prototype = Cubehelix.prototype = new Color;

	_cubehelix.brighter = function(k) {
	  k = k == null ? brighter : Math.pow(brighter, k);
	  return new Cubehelix(this.h, this.s, this.l * k);
	};

	_cubehelix.darker = function(k) {
	  k = k == null ? darker : Math.pow(darker, k);
	  return new Cubehelix(this.h, this.s, this.l * k);
	};

	_cubehelix.rgb = function() {
	  var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
	      l = +this.l,
	      a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
	      cosh = Math.cos(h),
	      sinh = Math.sin(h);
	  return new Rgb(
	    255 * (l + a * (A * cosh + B * sinh)),
	    255 * (l + a * (C * cosh + D * sinh)),
	    255 * (l + a * (E * cosh))
	  );
	};

	function rgb$1(a, b) {
	  a = rgb(a);
	  b = rgb(b);
	  var ar = a.r,
	      ag = a.g,
	      ab = a.b,
	      br = b.r - ar,
	      bg = b.g - ag,
	      bb = b.b - ab;
	  return function(t) {
	    a.r = ar + br * t;
	    a.g = ag + bg * t;
	    a.b = ab + bb * t;
	    return a + "";
	  };
	};

	// TODO sparse arrays?
	function array(a, b) {
	  var x = [],
	      c = [],
	      na = a ? a.length : 0,
	      nb = b ? b.length : 0,
	      n0 = Math.min(na, nb),
	      i;

	  for (i = 0; i < n0; ++i) x.push(interpolateValue(a[i], b[i]));
	  for (; i < na; ++i) c[i] = a[i];
	  for (; i < nb; ++i) c[i] = b[i];

	  return function(t) {
	    for (i = 0; i < n0; ++i) c[i] = x[i](t);
	    return c;
	  };
	};

	function reinterpolate(a, b) {
	  return a = +a, b -= a, function(t) {
	    return a + b * t;
	  };
	};

	function object(a, b) {
	  var i = {},
	      c = {},
	      k;

	  if (a === null || typeof a !== "object") a = {};
	  if (b === null || typeof b !== "object") b = {};

	  for (k in a) {
	    if (k in b) {
	      i[k] = interpolateValue(a[k], b[k]);
	    } else {
	      c[k] = a[k];
	    }
	  }

	  for (k in b) {
	    if (!(k in a)) {
	      c[k] = b[k];
	    }
	  }

	  return function(t) {
	    for (k in i) c[k] = i[k](t);
	    return c;
	  };
	};

	var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
	var reB = new RegExp(reA.source, "g");
	function zero(b) {
	  return function() {
	    return b;
	  };
	}

	function one(b) {
	  return function(t) {
	    return b(t) + "";
	  };
	}

	function string(a, b) {
	  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
	      am, // current match in a
	      bm, // current match in b
	      bs, // string preceding current number in b, if any
	      i = -1, // index in s
	      s = [], // string constants and placeholders
	      q = []; // number interpolators

	  // Coerce inputs to strings.
	  a = a + "", b = b + "";

	  // Interpolate pairs of numbers in a & b.
	  while ((am = reA.exec(a))
	      && (bm = reB.exec(b))) {
	    if ((bs = bm.index) > bi) { // a string precedes the next number in b
	      bs = b.slice(bi, bs);
	      if (s[i]) s[i] += bs; // coalesce with previous string
	      else s[++i] = bs;
	    }
	    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
	      if (s[i]) s[i] += bm; // coalesce with previous string
	      else s[++i] = bm;
	    } else { // interpolate non-matching numbers
	      s[++i] = null;
	      q.push({i: i, x: reinterpolate(am, bm)});
	    }
	    bi = reB.lastIndex;
	  }

	  // Add remains of b.
	  if (bi < b.length) {
	    bs = b.slice(bi);
	    if (s[i]) s[i] += bs; // coalesce with previous string
	    else s[++i] = bs;
	  }

	  // Special optimization for only a single match.
	  // Otherwise, interpolate each of the numbers and rejoin the string.
	  return s.length < 2 ? (q[0]
	      ? one(q[0].x)
	      : zero(b))
	      : (b = q.length, function(t) {
	          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
	          return s.join("");
	        });
	};

	var values$1 = [
	  function(a, b) {
	    var t = typeof b, c;
	    return (t === "string" ? ((c = color(b)) ? (b = c, rgb$1) : string)
	        : b instanceof color ? rgb$1
	        : Array.isArray(b) ? array
	        : t === "object" && isNaN(b) ? object
	        : reinterpolate)(a, b);
	  }
	];

	function interpolateValue(a, b) {
	  var i = values$1.length, f;
	  while (--i >= 0 && !(f = values$1[i](a, b)));
	  return f;
	};

	function interpolateRound(a, b) {
	  return a = +a, b -= a, function(t) {
	    return Math.round(a + b * t);
	  };
	};

	var rad2deg = 180 / Math.PI;
	var identity = {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0};
	var g;
	// Compute x-scale and normalize the first row.
	// Compute shear and make second row orthogonal to first.
	// Compute y-scale and normalize the second row.
	// Finally, compute the rotation.
	function Transform(string) {
	  if (!g) g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	  if (string) g.setAttribute("transform", string), t = g.transform.baseVal.consolidate();

	  var t,
	      m = t ? t.matrix : identity,
	      r0 = [m.a, m.b],
	      r1 = [m.c, m.d],
	      kx = normalize(r0),
	      kz = dot(r0, r1),
	      ky = normalize(combine(r1, r0, -kz)) || 0;

	  if (r0[0] * r1[1] < r1[0] * r0[1]) {
	    r0[0] *= -1;
	    r0[1] *= -1;
	    kx *= -1;
	    kz *= -1;
	  }

	  this.rotate = (kx ? Math.atan2(r0[1], r0[0]) : Math.atan2(-r1[0], r1[1])) * rad2deg;
	  this.translate = [m.e, m.f];
	  this.scale = [kx, ky];
	  this.skew = ky ? Math.atan2(kz, ky) * rad2deg : 0;
	}

	function dot(a, b) {
	  return a[0] * b[0] + a[1] * b[1];
	}

	function normalize(a) {
	  var k = Math.sqrt(dot(a, a));
	  if (k) a[0] /= k, a[1] /= k;
	  return k;
	}

	function combine(a, b, k) {
	  a[0] += k * b[0];
	  a[1] += k * b[1];
	  return a;
	}

	function pop(s) {
	  return s.length ? s.pop() + "," : "";
	}

	function translate(ta, tb, s, q) {
	  if (ta[0] !== tb[0] || ta[1] !== tb[1]) {
	    var i = s.push("translate(", null, ",", null, ")");
	    q.push({i: i - 4, x: reinterpolate(ta[0], tb[0])}, {i: i - 2, x: reinterpolate(ta[1], tb[1])});
	  } else if (tb[0] || tb[1]) {
	    s.push("translate(" + tb + ")");
	  }
	}

	function rotate(ra, rb, s, q) {
	  if (ra !== rb) {
	    if (ra - rb > 180) rb += 360; else if (rb - ra > 180) ra += 360; // shortest path
	    q.push({i: s.push(pop(s) + "rotate(", null, ")") - 2, x: reinterpolate(ra, rb)});
	  } else if (rb) {
	    s.push(pop(s) + "rotate(" + rb + ")");
	  }
	}

	function skew(wa, wb, s, q) {
	  if (wa !== wb) {
	    q.push({i: s.push(pop(s) + "skewX(", null, ")") - 2, x: reinterpolate(wa, wb)});
	  } else if (wb) {
	    s.push(pop(s) + "skewX(" + wb + ")");
	  }
	}

	function scale(ka, kb, s, q) {
	  if (ka[0] !== kb[0] || ka[1] !== kb[1]) {
	    var i = s.push(pop(s) + "scale(", null, ",", null, ")");
	    q.push({i: i - 4, x: reinterpolate(ka[0], kb[0])}, {i: i - 2, x: reinterpolate(ka[1], kb[1])});
	  } else if (kb[0] !== 1 || kb[1] !== 1) {
	    s.push(pop(s) + "scale(" + kb + ")");
	  }
	}

	function transform(a, b) {
	  var s = [], // string constants and placeholders
	      q = []; // number interpolators
	  a = new Transform(a), b = new Transform(b);
	  translate(a.translate, b.translate, s, q);
	  rotate(a.rotate, b.rotate, s, q);
	  skew(a.skew, b.skew, s, q);
	  scale(a.scale, b.scale, s, q);
	  a = b = null; // gc
	  return function(t) {
	    var i = -1, n = q.length, o;
	    while (++i < n) s[(o = q[i]).i] = o.x(t);
	    return s.join("");
	  };
	};

	var rho = Math.SQRT2;
	var rho2 = 2;
	var rho4 = 4;
	var epsilon2 = 1e-12;
	function cosh(x) {
	  return ((x = Math.exp(x)) + 1 / x) / 2;
	}

	function sinh(x) {
	  return ((x = Math.exp(x)) - 1 / x) / 2;
	}

	function tanh(x) {
	  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
	}

	// p0 = [ux0, uy0, w0]
	// p1 = [ux1, uy1, w1]
	function zoom(p0, p1) {
	  var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
	      ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
	      dx = ux1 - ux0,
	      dy = uy1 - uy0,
	      d2 = dx * dx + dy * dy,
	      i,
	      S;

	  // Special case for u0 ≅ u1.
	  if (d2 < epsilon2) {
	    S = Math.log(w1 / w0) / rho;
	    i = function(t) {
	      return [
	        ux0 + t * dx,
	        uy0 + t * dy,
	        w0 * Math.exp(rho * t * S)
	      ];
	    }
	  }

	  // General case.
	  else {
	    var d1 = Math.sqrt(d2),
	        b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
	        b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
	        r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
	        r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
	    S = (r1 - r0) / rho;
	    i = function(t) {
	      var s = t * S,
	          coshr0 = cosh(r0),
	          u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
	      return [
	        ux0 + u * dx,
	        uy0 + u * dy,
	        w0 * coshr0 / cosh(rho * s + r0)
	      ];
	    }
	  }

	  i.duration = S * 1000;

	  return i;
	};

	function deltaHue(h1, h0) {
	  var delta = h1 - h0;
	  return delta > 180 || delta < -180
	      ? delta - 360 * Math.round(delta / 360)
	      : delta;
	};

	function hsl$1(a, b) {
	  a = hsl(a);
	  b = hsl(b);
	  var ah = isNaN(a.h) ? b.h : a.h,
	      as = isNaN(a.s) ? b.s : a.s,
	      al = a.l,
	      bh = isNaN(b.h) ? 0 : deltaHue(b.h, ah),
	      bs = isNaN(b.s) ? 0 : b.s - as,
	      bl = b.l - al;
	  return function(t) {
	    a.h = ah + bh * t;
	    a.s = as + bs * t;
	    a.l = al + bl * t;
	    return a + "";
	  };
	};

	function hslLong(a, b) {
	  a = hsl(a);
	  b = hsl(b);
	  var ah = isNaN(a.h) ? b.h : a.h,
	      as = isNaN(a.s) ? b.s : a.s,
	      al = a.l,
	      bh = isNaN(b.h) ? 0 : b.h - ah,
	      bs = isNaN(b.s) ? 0 : b.s - as,
	      bl = b.l - al;
	  return function(t) {
	    a.h = ah + bh * t;
	    a.s = as + bs * t;
	    a.l = al + bl * t;
	    return a + "";
	  };
	};

	function lab$1(a, b) {
	  a = lab(a);
	  b = lab(b);
	  var al = a.l,
	      aa = a.a,
	      ab = a.b,
	      bl = b.l - al,
	      ba = b.a - aa,
	      bb = b.b - ab;
	  return function(t) {
	    a.l = al + bl * t;
	    a.a = aa + ba * t;
	    a.b = ab + bb * t;
	    return a + "";
	  };
	};

	function hcl$1(a, b) {
	  a = hcl(a);
	  b = hcl(b);
	  var ah = isNaN(a.h) ? b.h : a.h,
	      ac = isNaN(a.c) ? b.c : a.c,
	      al = a.l,
	      bh = isNaN(b.h) ? 0 : deltaHue(b.h, ah),
	      bc = isNaN(b.c) ? 0 : b.c - ac,
	      bl = b.l - al;
	  return function(t) {
	    a.h = ah + bh * t;
	    a.c = ac + bc * t;
	    a.l = al + bl * t;
	    return a + "";
	  };
	};

	function hclLong(a, b) {
	  a = hcl(a);
	  b = hcl(b);
	  var ah = isNaN(a.h) ? b.h : a.h,
	      ac = isNaN(a.c) ? b.c : a.c,
	      al = a.l,
	      bh = isNaN(b.h) ? 0 : b.h - ah,
	      bc = isNaN(b.c) ? 0 : b.c - ac,
	      bl = b.l - al;
	  return function(t) {
	    a.h = ah + bh * t;
	    a.c = ac + bc * t;
	    a.l = al + bl * t;
	    return a + "";
	  };
	};

	function cubehelix$1(a, b, gamma) {
	  if (arguments.length < 3) gamma = 1;
	  a = cubehelix(a);
	  b = cubehelix(b);
	  var ah = isNaN(a.h) ? b.h : a.h,
	      as = isNaN(a.s) ? b.s : a.s,
	      al = a.l,
	      bh = isNaN(b.h) ? 0 : deltaHue(b.h, ah),
	      bs = isNaN(b.s) ? 0 : b.s - as,
	      bl = b.l - al;
	  return function(t) {
	    a.h = ah + bh * t;
	    a.s = as + bs * t;
	    a.l = al + bl * Math.pow(t, gamma);
	    return a + "";
	  };
	};

	function interpolateCubehelixLong(a, b, gamma) {
	  if (arguments.length < 3) gamma = 1;
	  a = cubehelix(a);
	  b = cubehelix(b);
	  var ah = isNaN(a.h) ? b.h : a.h,
	      as = isNaN(a.s) ? b.s : a.s,
	      al = a.l,
	      bh = isNaN(b.h) ? 0 : b.h - ah,
	      bs = isNaN(b.s) ? 0 : b.s - as,
	      bl = b.l - al;
	  return function(t) {
	    a.h = ah + bh * t;
	    a.s = as + bs * t;
	    a.l = al + bl * Math.pow(t, gamma);
	    return a + "";
	  };
	};

	var slice$1 = Array.prototype.slice;

	function bindN$1(type, args) {
	  args = slice$1.call(args);
	  args[0] = null;
	  args.unshift(null);
	  return function(a, b) {
	    args[0] = a;
	    args[1] = b;
	    return type.apply(null, args);
	  };
	}

	function interpolateBind(type) {
	  return arguments.length === 1 ? type : bindN$1(type, arguments);
	};

	function dispatch() {
	  return new Dispatch(arguments);
	}

	function Dispatch(types) {
	  var i = -1,
	      n = types.length,
	      callbacksByType = {},
	      callbackByName = {},
	      type,
	      that = this;

	  that.on = function(type, callback) {
	    type = parseType(type);

	    // Return the current callback, if any.
	    if (arguments.length < 2) {
	      return (callback = callbackByName[type.name]) && callback.value;
	    }

	    // If a type was specified…
	    if (type.type) {
	      var callbacks = callbacksByType[type.type],
	          callback0 = callbackByName[type.name],
	          i;

	      // Remove the current callback, if any, using copy-on-remove.
	      if (callback0) {
	        callback0.value = null;
	        i = callbacks.indexOf(callback0);
	        callbacksByType[type.type] = callbacks = callbacks.slice(0, i).concat(callbacks.slice(i + 1));
	        delete callbackByName[type.name];
	      }

	      // Add the new callback, if any.
	      if (callback) {
	        callback = {value: callback};
	        callbackByName[type.name] = callback;
	        callbacks.push(callback);
	      }
	    }

	    // Otherwise, if a null callback was specified, remove all callbacks with the given name.
	    else if (callback == null) {
	      for (var otherType in callbacksByType) {
	        if (callback = callbackByName[otherType + type.name]) {
	          callback.value = null;
	          var callbacks = callbacksByType[otherType], i = callbacks.indexOf(callback);
	          callbacksByType[otherType] = callbacks.slice(0, i).concat(callbacks.slice(i + 1));
	          delete callbackByName[callback.name];
	        }
	      }
	    }

	    return that;
	  };

	  while (++i < n) {
	    type = types[i] + "";
	    if (!type || (type in that)) throw new Error("illegal or duplicate type: " + type);
	    callbacksByType[type] = [];
	    that[type] = applier(type);
	  }

	  function parseType(type) {
	    var i = (type += "").indexOf("."), name = type;
	    if (i >= 0) type = type.slice(0, i); else name += ".";
	    if (type && !callbacksByType.hasOwnProperty(type)) throw new Error("unknown type: " + type);
	    return {type: type, name: name};
	  }

	  function applier(type) {
	    return function() {
	      var callbacks = callbacksByType[type], // Defensive reference; copy-on-remove.
	          callback,
	          callbackValue,
	          i = -1,
	          n = callbacks.length;

	      while (++i < n) {
	        if (callbackValue = (callback = callbacks[i]).value) {
	          callbackValue.apply(this, arguments);
	        }
	      }

	      return that;
	    };
	  }
	}

	dispatch.prototype = Dispatch.prototype;

	function dsv(delimiter) {
	  return new Dsv(delimiter);
	}

	function objectConverter(columns) {
	  return new Function("d", "return {" + columns.map(function(name, i) {
	    return JSON.stringify(name) + ": d[" + i + "]";
	  }).join(",") + "}");
	}

	function customConverter(columns, f) {
	  var object = objectConverter(columns);
	  return function(row, i) {
	    return f(object(row), i, columns);
	  };
	}

	// Compute unique columns in order of discovery.
	function inferColumns(rows) {
	  var columnSet = Object.create(null),
	      columns = [];

	  rows.forEach(function(row) {
	    for (var column in row) {
	      if (!(column in columnSet)) {
	        columns.push(columnSet[column] = column);
	      }
	    }
	  });

	  return columns;
	}

	function Dsv(delimiter) {
	  var reFormat = new RegExp("[\"" + delimiter + "\n]"),
	      delimiterCode = delimiter.charCodeAt(0);

	  this.parse = function(text, f) {
	    var convert, columns, rows = this.parseRows(text, function(row, i) {
	      if (convert) return convert(row, i - 1);
	      columns = row, convert = f ? customConverter(row, f) : objectConverter(row);
	    });
	    rows.columns = columns;
	    return rows;
	  };

	  this.parseRows = function(text, f) {
	    var EOL = {}, // sentinel value for end-of-line
	        EOF = {}, // sentinel value for end-of-file
	        rows = [], // output rows
	        N = text.length,
	        I = 0, // current character index
	        n = 0, // the current line number
	        t, // the current token
	        eol; // is the current token followed by EOL?

	    function token() {
	      if (I >= N) return EOF; // special case: end of file
	      if (eol) return eol = false, EOL; // special case: end of line

	      // special case: quotes
	      var j = I;
	      if (text.charCodeAt(j) === 34) {
	        var i = j;
	        while (i++ < N) {
	          if (text.charCodeAt(i) === 34) {
	            if (text.charCodeAt(i + 1) !== 34) break;
	            ++i;
	          }
	        }
	        I = i + 2;
	        var c = text.charCodeAt(i + 1);
	        if (c === 13) {
	          eol = true;
	          if (text.charCodeAt(i + 2) === 10) ++I;
	        } else if (c === 10) {
	          eol = true;
	        }
	        return text.slice(j + 1, i).replace(/""/g, "\"");
	      }

	      // common case: find next delimiter or newline
	      while (I < N) {
	        var c = text.charCodeAt(I++), k = 1;
	        if (c === 10) eol = true; // \n
	        else if (c === 13) { eol = true; if (text.charCodeAt(I) === 10) ++I, ++k; } // \r|\r\n
	        else if (c !== delimiterCode) continue;
	        return text.slice(j, I - k);
	      }

	      // special case: last token before EOF
	      return text.slice(j);
	    }

	    while ((t = token()) !== EOF) {
	      var a = [];
	      while (t !== EOL && t !== EOF) {
	        a.push(t);
	        t = token();
	      }
	      if (f && (a = f(a, n++)) == null) continue;
	      rows.push(a);
	    }

	    return rows;
	  }

	  this.format = function(rows, columns) {
	    if (arguments.length < 2) columns = inferColumns(rows);
	    return [columns.map(formatValue).join(delimiter)].concat(rows.map(function(row) {
	      return columns.map(function(column) {
	        return formatValue(row[column]);
	      }).join(delimiter);
	    })).join("\n");
	  };

	  this.formatRows = function(rows) {
	    return rows.map(formatRow).join("\n");
	  };

	  function formatRow(row) {
	    return row.map(formatValue).join(delimiter);
	  }

	  function formatValue(text) {
	    return reFormat.test(text) ? "\"" + text.replace(/\"/g, "\"\"") + "\"" : text;
	  }
	};

	dsv.prototype = Dsv.prototype;

	var csv = dsv(",");
	var tsv = dsv("\t");

	function request(url, callback) {
	  var request,
	      event = dispatch("beforesend", "progress", "load", "error"),
	      mimeType,
	      headers = map(),
	      xhr = new XMLHttpRequest,
	      response,
	      responseType,
	      timeout = 0;

	  // If IE does not support CORS, use XDomainRequest.
	  if (typeof XDomainRequest !== "undefined"
	      && !("withCredentials" in xhr)
	      && /^(http(s)?:)?\/\//.test(url)) xhr = new XDomainRequest;

	  "onload" in xhr
	      ? xhr.onload = xhr.onerror = xhr.ontimeout = respond
	      : xhr.onreadystatechange = function() { xhr.readyState > 3 && respond(); };

	  function respond() {
	    var status = xhr.status, result;
	    if (!status && hasResponse(xhr)
	        || status >= 200 && status < 300
	        || status === 304) {
	      if (response) {
	        try {
	          result = response.call(request, xhr);
	        } catch (e) {
	          event.error.call(request, e);
	          return;
	        }
	      } else {
	        result = xhr;
	      }
	      event.load.call(request, result);
	    } else {
	      event.error.call(request, xhr);
	    }
	  }

	  xhr.onprogress = function(e) {
	    event.progress.call(request, e);
	  };

	  request = {
	    header: function(name, value) {
	      name = (name + "").toLowerCase();
	      if (arguments.length < 2) return headers.get(name);
	      if (value == null) headers.remove(name);
	      else headers.set(name, value + "");
	      return request;
	    },

	    // If mimeType is non-null and no Accept header is set, a default is used.
	    mimeType: function(value) {
	      if (!arguments.length) return mimeType;
	      mimeType = value == null ? null : value + "";
	      return request;
	    },

	    // Specifies what type the response value should take;
	    // for instance, arraybuffer, blob, document, or text.
	    responseType: function(value) {
	      if (!arguments.length) return responseType;
	      responseType = value;
	      return request;
	    },

	    timeout: function(value) {
	      if (!arguments.length) return timeout;
	      timeout = +value;
	      return request;
	    },

	    // Specify how to convert the response content to a specific type;
	    // changes the callback value on "load" events.
	    response: function(value) {
	      response = value;
	      return request;
	    },

	    // Alias for send("GET", …).
	    get: function(data, callback) {
	      return request.send("GET", data, callback);
	    },

	    // Alias for send("POST", …).
	    post: function(data, callback) {
	      return request.send("POST", data, callback);
	    },

	    // If callback is non-null, it will be used for error and load events.
	    send: function(method, data, callback) {
	      if (!callback && typeof data === "function") callback = data, data = null;
	      if (callback && callback.length === 1) callback = fixCallback(callback);
	      xhr.open(method, url, true);
	      if (mimeType != null && !headers.has("accept")) headers.set("accept", mimeType + ",*/*");
	      if (xhr.setRequestHeader) headers.each(function(value, name) { xhr.setRequestHeader(name, value); });
	      if (mimeType != null && xhr.overrideMimeType) xhr.overrideMimeType(mimeType);
	      if (responseType != null) xhr.responseType = responseType;
	      if (timeout > 0) xhr.timeout = timeout;
	      if (callback) request.on("error", callback).on("load", function(xhr) { callback(null, xhr); });
	      event.beforesend.call(request, xhr);
	      xhr.send(data == null ? null : data);
	      return request;
	    },

	    abort: function() {
	      xhr.abort();
	      return request;
	    },

	    on: function() {
	      var value = event.on.apply(event, arguments);
	      return value === event ? request : value;
	    }
	  };

	  return callback
	      ? request.get(callback)
	      : request;
	};

	function fixCallback(callback) {
	  return function(error, xhr) {
	    callback(error == null ? xhr : null);
	  };
	}

	function hasResponse(xhr) {
	  var type = xhr.responseType;
	  return type && type !== "text"
	      ? xhr.response // null on error
	      : xhr.responseText; // "" on error
	}

	function requestType(defaultMimeType, response) {
	  return function(url, callback) {
	    var r = request(url).mimeType(defaultMimeType).response(response);
	    return callback ? r.get(callback) : r;
	  };
	};

	var html = requestType("text/html", function(xhr) {
	  return document.createRange().createContextualFragment(xhr.responseText);
	});

	var json = requestType("application/json", function(xhr) {
	  return JSON.parse(xhr.responseText);
	});

	var text = requestType("text/plain", function(xhr) {
	  return xhr.responseText;
	});

	var xml = requestType("application/xml", function(xhr) {
	  var xml = xhr.responseXML;
	  if (!xml) throw new Error("parse error");
	  return xml;
	});

	function requestDsv(defaultMimeType, dsv) {
	  return function(url, row, callback) {
	    if (arguments.length < 3) callback = row, row = null;
	    var r = request(url).mimeType(defaultMimeType);
	    r.row = function(_) { return arguments.length ? r.response(responseOf(dsv, row = _)) : row; };
	    r.row(row);
	    return callback ? r.get(callback) : r;
	  };
	};

	function responseOf(dsv, row) {
	  return function(request) {
	    return dsv.parse(request.responseText, row);
	  };
	}

	var csv$1 = requestDsv("text/csv", csv);

	var tsv$1 = requestDsv("text/tab-separated-values", tsv);

	var frame = 0;
	var timeout = 0;
	var taskHead;
	var taskTail;
	var taskId = 0;
	var taskById = {};
	var setFrame = typeof window !== "undefined"
	    && (window.requestAnimationFrame
	      || window.msRequestAnimationFrame
	      || window.mozRequestAnimationFrame
	      || window.webkitRequestAnimationFrame
	      || window.oRequestAnimationFrame)
	      || function(callback) { return setTimeout(callback, 17); };

	function Timer(callback, delay, time) {
	  this.id = ++taskId;
	  this.restart(callback, delay, time);
	}

	Timer.prototype = timer.prototype = {
	  restart: function(callback, delay, time) {
	    if (typeof callback !== "function") throw new TypeError("callback is not a function");
	    time = (time == null ? Date.now() : +time) + (delay == null ? 0 : +delay);
	    var i = this.id, t = taskById[i];
	    if (t) {
	      t.callback = callback, t.time = time;
	    } else {
	      t = {next: null, callback: callback, time: time};
	      if (taskTail) taskTail.next = t; else taskHead = t;
	      taskById[i] = taskTail = t;
	    }
	    sleep();
	  },
	  stop: function() {
	    var i = this.id, t = taskById[i];
	    if (t) {
	      t.callback = null, t.time = Infinity;
	      delete taskById[i];
	      sleep();
	    }
	  }
	};

	function timer(callback, delay, time) {
	  return new Timer(callback, delay, time);
	};

	function timerFlush(time) {
	  time = time == null ? Date.now() : +time;
	  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
	  try {
	    var t = taskHead, c;
	    while (t) {
	      if (time >= t.time) c = t.callback, c(time - t.time, time);
	      t = t.next;
	    }
	  } finally {
	    --frame;
	  }
	};

	function wake() {
	  frame = timeout = 0;
	  try {
	    timerFlush();
	  } finally {
	    var t0, t1 = taskHead, time = Infinity;
	    while (t1) {
	      if (t1.callback) {
	        if (time > t1.time) time = t1.time;
	        t1 = (t0 = t1).next;
	      } else {
	        t1 = t0 ? t0.next = t1.next : taskHead = t1.next;
	      }
	    }
	    taskTail = t0;
	    sleep(time);
	  }
	}

	function sleep(time) {
	  if (frame) return; // Soonest alarm already set, or will be.
	  if (timeout) timeout = clearTimeout(timeout);
	  var delay = time - Date.now();
	  if (delay > 24) { if (time < Infinity) timeout = setTimeout(wake, delay); }
	  else frame = 1, setFrame(wake);
	}

	var t0$1 = new Date;
	var t1$1 = new Date;
	function newInterval(floori, offseti, count, field) {

	  function interval(date) {
	    return floori(date = new Date(+date)), date;
	  }

	  interval.floor = interval;

	  interval.round = function(date) {
	    var d0 = new Date(+date),
	        d1 = new Date(date - 1);
	    floori(d0), floori(d1), offseti(d1, 1);
	    return date - d0 < d1 - date ? d0 : d1;
	  };

	  interval.ceil = function(date) {
	    return floori(date = new Date(date - 1)), offseti(date, 1), date;
	  };

	  interval.offset = function(date, step) {
	    return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
	  };

	  interval.range = function(start, stop, step) {
	    var range = [];
	    start = new Date(start - 1);
	    stop = new Date(+stop);
	    step = step == null ? 1 : Math.floor(step);
	    if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
	    offseti(start, 1), floori(start);
	    if (start < stop) range.push(new Date(+start));
	    while (offseti(start, step), floori(start), start < stop) range.push(new Date(+start));
	    return range;
	  };

	  interval.filter = function(test) {
	    return newInterval(function(date) {
	      while (floori(date), !test(date)) date.setTime(date - 1);
	    }, function(date, step) {
	      while (--step >= 0) while (offseti(date, 1), !test(date));
	    });
	  };

	  if (count) {
	    interval.count = function(start, end) {
	      t0$1.setTime(+start), t1$1.setTime(+end);
	      floori(t0$1), floori(t1$1);
	      return Math.floor(count(t0$1, t1$1));
	    };

	    interval.every = function(step) {
	      step = Math.floor(step);
	      return !isFinite(step) || !(step > 0) ? null
	          : !(step > 1) ? interval
	          : interval.filter(field
	              ? function(d) { return field(d) % step === 0; }
	              : function(d) { return interval.count(0, d) % step === 0; });
	    };
	  }

	  return interval;
	};

	var millisecond = newInterval(function() {
	  // noop
	}, function(date, step) {
	  date.setTime(+date + step);
	}, function(start, end) {
	  return end - start;
	});

	// An optimized implementation for this simple case.
	millisecond.every = function(k) {
	  k = Math.floor(k);
	  if (!isFinite(k) || !(k > 0)) return null;
	  if (!(k > 1)) return millisecond;
	  return newInterval(function(date) {
	    date.setTime(Math.floor(date / k) * k);
	  }, function(date, step) {
	    date.setTime(+date + step * k);
	  }, function(start, end) {
	    return (end - start) / k;
	  });
	};

	var timeSecond = newInterval(function(date) {
	  date.setMilliseconds(0);
	}, function(date, step) {
	  date.setTime(+date + step * 1e3);
	}, function(start, end) {
	  return (end - start) / 1e3;
	}, function(date) {
	  return date.getSeconds();
	});

	var timeMinute = newInterval(function(date) {
	  date.setSeconds(0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * 6e4);
	}, function(start, end) {
	  return (end - start) / 6e4;
	}, function(date) {
	  return date.getMinutes();
	});

	var timeHour = newInterval(function(date) {
	  date.setMinutes(0, 0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * 36e5);
	}, function(start, end) {
	  return (end - start) / 36e5;
	}, function(date) {
	  return date.getHours();
	});

	var timeDay = newInterval(function(date) {
	  date.setHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setDate(date.getDate() + step);
	}, function(start, end) {
	  return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * 6e4) / 864e5;
	}, function(date) {
	  return date.getDate() - 1;
	});

	function weekday(i) {
	  return newInterval(function(date) {
	    date.setHours(0, 0, 0, 0);
	    date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
	  }, function(date, step) {
	    date.setDate(date.getDate() + step * 7);
	  }, function(start, end) {
	    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * 6e4) / 6048e5;
	  });
	}

	var timeSunday = weekday(0);
	var timeMonday = weekday(1);
	var tuesday = weekday(2);
	var wednesday = weekday(3);
	var thursday = weekday(4);
	var friday = weekday(5);
	var saturday = weekday(6);

	var timeMonth = newInterval(function(date) {
	  date.setHours(0, 0, 0, 0);
	  date.setDate(1);
	}, function(date, step) {
	  date.setMonth(date.getMonth() + step);
	}, function(start, end) {
	  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
	}, function(date) {
	  return date.getMonth();
	});

	var timeYear = newInterval(function(date) {
	  date.setHours(0, 0, 0, 0);
	  date.setMonth(0, 1);
	}, function(date, step) {
	  date.setFullYear(date.getFullYear() + step);
	}, function(start, end) {
	  return end.getFullYear() - start.getFullYear();
	}, function(date) {
	  return date.getFullYear();
	});

	var utcSecond = newInterval(function(date) {
	  date.setUTCMilliseconds(0);
	}, function(date, step) {
	  date.setTime(+date + step * 1e3);
	}, function(start, end) {
	  return (end - start) / 1e3;
	}, function(date) {
	  return date.getUTCSeconds();
	});

	var utcMinute = newInterval(function(date) {
	  date.setUTCSeconds(0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * 6e4);
	}, function(start, end) {
	  return (end - start) / 6e4;
	}, function(date) {
	  return date.getUTCMinutes();
	});

	var utcHour = newInterval(function(date) {
	  date.setUTCMinutes(0, 0, 0);
	}, function(date, step) {
	  date.setTime(+date + step * 36e5);
	}, function(start, end) {
	  return (end - start) / 36e5;
	}, function(date) {
	  return date.getUTCHours();
	});

	var utcDay = newInterval(function(date) {
	  date.setUTCHours(0, 0, 0, 0);
	}, function(date, step) {
	  date.setUTCDate(date.getUTCDate() + step);
	}, function(start, end) {
	  return (end - start) / 864e5;
	}, function(date) {
	  return date.getUTCDate() - 1;
	});

	function utcWeekday(i) {
	  return newInterval(function(date) {
	    date.setUTCHours(0, 0, 0, 0);
	    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
	  }, function(date, step) {
	    date.setUTCDate(date.getUTCDate() + step * 7);
	  }, function(start, end) {
	    return (end - start) / 6048e5;
	  });
	}

	var utcSunday = utcWeekday(0);
	var utcMonday = utcWeekday(1);
	var utcTuesday = utcWeekday(2);
	var utcWednesday = utcWeekday(3);
	var utcThursday = utcWeekday(4);
	var utcFriday = utcWeekday(5);
	var utcSaturday = utcWeekday(6);

	var utcMonth = newInterval(function(date) {
	  date.setUTCHours(0, 0, 0, 0);
	  date.setUTCDate(1);
	}, function(date, step) {
	  date.setUTCMonth(date.getUTCMonth() + step);
	}, function(start, end) {
	  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
	}, function(date) {
	  return date.getUTCMonth();
	});

	var utcYear = newInterval(function(date) {
	  date.setUTCHours(0, 0, 0, 0);
	  date.setUTCMonth(0, 1);
	}, function(date, step) {
	  date.setUTCFullYear(date.getUTCFullYear() + step);
	}, function(start, end) {
	  return end.getUTCFullYear() - start.getUTCFullYear();
	}, function(date) {
	  return date.getUTCFullYear();
	});

	var timeMilliseconds = millisecond.range;
	var timeSeconds = timeSecond.range;
	var timeMinutes = timeMinute.range;
	var timeHours = timeHour.range;
	var timeDays = timeDay.range;
	var timeSundays = timeSunday.range;
	var timeMondays = timeMonday.range;
	var timeTuesdays = tuesday.range;
	var timeWednesdays = wednesday.range;
	var timeThursdays = thursday.range;
	var timeFridays = friday.range;
	var timeSaturdays = saturday.range;
	var timeWeeks = timeSunday.range;
	var timeMonths = timeMonth.range;
	var timeYears = timeYear.range;

	var utcMillisecond = millisecond;
	var utcMilliseconds = timeMilliseconds;
	var utcSeconds = utcSecond.range;
	var utcMinutes = utcMinute.range;
	var utcHours = utcHour.range;
	var utcDays = utcDay.range;
	var utcSundays = utcSunday.range;
	var utcMondays = utcMonday.range;
	var utcTuesdays = utcTuesday.range;
	var utcWednesdays = utcWednesday.range;
	var utcThursdays = utcThursday.range;
	var utcFridays = utcFriday.range;
	var utcSaturdays = utcSaturday.range;
	var utcWeeks = utcSunday.range;
	var utcMonths = utcMonth.range;
	var utcYears = utcYear.range;

	// Computes the decimal coefficient and exponent of the specified number x with
	// significant digits p, where x is positive and p is in [1, 21] or undefined.
	// For example, formatDecimal(1.23) returns ["123", 0].
	function formatDecimal(x, p) {
	  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
	  var i, coefficient = x.slice(0, i);

	  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
	  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
	  return [
	    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
	    +x.slice(i + 1)
	  ];
	};

	function exponent(x) {
	  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
	};

	function formatGroup(grouping, thousands) {
	  return function(value, width) {
	    var i = value.length,
	        t = [],
	        j = 0,
	        g = grouping[0],
	        length = 0;

	    while (i > 0 && g > 0) {
	      if (length + g + 1 > width) g = Math.max(1, width - length);
	      t.push(value.substring(i -= g, i + g));
	      if ((length += g + 1) > width) break;
	      g = grouping[j = (j + 1) % grouping.length];
	    }

	    return t.reverse().join(thousands);
	  };
	};

	function formatDefault(x, p) {
	  x = x.toPrecision(p);

	  out: for (var n = x.length, i = 1, i0 = -1, i1; i < n; ++i) {
	    switch (x[i]) {
	      case ".": i0 = i1 = i; break;
	      case "0": if (i0 === 0) i0 = i; i1 = i; break;
	      case "e": break out;
	      default: if (i0 > 0) i0 = 0; break;
	    }
	  }

	  return i0 > 0 ? x.slice(0, i0) + x.slice(i1 + 1) : x;
	};

	var prefixExponent;

	function formatPrefixAuto(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1],
	      i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
	      n = coefficient.length;
	  return i === n ? coefficient
	      : i > n ? coefficient + new Array(i - n + 1).join("0")
	      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
	      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
	};

	function formatRounded(x, p) {
	  var d = formatDecimal(x, p);
	  if (!d) return x + "";
	  var coefficient = d[0],
	      exponent = d[1];
	  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
	      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
	      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
	};

	var formatTypes = {
	  "": formatDefault,
	  "%": function(x, p) { return (x * 100).toFixed(p); },
	  "b": function(x) { return Math.round(x).toString(2); },
	  "c": function(x) { return x + ""; },
	  "d": function(x) { return Math.round(x).toString(10); },
	  "e": function(x, p) { return x.toExponential(p); },
	  "f": function(x, p) { return x.toFixed(p); },
	  "g": function(x, p) { return x.toPrecision(p); },
	  "o": function(x) { return Math.round(x).toString(8); },
	  "p": function(x, p) { return formatRounded(x * 100, p); },
	  "r": formatRounded,
	  "s": formatPrefixAuto,
	  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
	  "x": function(x) { return Math.round(x).toString(16); }
	};

	// [[fill]align][sign][symbol][0][width][,][.precision][type]
	var re = /^(?:(.)?([<>=^]))?([+\-\( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?([a-z%])?$/i;

	function formatSpecifier(specifier) {
	  return new FormatSpecifier(specifier);
	};

	function FormatSpecifier(specifier) {
	  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);

	  var match,
	      fill = match[1] || " ",
	      align = match[2] || ">",
	      sign = match[3] || "-",
	      symbol = match[4] || "",
	      zero = !!match[5],
	      width = match[6] && +match[6],
	      comma = !!match[7],
	      precision = match[8] && +match[8].slice(1),
	      type = match[9] || "";

	  // The "n" type is an alias for ",g".
	  if (type === "n") comma = true, type = "g";

	  // Map invalid types to the default format.
	  else if (!formatTypes[type]) type = "";

	  // If zero fill is specified, padding goes after sign and before digits.
	  if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

	  this.fill = fill;
	  this.align = align;
	  this.sign = sign;
	  this.symbol = symbol;
	  this.zero = zero;
	  this.width = width;
	  this.comma = comma;
	  this.precision = precision;
	  this.type = type;
	}

	FormatSpecifier.prototype.toString = function() {
	  return this.fill
	      + this.align
	      + this.sign
	      + this.symbol
	      + (this.zero ? "0" : "")
	      + (this.width == null ? "" : Math.max(1, this.width | 0))
	      + (this.comma ? "," : "")
	      + (this.precision == null ? "" : "." + Math.max(0, this.precision | 0))
	      + this.type;
	};

	var prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

	function identity$1(x) {
	  return x;
	}

	function locale(locale) {
	  var group = locale.grouping && locale.thousands ? formatGroup(locale.grouping, locale.thousands) : identity$1,
	      currency = locale.currency,
	      decimal = locale.decimal;

	  function newFormat(specifier) {
	    specifier = formatSpecifier(specifier);

	    var fill = specifier.fill,
	        align = specifier.align,
	        sign = specifier.sign,
	        symbol = specifier.symbol,
	        zero = specifier.zero,
	        width = specifier.width,
	        comma = specifier.comma,
	        precision = specifier.precision,
	        type = specifier.type;

	    // Compute the prefix and suffix.
	    // For SI-prefix, the suffix is lazily computed.
	    var prefix = symbol === "$" ? currency[0] : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
	        suffix = symbol === "$" ? currency[1] : /[%p]/.test(type) ? "%" : "";

	    // What format function should we use?
	    // Is this an integer type?
	    // Can this type generate exponential notation?
	    var formatType = formatTypes[type],
	        maybeSuffix = !type || /[defgprs%]/.test(type);

	    // Set the default precision if not specified,
	    // or clamp the specified precision to the supported range.
	    // For significant precision, it must be in [1, 21].
	    // For fixed precision, it must be in [0, 20].
	    precision = precision == null ? (type ? 6 : 12)
	        : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
	        : Math.max(0, Math.min(20, precision));

	    function format(value) {
	      var valuePrefix = prefix,
	          valueSuffix = suffix;

	      if (type === "c") {
	        valueSuffix = formatType(value) + valueSuffix;
	        value = "";
	      } else {
	        value = +value;

	        // Convert negative to positive, and compute the prefix.
	        // Note that -0 is not less than 0, but 1 / -0 is!
	        var valueNegative = (value < 0 || 1 / value < 0) && (value *= -1, true);

	        // Perform the initial formatting.
	        value = formatType(value, precision);

	        // If the original value was negative, it may be rounded to zero during
	        // formatting; treat this as (positive) zero.
	        if (valueNegative) {
	          var i = -1, n = value.length, c;
	          valueNegative = false;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), (48 < c && c < 58)
	                || (type === "x" && 96 < c && c < 103)
	                || (type === "X" && 64 < c && c < 71)) {
	              valueNegative = true;
	              break;
	            }
	          }
	        }

	        // Compute the prefix and suffix.
	        valuePrefix = (valueNegative ? (sign === "(" ? sign : "-") : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
	        valueSuffix = valueSuffix + (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + (valueNegative && sign === "(" ? ")" : "");

	        // Break the formatted value into the integer “value” part that can be
	        // grouped, and fractional or exponential “suffix” part that is not.
	        if (maybeSuffix) {
	          var i = -1, n = value.length, c;
	          while (++i < n) {
	            if (c = value.charCodeAt(i), 48 > c || c > 57) {
	              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
	              value = value.slice(0, i);
	              break;
	            }
	          }
	        }
	      }

	      // If the fill character is not "0", grouping is applied before padding.
	      if (comma && !zero) value = group(value, Infinity);

	      // Compute the padding.
	      var length = valuePrefix.length + value.length + valueSuffix.length,
	          padding = length < width ? new Array(width - length + 1).join(fill) : "";

	      // If the fill character is "0", grouping is applied after padding.
	      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

	      // Reconstruct the final output based on the desired alignment.
	      switch (align) {
	        case "<": return valuePrefix + value + valueSuffix + padding;
	        case "=": return valuePrefix + padding + value + valueSuffix;
	        case "^": return padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
	      }
	      return padding + valuePrefix + value + valueSuffix;
	    };

	    format.toString = function() {
	      return specifier + "";
	    };

	    return format;
	  }

	  function formatPrefix(specifier, value) {
	    var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
	        e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
	        k = Math.pow(10, -e),
	        prefix = prefixes[8 + e / 3];
	    return function(value) {
	      return f(k * value) + prefix;
	    };
	  }

	  return {
	    format: newFormat,
	    formatPrefix: formatPrefix
	  };
	};

	var defaultLocale = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["$", ""]
	});

	var caES = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["", "\xa0€"]
	});

	var csCZ = locale({
	  decimal: ",",
	  thousands: "\xa0",
	  grouping: [3],
	  currency: ["", "\xa0Kč"],
	});

	var deCH = locale({
	  decimal: ",",
	  thousands: "'",
	  grouping: [3],
	  currency: ["", "\xa0CHF"]
	});

	var deDE = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["", "\xa0€"]
	});

	var enCA = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["$", ""]
	});

	var enGB = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["£", ""]
	});

	var esES = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["", "\xa0€"]
	});

	var fiFI = locale({
	  decimal: ",",
	  thousands: "\xa0",
	  grouping: [3],
	  currency: ["", "\xa0€"]
	});

	var frCA = locale({
	  decimal: ",",
	  thousands: "\xa0",
	  grouping: [3],
	  currency: ["", "$"]
	});

	var frFR = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["", "\xa0€"]
	});

	var heIL = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["₪", ""]
	});

	var huHU = locale({
	  decimal: ",",
	  thousands: "\xa0",
	  grouping: [3],
	  currency: ["", "\xa0Ft"]
	});

	var itIT = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["€", ""]
	});

	var jaJP = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["", "円"]
	});

	var koKR = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["₩", ""]
	});

	var mkMK = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["", "\xa0ден."]
	});

	var nlNL = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["€\xa0", ""]
	});

	var plPL = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["", "zł"]
	});

	var ptBR = locale({
	  decimal: ",",
	  thousands: ".",
	  grouping: [3],
	  currency: ["R$", ""]
	});

	var ruRU = locale({
	  decimal: ",",
	  thousands: "\xa0",
	  grouping: [3],
	  currency: ["", "\xa0руб."]
	});

	var svSE = locale({
	  decimal: ",",
	  thousands: "\xa0",
	  grouping: [3],
	  currency: ["", "SEK"]
	});

	var zhCN = locale({
	  decimal: ".",
	  thousands: ",",
	  grouping: [3],
	  currency: ["¥", ""]
	});

	function precisionFixed(step) {
	  return Math.max(0, -exponent(Math.abs(step)));
	};

	function precisionPrefix(step, value) {
	  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
	};

	function precisionRound(step, max) {
	  step = Math.abs(step), max = Math.abs(max) - step;
	  return Math.max(0, exponent(max) - exponent(step)) + 1;
	};

	var format = defaultLocale.format;
	var formatPrefix = defaultLocale.formatPrefix;

	function localDate(d) {
	  if (0 <= d.y && d.y < 100) {
	    var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
	    date.setFullYear(d.y);
	    return date;
	  }
	  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
	}

	function utcDate(d) {
	  if (0 <= d.y && d.y < 100) {
	    var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
	    date.setUTCFullYear(d.y);
	    return date;
	  }
	  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
	}

	function newYear(y) {
	  return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
	}

	function locale$1(locale) {
	  var locale_dateTime = locale.dateTime,
	      locale_date = locale.date,
	      locale_time = locale.time,
	      locale_periods = locale.periods,
	      locale_weekdays = locale.days,
	      locale_shortWeekdays = locale.shortDays,
	      locale_months = locale.months,
	      locale_shortMonths = locale.shortMonths;

	  var periodRe = formatRe(locale_periods),
	      periodLookup = formatLookup(locale_periods),
	      weekdayRe = formatRe(locale_weekdays),
	      weekdayLookup = formatLookup(locale_weekdays),
	      shortWeekdayRe = formatRe(locale_shortWeekdays),
	      shortWeekdayLookup = formatLookup(locale_shortWeekdays),
	      monthRe = formatRe(locale_months),
	      monthLookup = formatLookup(locale_months),
	      shortMonthRe = formatRe(locale_shortMonths),
	      shortMonthLookup = formatLookup(locale_shortMonths);

	  var formats = {
	    "a": formatShortWeekday,
	    "A": formatWeekday,
	    "b": formatShortMonth,
	    "B": formatMonth,
	    "c": null,
	    "d": formatDayOfMonth,
	    "e": formatDayOfMonth,
	    "H": formatHour24,
	    "I": formatHour12,
	    "j": formatDayOfYear,
	    "L": formatMilliseconds,
	    "m": formatMonthNumber,
	    "M": formatMinutes,
	    "p": formatPeriod,
	    "S": formatSeconds,
	    "U": formatWeekNumberSunday,
	    "w": formatWeekdayNumber,
	    "W": formatWeekNumberMonday,
	    "x": null,
	    "X": null,
	    "y": formatYear,
	    "Y": formatFullYear,
	    "Z": formatZone,
	    "%": formatLiteralPercent
	  };

	  var utcFormats = {
	    "a": formatUTCShortWeekday,
	    "A": formatUTCWeekday,
	    "b": formatUTCShortMonth,
	    "B": formatUTCMonth,
	    "c": null,
	    "d": formatUTCDayOfMonth,
	    "e": formatUTCDayOfMonth,
	    "H": formatUTCHour24,
	    "I": formatUTCHour12,
	    "j": formatUTCDayOfYear,
	    "L": formatUTCMilliseconds,
	    "m": formatUTCMonthNumber,
	    "M": formatUTCMinutes,
	    "p": formatUTCPeriod,
	    "S": formatUTCSeconds,
	    "U": formatUTCWeekNumberSunday,
	    "w": formatUTCWeekdayNumber,
	    "W": formatUTCWeekNumberMonday,
	    "x": null,
	    "X": null,
	    "y": formatUTCYear,
	    "Y": formatUTCFullYear,
	    "Z": formatUTCZone,
	    "%": formatLiteralPercent
	  };

	  var parses = {
	    "a": parseShortWeekday,
	    "A": parseWeekday,
	    "b": parseShortMonth,
	    "B": parseMonth,
	    "c": parseLocaleDateTime,
	    "d": parseDayOfMonth,
	    "e": parseDayOfMonth,
	    "H": parseHour24,
	    "I": parseHour24,
	    "j": parseDayOfYear,
	    "L": parseMilliseconds,
	    "m": parseMonthNumber,
	    "M": parseMinutes,
	    "p": parsePeriod,
	    "S": parseSeconds,
	    "U": parseWeekNumberSunday,
	    "w": parseWeekdayNumber,
	    "W": parseWeekNumberMonday,
	    "x": parseLocaleDate,
	    "X": parseLocaleTime,
	    "y": parseYear,
	    "Y": parseFullYear,
	    "Z": parseZone,
	    "%": parseLiteralPercent
	  };

	  // These recursive directive definitions must be deferred.
	  formats.x = newFormat(locale_date, formats);
	  formats.X = newFormat(locale_time, formats);
	  formats.c = newFormat(locale_dateTime, formats);
	  utcFormats.x = newFormat(locale_date, utcFormats);
	  utcFormats.X = newFormat(locale_time, utcFormats);
	  utcFormats.c = newFormat(locale_dateTime, utcFormats);

	  function newFormat(specifier, formats) {
	    return function(date) {
	      var string = [],
	          i = -1,
	          j = 0,
	          n = specifier.length,
	          c,
	          pad,
	          format;

	      if (!(date instanceof Date)) date = new Date(+date);

	      while (++i < n) {
	        if (specifier.charCodeAt(i) === 37) {
	          string.push(specifier.slice(j, i));
	          if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
	          else pad = c === "e" ? " " : "0";
	          if (format = formats[c]) c = format(date, pad);
	          string.push(c);
	          j = i + 1;
	        }
	      }

	      string.push(specifier.slice(j, i));
	      return string.join("");
	    };
	  }

	  function newParse(specifier, newDate) {
	    return function(string) {
	      var d = newYear(1900),
	          i = parseSpecifier(d, specifier, string += "", 0);
	      if (i != string.length) return null;

	      // The am-pm flag is 0 for AM, and 1 for PM.
	      if ("p" in d) d.H = d.H % 12 + d.p * 12;

	      // Convert day-of-week and week-of-year to day-of-year.
	      if ("W" in d || "U" in d) {
	        if (!("w" in d)) d.w = "W" in d ? 1 : 0;
	        var day = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
	        d.m = 0;
	        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
	      }

	      // If a time zone is specified, all fields are interpreted as UTC and then
	      // offset according to the specified time zone.
	      if ("Z" in d) {
	        d.H += d.Z / 100 | 0;
	        d.M += d.Z % 100;
	        return utcDate(d);
	      }

	      // Otherwise, all fields are in local time.
	      return newDate(d);
	    };
	  }

	  function parseSpecifier(d, specifier, string, j) {
	    var i = 0,
	        n = specifier.length,
	        m = string.length,
	        c,
	        parse;

	    while (i < n) {
	      if (j >= m) return -1;
	      c = specifier.charCodeAt(i++);
	      if (c === 37) {
	        c = specifier.charAt(i++);
	        parse = parses[c in pads ? specifier.charAt(i++) : c];
	        if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
	      } else if (c != string.charCodeAt(j++)) {
	        return -1;
	      }
	    }

	    return j;
	  }

	  function parsePeriod(d, string, i) {
	    var n = periodRe.exec(string.slice(i));
	    return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseShortWeekday(d, string, i) {
	    var n = shortWeekdayRe.exec(string.slice(i));
	    return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseWeekday(d, string, i) {
	    var n = weekdayRe.exec(string.slice(i));
	    return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseShortMonth(d, string, i) {
	    var n = shortMonthRe.exec(string.slice(i));
	    return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseMonth(d, string, i) {
	    var n = monthRe.exec(string.slice(i));
	    return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
	  }

	  function parseLocaleDateTime(d, string, i) {
	    return parseSpecifier(d, locale_dateTime, string, i);
	  }

	  function parseLocaleDate(d, string, i) {
	    return parseSpecifier(d, locale_date, string, i);
	  }

	  function parseLocaleTime(d, string, i) {
	    return parseSpecifier(d, locale_time, string, i);
	  }

	  function formatShortWeekday(d) {
	    return locale_shortWeekdays[d.getDay()];
	  }

	  function formatWeekday(d) {
	    return locale_weekdays[d.getDay()];
	  }

	  function formatShortMonth(d) {
	    return locale_shortMonths[d.getMonth()];
	  }

	  function formatMonth(d) {
	    return locale_months[d.getMonth()];
	  }

	  function formatPeriod(d) {
	    return locale_periods[+(d.getHours() >= 12)];
	  }

	  function formatUTCShortWeekday(d) {
	    return locale_shortWeekdays[d.getUTCDay()];
	  }

	  function formatUTCWeekday(d) {
	    return locale_weekdays[d.getUTCDay()];
	  }

	  function formatUTCShortMonth(d) {
	    return locale_shortMonths[d.getUTCMonth()];
	  }

	  function formatUTCMonth(d) {
	    return locale_months[d.getUTCMonth()];
	  }

	  function formatUTCPeriod(d) {
	    return locale_periods[+(d.getUTCHours() >= 12)];
	  }

	  return {
	    format: function(specifier) {
	      var f = newFormat(specifier += "", formats);
	      f.toString = function() { return specifier; };
	      return f;
	    },
	    parse: function(specifier) {
	      var p = newParse(specifier += "", localDate);
	      p.toString = function() { return specifier; };
	      return p;
	    },
	    utcFormat: function(specifier) {
	      var f = newFormat(specifier += "", utcFormats);
	      f.toString = function() { return specifier; };
	      return f;
	    },
	    utcParse: function(specifier) {
	      var p = newParse(specifier, utcDate);
	      p.toString = function() { return specifier; };
	      return p;
	    }
	  };
	};

	var pads = {"-": "", "_": " ", "0": "0"};
	var numberRe = /^\s*\d+/;
	var percentRe = /^%/;
	var requoteRe = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
	function pad(value, fill, width) {
	  var sign = value < 0 ? "-" : "",
	      string = (sign ? -value : value) + "",
	      length = string.length;
	  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
	}

	function requote(s) {
	  return s.replace(requoteRe, "\\$&");
	}

	function formatRe(names) {
	  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
	}

	function formatLookup(names) {
	  var map = {}, i = -1, n = names.length;
	  while (++i < n) map[names[i].toLowerCase()] = i;
	  return map;
	}

	function parseWeekdayNumber(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 1));
	  return n ? (d.w = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberSunday(d, string, i) {
	  var n = numberRe.exec(string.slice(i));
	  return n ? (d.U = +n[0], i + n[0].length) : -1;
	}

	function parseWeekNumberMonday(d, string, i) {
	  var n = numberRe.exec(string.slice(i));
	  return n ? (d.W = +n[0], i + n[0].length) : -1;
	}

	function parseFullYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 4));
	  return n ? (d.y = +n[0], i + n[0].length) : -1;
	}

	function parseYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
	}

	function parseZone(d, string, i) {
	  var n = /^(Z)|([+-]\d\d)(?:\:?(\d\d))?/.exec(string.slice(i, i + 6));
	  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
	}

	function parseMonthNumber(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
	}

	function parseDayOfMonth(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.d = +n[0], i + n[0].length) : -1;
	}

	function parseDayOfYear(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 3));
	  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
	}

	function parseHour24(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.H = +n[0], i + n[0].length) : -1;
	}

	function parseMinutes(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.M = +n[0], i + n[0].length) : -1;
	}

	function parseSeconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 2));
	  return n ? (d.S = +n[0], i + n[0].length) : -1;
	}

	function parseMilliseconds(d, string, i) {
	  var n = numberRe.exec(string.slice(i, i + 3));
	  return n ? (d.L = +n[0], i + n[0].length) : -1;
	}

	function parseLiteralPercent(d, string, i) {
	  var n = percentRe.exec(string.slice(i, i + 1));
	  return n ? i + n[0].length : -1;
	}

	function formatDayOfMonth(d, p) {
	  return pad(d.getDate(), p, 2);
	}

	function formatHour24(d, p) {
	  return pad(d.getHours(), p, 2);
	}

	function formatHour12(d, p) {
	  return pad(d.getHours() % 12 || 12, p, 2);
	}

	function formatDayOfYear(d, p) {
	  return pad(1 + timeDay.count(timeYear(d), d), p, 3);
	}

	function formatMilliseconds(d, p) {
	  return pad(d.getMilliseconds(), p, 3);
	}

	function formatMonthNumber(d, p) {
	  return pad(d.getMonth() + 1, p, 2);
	}

	function formatMinutes(d, p) {
	  return pad(d.getMinutes(), p, 2);
	}

	function formatSeconds(d, p) {
	  return pad(d.getSeconds(), p, 2);
	}

	function formatWeekNumberSunday(d, p) {
	  return pad(timeSunday.count(timeYear(d), d), p, 2);
	}

	function formatWeekdayNumber(d) {
	  return d.getDay();
	}

	function formatWeekNumberMonday(d, p) {
	  return pad(timeMonday.count(timeYear(d), d), p, 2);
	}

	function formatYear(d, p) {
	  return pad(d.getFullYear() % 100, p, 2);
	}

	function formatFullYear(d, p) {
	  return pad(d.getFullYear() % 10000, p, 4);
	}

	function formatZone(d) {
	  var z = d.getTimezoneOffset();
	  return (z > 0 ? "-" : (z *= -1, "+"))
	      + pad(z / 60 | 0, "0", 2)
	      + pad(z % 60, "0", 2);
	}

	function formatUTCDayOfMonth(d, p) {
	  return pad(d.getUTCDate(), p, 2);
	}

	function formatUTCHour24(d, p) {
	  return pad(d.getUTCHours(), p, 2);
	}

	function formatUTCHour12(d, p) {
	  return pad(d.getUTCHours() % 12 || 12, p, 2);
	}

	function formatUTCDayOfYear(d, p) {
	  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
	}

	function formatUTCMilliseconds(d, p) {
	  return pad(d.getUTCMilliseconds(), p, 3);
	}

	function formatUTCMonthNumber(d, p) {
	  return pad(d.getUTCMonth() + 1, p, 2);
	}

	function formatUTCMinutes(d, p) {
	  return pad(d.getUTCMinutes(), p, 2);
	}

	function formatUTCSeconds(d, p) {
	  return pad(d.getUTCSeconds(), p, 2);
	}

	function formatUTCWeekNumberSunday(d, p) {
	  return pad(utcSunday.count(utcYear(d), d), p, 2);
	}

	function formatUTCWeekdayNumber(d) {
	  return d.getUTCDay();
	}

	function formatUTCWeekNumberMonday(d, p) {
	  return pad(utcMonday.count(utcYear(d), d), p, 2);
	}

	function formatUTCYear(d, p) {
	  return pad(d.getUTCFullYear() % 100, p, 2);
	}

	function formatUTCFullYear(d, p) {
	  return pad(d.getUTCFullYear() % 10000, p, 4);
	}

	function formatUTCZone() {
	  return "+0000";
	}

	function formatLiteralPercent() {
	  return "%";
	}

	var locale$2 = locale$1({
	  dateTime: "%a %b %e %X %Y",
	  date: "%m/%d/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	});

	var caES$1 = locale$1({
	  dateTime: "%A, %e de %B de %Y, %X",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"],
	  shortDays: ["dg.", "dl.", "dt.", "dc.", "dj.", "dv.", "ds."],
	  months: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
	  shortMonths: ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."]
	});

	var deCH$1 = locale$1({
	  dateTime: "%A, der %e. %B %Y, %X",
	  date: "%d.%m.%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"], // unused
	  days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
	  shortDays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
	  months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
	  shortMonths: ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
	});

	var deDE$1 = locale$1({
	  dateTime: "%A, der %e. %B %Y, %X",
	  date: "%d.%m.%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"], // unused
	  days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
	  shortDays: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
	  months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
	  shortMonths: ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
	});

	var enCA$1 = locale$1({
	  dateTime: "%a %b %e %X %Y",
	  date: "%Y-%m-%d",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	});

	var enGB$1 = locale$1({
	  dateTime: "%a %e %b %X %Y",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
	  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
	  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	});

	var esES$1 = locale$1({
	  dateTime: "%A, %e de %B de %Y, %X",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
	  shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
	  months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
	  shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
	});

	var fiFI$1 = locale$1({
	  dateTime: "%A, %-d. %Bta %Y klo %X",
	  date: "%-d.%-m.%Y",
	  time: "%H:%M:%S",
	  periods: ["a.m.", "p.m."],
	  days: ["sunnuntai", "maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai"],
	  shortDays: ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"],
	  months: ["tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu", "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu"],
	  shortMonths: ["Tammi", "Helmi", "Maalis", "Huhti", "Touko", "Kesä", "Heinä", "Elo", "Syys", "Loka", "Marras", "Joulu"]
	});

	var frCA$1 = locale$1({
	  dateTime: "%a %e %b %Y %X",
	  date: "%Y-%m-%d",
	  time: "%H:%M:%S",
	  periods: ["", ""],
	  days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
	  shortDays: ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
	  months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
	  shortMonths: ["jan", "fév", "mar", "avr", "mai", "jui", "jul", "aoû", "sep", "oct", "nov", "déc"]
	});

	var frFR$1 = locale$1({
	  dateTime: "%A, le %e %B %Y, %X",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"], // unused
	  days: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
	  shortDays: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."],
	  months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
	  shortMonths: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
	});

	var heIL$1 = locale$1({
	  dateTime: "%A, %e ב%B %Y %X",
	  date: "%d.%m.%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
	  shortDays: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"],
	  months: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
	  shortMonths: ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"]
	});

	var huHU$1 = locale$1({
	  dateTime: "%Y. %B %-e., %A %X",
	  date: "%Y. %m. %d.",
	  time: "%H:%M:%S",
	  periods: ["de.", "du."], // unused
	  days: ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"],
	  shortDays: ["V", "H", "K", "Sze", "Cs", "P", "Szo"],
	  months: ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"],
	  shortMonths: ["jan.", "feb.", "már.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."]
	});

	var itIT$1 = locale$1({
	  dateTime: "%A %e %B %Y, %X",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"], // unused
	  days: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
	  shortDays: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
	  months: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
	  shortMonths: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
	});

	var jaJP$1 = locale$1({
	  dateTime: "%Y %b %e %a %X",
	  date: "%Y/%m/%d",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
	  shortDays: ["日", "月", "火", "水", "木", "金", "土"],
	  months: ["睦月", "如月", "弥生", "卯月", "皐月", "水無月", "文月", "葉月", "長月", "神無月", "霜月", "師走"],
	  shortMonths: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
	});

	var koKR$1 = locale$1({
	  dateTime: "%Y/%m/%d %a %X",
	  date: "%Y/%m/%d",
	  time: "%H:%M:%S",
	  periods: ["오전", "오후"],
	  days: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
	  shortDays: ["일", "월", "화", "수", "목", "금", "토"],
	  months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
	  shortMonths: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
	});

	var mkMK$1 = locale$1({
	  dateTime: "%A, %e %B %Y г. %X",
	  date: "%d.%m.%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["недела", "понеделник", "вторник", "среда", "четврток", "петок", "сабота"],
	  shortDays: ["нед", "пон", "вто", "сре", "чет", "пет", "саб"],
	  months: ["јануари", "февруари", "март", "април", "мај", "јуни", "јули", "август", "септември", "октомври", "ноември", "декември"],
	  shortMonths: ["јан", "фев", "мар", "апр", "мај", "јун", "јул", "авг", "сеп", "окт", "ное", "дек"]
	});

	var nlNL$1 = locale$1({
	  dateTime: "%a %e %B %Y %T",
	  date: "%d-%m-%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"], // unused
	  days: ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"],
	  shortDays: ["zo", "ma", "di", "wo", "do", "vr", "za"],
	  months: ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"],
	  shortMonths: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
	});

	var plPL$1 = locale$1({
	  dateTime: "%A, %e %B %Y, %X",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"], // unused
	  days: ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"],
	  shortDays: ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."],
	  months: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
	  shortMonths: ["Stycz.", "Luty", "Marz.", "Kwie.", "Maj", "Czerw.", "Lipc.", "Sierp.", "Wrz.", "Paźdz.", "Listop.", "Grudz."]/* In Polish language abbraviated months are not commonly used so there is a dispute about the proper abbraviations. */
	});

	var ptBR$1 = locale$1({
	  dateTime: "%A, %e de %B de %Y. %X",
	  date: "%d/%m/%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
	  shortDays: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
	  months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
	  shortMonths: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
	});

	var ruRU$1 = locale$1({
	  dateTime: "%A, %e %B %Y г. %X",
	  date: "%d.%m.%Y",
	  time: "%H:%M:%S",
	  periods: ["AM", "PM"],
	  days: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
	  shortDays: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
	  months: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
	  shortMonths: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
	});

	var svSE$1 = locale$1({
	  dateTime: "%A den %d %B %Y %X",
	  date: "%Y-%m-%d",
	  time: "%H:%M:%S",
	  periods: ["fm", "em"],
	  days: ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"],
	  shortDays: ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"],
	  months: ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"],
	  shortMonths: ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]
	});

	var zhCN$1 = locale$1({
	  dateTime: "%a %b %e %X %Y",
	  date: "%Y/%-m/%-d",
	  time: "%H:%M:%S",
	  periods: ["上午", "下午"],
	  days: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
	  shortDays: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
	  months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
	  shortMonths: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
	});

	var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

	function formatIsoNative(date) {
	  return date.toISOString();
	}

	var formatIso = Date.prototype.toISOString
	    ? formatIsoNative
	    : locale$2.utcFormat(isoSpecifier);

	function parseIsoNative(string) {
	  var date = new Date(string);
	  return isNaN(date) ? null : date;
	}

	var parseIso = +new Date("2000-01-01T00:00:00.000Z")
	    ? parseIsoNative
	    : locale$2.utcParse(isoSpecifier);

	var timeFormat = locale$2.format;
	var timeParse = locale$2.parse;
	var utcFormat = locale$2.utcFormat;
	var utcParse = locale$2.utcParse;

	var array$1 = Array.prototype;

	var map$1 = array$1.map;
	var slice$3 = array$1.slice;

	var implicit = {name: "implicit"};

	function ordinal() {
	  var index = map(),
	      domain = [],
	      range = [],
	      unknown = implicit;

	  function scale(d) {
	    var key = d + "", i = index.get(key);
	    if (!i) {
	      if (unknown !== implicit) return unknown;
	      index.set(key, i = domain.push(d));
	    }
	    return range[(i - 1) % range.length];
	  }

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [], index = map();
	    var i = -1, n = _.length, d, key;
	    while (++i < n) if (!index.has(key = (d = _[i]) + "")) index.set(key, domain.push(d));
	    return scale;
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = slice$3.call(_), scale) : range.slice();
	  };

	  scale.unknown = function(_) {
	    return arguments.length ? (unknown = _, scale) : unknown;
	  };

	  scale.copy = function() {
	    return ordinal()
	        .domain(domain)
	        .range(range)
	        .unknown(unknown);
	  };

	  return scale;
	};

	function band() {
	  var scale = ordinal().unknown(undefined),
	      domain = scale.domain,
	      ordinalRange = scale.range,
	      range = [0, 1],
	      step,
	      bandwidth,
	      round = false,
	      paddingInner = 0,
	      paddingOuter = 0,
	      align = 0.5;

	  delete scale.unknown;

	  function rescale() {
	    var n = domain().length,
	        reverse = range[1] < range[0],
	        start = range[reverse - 0],
	        stop = range[1 - reverse];
	    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
	    if (round) step = Math.floor(step);
	    start += (stop - start - step * (n - paddingInner)) * align;
	    bandwidth = step * (1 - paddingInner);
	    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
	    var values = sequence(n).map(function(i) { return start + step * i; });
	    return ordinalRange(reverse ? values.reverse() : values);
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (domain(_), rescale()) : domain();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = [+_[0], +_[1]], rescale()) : range.slice();
	  };

	  scale.rangeRound = function(_) {
	    return range = [+_[0], +_[1]], round = true, rescale();
	  };

	  scale.bandwidth = function() {
	    return bandwidth;
	  };

	  scale.step = function() {
	    return step;
	  };

	  scale.round = function(_) {
	    return arguments.length ? (round = !!_, rescale()) : round;
	  };

	  scale.padding = function(_) {
	    return arguments.length ? (paddingInner = paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
	  };

	  scale.paddingInner = function(_) {
	    return arguments.length ? (paddingInner = Math.max(0, Math.min(1, _)), rescale()) : paddingInner;
	  };

	  scale.paddingOuter = function(_) {
	    return arguments.length ? (paddingOuter = Math.max(0, Math.min(1, _)), rescale()) : paddingOuter;
	  };

	  scale.align = function(_) {
	    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
	  };

	  scale.copy = function() {
	    return band()
	        .domain(domain())
	        .range(range)
	        .round(round)
	        .paddingInner(paddingInner)
	        .paddingOuter(paddingOuter)
	        .align(align);
	  };

	  return rescale();
	};

	function pointish(scale) {
	  var copy = scale.copy;

	  scale.padding = scale.paddingOuter;
	  delete scale.paddingInner;
	  delete scale.paddingOuter;

	  scale.copy = function() {
	    return pointish(copy());
	  };

	  return scale;
	}

	function point() {
	  return pointish(band().paddingInner(1));
	};

	function constant$2(x) {
	  return function() {
	    return x;
	  };
	};

	function number$2(x) {
	  return +x;
	};

	var unit = [0, 1];

	function deinterpolateLinear(a, b) {
	  return (b -= (a = +a))
	      ? function(x) { return (x - a) / b; }
	      : constant$2(b);
	};

	function deinterpolateClamp(deinterpolate) {
	  return function(a, b) {
	    var d = deinterpolate(a = +a, b = +b);
	    return function(x) { return x <= a ? 0 : x >= b ? 1 : d(x); };
	  };
	}

	function reinterpolateClamp(reinterpolate) {
	  return function(a, b) {
	    var r = reinterpolate(a = +a, b = +b);
	    return function(t) { return t <= 0 ? a : t >= 1 ? b : r(t); };
	  };
	}

	function bimap(domain, range, deinterpolate, reinterpolate) {
	  var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
	  if (d1 < d0) d0 = deinterpolate(d1, d0), r0 = reinterpolate(r1, r0);
	  else d0 = deinterpolate(d0, d1), r0 = reinterpolate(r0, r1);
	  return function(x) { return r0(d0(x)); };
	}

	function polymap(domain, range, deinterpolate, reinterpolate) {
	  var j = Math.min(domain.length, range.length) - 1,
	      d = new Array(j),
	      r = new Array(j),
	      i = -1;

	  // Reverse descending domains.
	  if (domain[j] < domain[0]) {
	    domain = domain.slice().reverse();
	    range = range.slice().reverse();
	  }

	  while (++i < j) {
	    d[i] = deinterpolate(domain[i], domain[i + 1]);
	    r[i] = reinterpolate(range[i], range[i + 1]);
	  }

	  return function(x) {
	    var i = bisectRight(domain, x, 1, j) - 1;
	    return r[i](d[i](x));
	  };
	}

	function copy(source, target) {
	  return target
	      .domain(source.domain())
	      .range(source.range())
	      .interpolate(source.interpolate())
	      .clamp(source.clamp());
	};

	// deinterpolate(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
	// reinterpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding domain value x in [a,b].
	function continuous(deinterpolate, reinterpolate) {
	  var domain = unit,
	      range = unit,
	      interpolate = interpolateValue,
	      clamp = false,
	      output,
	      input;

	  function rescale() {
	    var map = Math.min(domain.length, range.length) > 2 ? polymap : bimap;
	    output = map(domain, range, clamp ? deinterpolateClamp(deinterpolate) : deinterpolate, interpolate);
	    input = map(range, domain, deinterpolateLinear, clamp ? reinterpolateClamp(reinterpolate) : reinterpolate);
	    return scale;
	  }

	  function scale(x) {
	    return output(+x);
	  }

	  scale.invert = function(y) {
	    return input(+y);
	  };

	  scale.domain = function(_) {
	    return arguments.length ? (domain = map$1.call(_, number$2), rescale()) : domain.slice();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = slice$3.call(_), rescale()) : range.slice();
	  };

	  scale.rangeRound = function(_) {
	    return range = slice$3.call(_), interpolate = interpolateRound, rescale();
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = !!_, rescale()) : clamp;
	  };

	  scale.interpolate = function(_) {
	    return arguments.length ? (interpolate = interpolateBind.apply(null, arguments), rescale()) : interpolate;
	  };

	  return rescale();
	};

	function tickFormat(domain, count, specifier) {
	  var start = domain[0],
	      stop = domain[domain.length - 1],
	      step = tickStep(start, stop, count == null ? 10 : count),
	      precision;
	  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
	  switch (specifier.type) {
	    case "s": {
	      var value = Math.max(Math.abs(start), Math.abs(stop));
	      if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
	      return formatPrefix(specifier, value);
	    }
	    case "":
	    case "e":
	    case "g":
	    case "p":
	    case "r": {
	      if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
	      break;
	    }
	    case "f":
	    case "%": {
	      if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
	      break;
	    }
	  }
	  return format(specifier);
	};

	function linearish(scale) {
	  var domain = scale.domain;

	  scale.ticks = function(count) {
	    var d = domain();
	    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
	  };

	  scale.tickFormat = function(count, specifier) {
	    return tickFormat(domain(), count, specifier);
	  };

	  scale.nice = function(count) {
	    var d = domain(),
	        i = d.length - 1,
	        n = count == null ? 10 : count,
	        start = d[0],
	        stop = d[i],
	        step = tickStep(start, stop, n);

	    if (step) {
	      step = tickStep(Math.floor(start / step) * step, Math.ceil(stop / step) * step, n);
	      d[0] = Math.floor(start / step) * step;
	      d[i] = Math.ceil(stop / step) * step;
	      domain(d);
	    }

	    return scale;
	  };

	  return scale;
	};

	function linear() {
	  var scale = continuous(deinterpolateLinear, reinterpolate);

	  scale.copy = function() {
	    return copy(scale, linear());
	  };

	  return linearish(scale);
	};

	function identity$2() {
	  var domain = [0, 1];

	  function scale(x) {
	    return +x;
	  }

	  scale.invert = scale;

	  scale.domain = scale.range = function(_) {
	    return arguments.length ? (domain = map$1.call(_, number$2), scale) : domain.slice();
	  };

	  scale.copy = function() {
	    return identity$2().domain(domain);
	  };

	  return linearish(scale);
	};

	function nice(domain, interval) {
	  domain = domain.slice();

	  var i0 = 0,
	      i1 = domain.length - 1,
	      x0 = domain[i0],
	      x1 = domain[i1],
	      t;

	  if (x1 < x0) {
	    t = i0, i0 = i1, i1 = t;
	    t = x0, x0 = x1, x1 = t;
	  }

	  domain[i0] = interval.floor(x0);
	  domain[i1] = interval.ceil(x1);
	  return domain;
	};

	var tickFormat10 = format(".0e");
	var tickFormatOther = format(",");
	function deinterpolate(a, b) {
	  return (b = Math.log(b / a))
	      ? function(x) { return Math.log(x / a) / b; }
	      : constant$2(b);
	}

	function reinterpolate$1(a, b) {
	  return a < 0
	      ? function(t) { return -Math.pow(-b, t) * Math.pow(-a, 1 - t); }
	      : function(t) { return Math.pow(b, t) * Math.pow(a, 1 - t); };
	}

	function pow10(x) {
	  return isFinite(x) ? +("1e" + x) : x < 0 ? 0 : x;
	}

	function powp(base) {
	  return base === 10 ? pow10
	      : base === Math.E ? Math.exp
	      : function(x) { return Math.pow(base, x); };
	}

	function logp(base) {
	  return base === Math.E ? Math.log
	      : base === 10 && Math.log10
	      || base === 2 && Math.log2
	      || (base = Math.log(base), function(x) { return Math.log(x) / base; });
	}

	function reflect(f) {
	  return function(x) {
	    return -f(-x);
	  };
	}

	function log() {
	  var scale = continuous(deinterpolate, reinterpolate$1).domain([1, 10]),
	      domain = scale.domain,
	      base = 10,
	      logs = logp(10),
	      pows = powp(10);

	  function rescale() {
	    logs = logp(base), pows = powp(base);
	    if (domain()[0] < 0) logs = reflect(logs), pows = reflect(pows);
	    return scale;
	  }

	  scale.base = function(_) {
	    return arguments.length ? (base = +_, rescale()) : base;
	  };

	  scale.domain = function(_) {
	    return arguments.length ? (domain(_), rescale()) : domain();
	  };

	  scale.ticks = function(count) {
	    var d = domain(),
	        u = d[0],
	        v = d[d.length - 1],
	        r;

	    if (r = v < u) i = u, u = v, v = i;

	    var i = logs(u),
	        j = logs(v),
	        p,
	        k,
	        t,
	        n = count == null ? 10 : +count,
	        z = [];

	    if (!(base % 1) && j - i < n) {
	      i = Math.round(i) - 1, j = Math.round(j) + 1;
	      if (u > 0) for (; i < j; ++i) {
	        for (k = 1, p = pows(i); k < base; ++k) {
	          t = p * k;
	          if (t < u) continue;
	          if (t > v) break;
	          z.push(t);
	        }
	      } else for (; i < j; ++i) {
	        for (k = base - 1, p = pows(i); k >= 1; --k) {
	          t = p * k;
	          if (t < u) continue;
	          if (t > v) break;
	          z.push(t);
	        }
	      }
	      if (r) z.reverse();
	    } else {
	      z = ticks(i, j, Math.min(j - i, n)).map(pows);
	    }

	    return z;
	  };

	  scale.tickFormat = function(count, specifier) {
	    if (specifier == null) specifier = base === 10 ? tickFormat10 : tickFormatOther;
	    else if (typeof specifier !== "function") specifier = format(specifier);
	    if (count == null) return specifier;
	    var k = Math.max(1, base * count / scale.ticks().length); // TODO fast estimate?
	    return function(d) {
	      var i = d / pows(Math.round(logs(d)));
	      if (i * base < base - 0.5) i *= base;
	      return i <= k ? specifier(d) : "";
	    };
	  };

	  scale.nice = function() {
	    return domain(nice(domain(), {
	      floor: function(x) { return pows(Math.floor(logs(x))); },
	      ceil: function(x) { return pows(Math.ceil(logs(x))); }
	    }));
	  };

	  scale.copy = function() {
	    return copy(scale, log().base(base));
	  };

	  return scale;
	};

	function raise(x, exponent) {
	  return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
	}

	function pow() {
	  var exponent = 1,
	      scale = continuous(deinterpolate, reinterpolate),
	      domain = scale.domain;

	  function deinterpolate(a, b) {
	    return (b = raise(b, exponent) - (a = raise(a, exponent)))
	        ? function(x) { return (raise(x, exponent) - a) / b; }
	        : constant$2(b);
	  }

	  function reinterpolate(a, b) {
	    b = raise(b, exponent) - (a = raise(a, exponent));
	    return function(t) { return raise(a + b * t, 1 / exponent); };
	  }

	  scale.exponent = function(_) {
	    return arguments.length ? (exponent = +_, domain(domain())) : exponent;
	  };

	  scale.copy = function() {
	    return copy(scale, pow().exponent(exponent));
	  };

	  return linearish(scale);
	};

	function sqrt() {
	  return pow().exponent(0.5);
	};

	function quantile$1() {
	  var domain = [],
	      range = [],
	      thresholds = [];

	  function rescale() {
	    var i = 0, n = Math.max(1, range.length);
	    thresholds = new Array(n - 1);
	    while (++i < n) thresholds[i - 1] = quantile(domain, i / n);
	    return scale;
	  }

	  function scale(x) {
	    if (!isNaN(x = +x)) return range[bisectRight(thresholds, x)];
	  }

	  scale.invertExtent = function(y) {
	    var i = range.indexOf(y);
	    return i < 0 ? [NaN, NaN] : [
	      i > 0 ? thresholds[i - 1] : domain[0],
	      i < thresholds.length ? thresholds[i] : domain[domain.length - 1]
	    ];
	  };

	  scale.domain = function(_) {
	    if (!arguments.length) return domain.slice();
	    domain = [];
	    for (var i = 0, n = _.length, d; i < n; ++i) if (d = _[i], d != null && !isNaN(d = +d)) domain.push(d);
	    domain.sort(ascending);
	    return rescale();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = slice$3.call(_), rescale()) : range.slice();
	  };

	  scale.quantiles = function() {
	    return thresholds.slice();
	  };

	  scale.copy = function() {
	    return quantile$1()
	        .domain(domain)
	        .range(range);
	  };

	  return scale;
	};

	function quantize() {
	  var x0 = 0,
	      x1 = 1,
	      n = 1,
	      domain = [0.5],
	      range = [0, 1];

	  function scale(x) {
	    if (x <= x) return range[bisectRight(domain, x, 0, n)];
	  }

	  function rescale() {
	    var i = -1;
	    domain = new Array(n);
	    while (++i < n) domain[i] = ((i + 1) * x1 - (i - n) * x0) / (n + 1);
	    return scale;
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (x0 = +_[0], x1 = +_[1], rescale()) : [x0, x1];
	  };

	  scale.range = function(_) {
	    return arguments.length ? (n = (range = slice$3.call(_)).length - 1, rescale()) : range.slice();
	  };

	  scale.invertExtent = function(y) {
	    var i = range.indexOf(y);
	    return i < 0 ? [NaN, NaN]
	        : i < 1 ? [x0, domain[0]]
	        : i >= n ? [domain[n - 1], x1]
	        : [domain[i - 1], domain[i]];
	  };

	  scale.copy = function() {
	    return quantize()
	        .domain([x0, x1])
	        .range(range);
	  };

	  return linearish(scale);
	};

	function threshold() {
	  var domain = [0.5],
	      range = [0, 1],
	      n = 1;

	  function scale(x) {
	    if (x <= x) return range[bisectRight(domain, x, 0, n)];
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (domain = slice$3.call(_), n = Math.min(domain.length, range.length - 1), scale) : domain.slice();
	  };

	  scale.range = function(_) {
	    return arguments.length ? (range = slice$3.call(_), n = Math.min(domain.length, range.length - 1), scale) : range.slice();
	  };

	  scale.invertExtent = function(y) {
	    var i = range.indexOf(y);
	    return [domain[i - 1], domain[i]];
	  };

	  scale.copy = function() {
	    return threshold()
	        .domain(domain)
	        .range(range);
	  };

	  return scale;
	};

	var millisecondsPerSecond = 1000;
	var millisecondsPerMinute = millisecondsPerSecond * 60;
	var millisecondsPerHour = millisecondsPerMinute * 60;
	var millisecondsPerDay = millisecondsPerHour * 24;
	var millisecondsPerWeek = millisecondsPerDay * 7;
	var millisecondsPerMonth = millisecondsPerDay * 30;
	var millisecondsPerYear = millisecondsPerDay * 365;
	var bisectTickIntervals = bisector(function(method) { return method[2]; }).right;
	function newDate(t) {
	  return new Date(t);
	}

	function calendar(year, month, week, day, hour, minute, second, millisecond, format) {
	  var scale = continuous(deinterpolateLinear, reinterpolate),
	      invert = scale.invert,
	      domain = scale.domain;

	  var formatMillisecond = format(".%L"),
	      formatSecond = format(":%S"),
	      formatMinute = format("%I:%M"),
	      formatHour = format("%I %p"),
	      formatDay = format("%a %d"),
	      formatWeek = format("%b %d"),
	      formatMonth = format("%B"),
	      formatYear = format("%Y");

	  var tickIntervals = [
	    [second,  1,      millisecondsPerSecond],
	    [second,  5,  5 * millisecondsPerSecond],
	    [second, 15, 15 * millisecondsPerSecond],
	    [second, 30, 30 * millisecondsPerSecond],
	    [minute,  1,      millisecondsPerMinute],
	    [minute,  5,  5 * millisecondsPerMinute],
	    [minute, 15, 15 * millisecondsPerMinute],
	    [minute, 30, 30 * millisecondsPerMinute],
	    [  hour,  1,      millisecondsPerHour  ],
	    [  hour,  3,  3 * millisecondsPerHour  ],
	    [  hour,  6,  6 * millisecondsPerHour  ],
	    [  hour, 12, 12 * millisecondsPerHour  ],
	    [   day,  1,      millisecondsPerDay   ],
	    [   day,  2,  2 * millisecondsPerDay   ],
	    [  week,  1,      millisecondsPerWeek  ],
	    [ month,  1,      millisecondsPerMonth ],
	    [ month,  3,  3 * millisecondsPerMonth ],
	    [  year,  1,      millisecondsPerYear  ]
	  ];

	  function tickFormat(date) {
	    return (second(date) < date ? formatMillisecond
	        : minute(date) < date ? formatSecond
	        : hour(date) < date ? formatMinute
	        : day(date) < date ? formatHour
	        : month(date) < date ? (week(date) < date ? formatDay : formatWeek)
	        : year(date) < date ? formatMonth
	        : formatYear)(date);
	  }

	  function tickInterval(interval, start, stop, step) {
	    if (interval == null) interval = 10;

	    // If a desired tick count is specified, pick a reasonable tick interval
	    // based on the extent of the domain and a rough estimate of tick size.
	    // Otherwise, assume interval is already a time interval and use it.
	    if (typeof interval === "number") {
	      var target = Math.abs(stop - start) / interval,
	          i = bisectTickIntervals(tickIntervals, target);
	      if (i === tickIntervals.length) {
	        step = tickStep(start / millisecondsPerYear, stop / millisecondsPerYear, interval);
	        interval = year;
	      } else if (i) {
	        i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
	        step = i[1];
	        interval = i[0];
	      } else {
	        step = tickStep(start, stop, interval);
	        interval = millisecond;
	      }
	    }

	    return step == null ? interval : interval.every(step);
	  }

	  scale.invert = function(y) {
	    return new Date(invert(y));
	  };

	  scale.domain = function(_) {
	    return arguments.length ? domain(_) : domain().map(newDate);
	  };

	  scale.ticks = function(interval, step) {
	    var d = domain(),
	        t0 = d[0],
	        t1 = d[d.length - 1],
	        r = t1 < t0,
	        t;
	    if (r) t = t0, t0 = t1, t1 = t;
	    t = tickInterval(interval, t0, t1, step);
	    t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
	    return r ? t.reverse() : t;
	  };

	  scale.tickFormat = function(specifier) {
	    return specifier == null ? tickFormat : format(specifier);
	  };

	  scale.nice = function(interval, step) {
	    var d = domain();
	    return (interval = tickInterval(interval, d[0], d[d.length - 1], step))
	        ? domain(nice(d, interval))
	        : scale;
	  };

	  scale.copy = function() {
	    return copy(scale, calendar(year, month, week, day, hour, minute, second, millisecond, format));
	  };

	  return scale;
	};

	function time() {
	  return calendar(timeYear, timeMonth, timeSunday, timeDay, timeHour, timeMinute, timeSecond, millisecond, timeFormat).domain([new Date(2000, 0, 1), new Date(2000, 0, 2)]);
	};

	function utcTime() {
	  return calendar(utcYear, utcMonth, utcSunday, utcDay, utcHour, utcMinute, utcSecond, utcMillisecond, utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]);
	};

	function colors(s) {
	  return s.match(/.{6}/g).map(function(x) {
	    return "#" + x;
	  });
	};

	function category10() {
	  return ordinal().range(colors("1f77b4ff7f0e2ca02cd627289467bd8c564be377c27f7f7fbcbd2217becf"));
	};

	function category20b() {
	  return ordinal().range(colors("393b795254a36b6ecf9c9ede6379398ca252b5cf6bcedb9c8c6d31bd9e39e7ba52e7cb94843c39ad494ad6616be7969c7b4173a55194ce6dbdde9ed6"));
	};

	function category20c() {
	  return ordinal().range(colors("3182bd6baed69ecae1c6dbefe6550dfd8d3cfdae6bfdd0a231a35474c476a1d99bc7e9c0756bb19e9ac8bcbddcdadaeb636363969696bdbdbdd9d9d9"));
	};

	function category20() {
	  return ordinal().range(colors("1f77b4aec7e8ff7f0effbb782ca02c98df8ad62728ff98969467bdc5b0d58c564bc49c94e377c2f7b6d27f7f7fc7c7c7bcbd22dbdb8d17becf9edae5"));
	};

	function cubehelix$2() {
	  return linear()
	      .interpolate(interpolateCubehelixLong)
	      .range([cubehelix(300, 0.5, 0.0), cubehelix(-240, 0.5, 1.0)]);
	};

	function sequential(interpolate) {
	  var x0 = 0,
	      x1 = 1,
	      clamp = false;

	  function scale(x) {
	    var t = (x - x0) / (x1 - x0);
	    return interpolate(clamp ? Math.max(0, Math.min(1, t)) : t);
	  }

	  scale.domain = function(_) {
	    return arguments.length ? (x0 = +_[0], x1 = +_[1], scale) : [x0, x1];
	  };

	  scale.clamp = function(_) {
	    return arguments.length ? (clamp = !!_, scale) : clamp;
	  };

	  scale.copy = function() {
	    return sequential(interpolate).domain([x0, x1]).clamp(clamp);
	  };

	  return linearish(scale);
	};

	var a = cubehelix(-100, 0.75, 0.35);
	var b = cubehelix(80, 1.50, 0.8);
	var c = cubehelix(260, 0.75, 0.35);
	var d = cubehelix();
	var interpolateWarm = interpolateCubehelixLong(a, b);
	var interpolateCool = interpolateCubehelixLong(c, b);
	function interpolateRainbow(t) {
	  if (t < 0 || t > 1) t -= Math.floor(t);
	  var ts = Math.abs(t - 0.5);
	  d.h = 360 * t - 100;
	  d.s = 1.5 - 1.5 * ts;
	  d.l = 0.8 - 0.9 * ts;
	  return d + "";
	}

	function warm() {
	  return sequential(interpolateWarm);
	};

	function cool() {
	  return sequential(interpolateCool);
	};

	function rainbow() {
	  return sequential(interpolateRainbow);
	};

	var rangeViridis = colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725");
	var rangeMagma = colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf");
	var rangeInferno = colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4");
	var rangePlasma = colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921");
	function ramp(range) {
	  var s = sequential(function(t) { return range[Math.round(t * range.length - t)]; }).clamp(true);
	  delete s.clamp;
	  return s;
	}

	function viridis() {
	  return ramp(rangeViridis);
	};

	function magma() {
	  return ramp(rangeMagma);
	};

	function inferno() {
	  return ramp(rangeInferno);
	};

	function plasma() {
	  return ramp(rangePlasma);
	};

	var requoteRe$1 = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

	function requote$1(string) {
	  return string.replace(requoteRe$1, "\\$&");
	}

	function noop$1() {}

	var filterEvents = {};

	exports.event = null;

	if (typeof document !== "undefined") {
	  var element = document.documentElement;
	  if (!("onmouseenter" in element)) {
	    filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
	  }
	}

	function contextListener(listener, index, group) {
	  return function(event1) {
	    var event0 = exports.event; // Events can be reentrant (e.g., focus).
	    exports.event = event1;
	    try {
	      listener.call(this, this.__data__, index, group);
	    } finally {
	      exports.event = event0;
	    }
	  };
	}

	function filterListener(listener) {
	  return function(event) {
	    var related = event.relatedTarget;
	    if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
	      listener(event);
	    }
	  };
	}

	function onRemove(key, type) {
	  return function() {
	    var l = this[key];
	    if (l) {
	      this.removeEventListener(type, l, l._capture);
	      delete this[key];
	    }
	  };
	}

	function onRemoveAll(dotname) {
	  var re = new RegExp("^__on([^.]+)" + requote$1(dotname) + "$");
	  return function() {
	    for (var key in this) {
	      var match = key.match(re);
	      if (match) {
	        var l = this[key];
	        this.removeEventListener(match[1], l, l._capture);
	        delete this[key];
	      }
	    }
	  };
	}

	function onAdd(filter, key, type, listener, capture) {
	  return function(d, i, group) {
	    var value = this[key];
	    if (value) this.removeEventListener(type, value, value._capture);
	    value = contextListener(listener, i, group);
	    if (filter) value = filterListener(value);
	    value._listener = listener;
	    this.addEventListener(type, this[key] = value, value._capture = capture);
	  };
	}

	function selection_on(type, listener, capture) {
	  var value,
	      name = type + "",
	      key = "__on" + name,
	      filter;

	  if (arguments.length < 2) return (value = this.node()[key]) && value._listener;
	  if ((value = name.indexOf(".")) > 0) name = name.slice(0, value);
	  if (filter = filterEvents.hasOwnProperty(name)) name = filterEvents[name];

	  return this.each(listener
	      ? (value ? onAdd(filter, key, name, listener, capture == null ? false : capture) : noop$1) // Attempt to add untyped listener is ignored.
	      : (value ? onRemove(key, name) : onRemoveAll(name)));
	}

	function sourceEvent() {
	  var current = exports.event, source;
	  while (source = current.sourceEvent) current = source;
	  return current;
	}

	function defaultView(node) {
	  return node
	      && ((node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
	          || (node.document && node) // node is a Window
	          || node.defaultView); // node is a Document
	}

	function selector(selector) {
	  return function() {
	    return this.querySelector(selector);
	  };
	}

	function selection_select(select) {
	  if (typeof select !== "function") select = selector(select);

	  for (var groups = this._nodes, update = this._update, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
	      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
	        if ("__data__" in node) subnode.__data__ = node.__data__;
	        if (update) update._nodes[j][i] = subnode;
	        subgroup[i] = subnode;
	      }
	    }
	  }

	  return new Selection(subgroups, this._parents);
	}

	function selectorAll(selector) {
	  return function() {
	    return this.querySelectorAll(selector);
	  };
	}

	function selection_selectAll(select) {
	  if (typeof select !== "function") select = selectorAll(select);

	  for (var groups = this._nodes, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
	      if (node = group[i]) {
	        subgroups.push(select.call(node, node.__data__, i, group));
	        parents.push(node);
	      }
	    }
	  }

	  return new Selection(subgroups, parents);
	}

	var matcher = function(selector) {
	  return function() {
	    return this.matches(selector);
	  };
	};

	if (typeof document !== "undefined") {
	  var element$1 = document.documentElement;
	  if (!element$1.matches) {
	    var vendorMatches = element$1.webkitMatchesSelector
	        || element$1.msMatchesSelector
	        || element$1.mozMatchesSelector
	        || element$1.oMatchesSelector;
	    matcher = function(selector) {
	      return function() {
	        return vendorMatches.call(this, selector);
	      };
	    };
	  }
	}

	var matcher$1 = matcher;

	function selection_filter(match) {
	  if (typeof match !== "function") match = matcher$1(match);

	  for (var groups = this._nodes, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
	    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
	      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
	        subgroup.push(node);
	      }
	    }
	  }

	  return new Selection(subgroups, this._parents);
	}

	function arrayify(selection) {

	  for (var groups = selection._nodes, j = 0, m = groups.length; j < m; ++j) {
	    if (!Array.isArray(group = groups[j])) {
	      for (var n = group.length, array = groups[j] = new Array(n), group, i = 0; i < n; ++i) {
	        array[i] = group[i];
	      }
	    }
	  }

	  return groups;
	}

	function constant$4(x) {
	  return function() {
	    return x;
	  };
	}

	var keyPrefix = "$"; // Protect against keys like “__proto__”.

	function bindIndex(parent, update, enter, exit, data) {
	  var i = 0,
	      node,
	      nodeLength = update.length,
	      dataLength = data.length,
	      minLength = Math.min(nodeLength, dataLength);

	  // Clear the enter and exit arrays, and then initialize to the new length.
	  enter.length = 0, enter.length = dataLength;
	  exit.length = 0, exit.length = nodeLength;

	  for (; i < minLength; ++i) {
	    if (node = update[i]) {
	      node.__data__ = data[i];
	    } else {
	      enter[i] = new EnterNode(parent, data[i]);
	    }
	  }

	  // Note: we don’t need to delete update[i] here because this loop only
	  // runs when the data length is greater than the node length.
	  for (; i < dataLength; ++i) {
	    enter[i] = new EnterNode(parent, data[i]);
	  }

	  // Note: and, we don’t need to delete update[i] here because immediately
	  // following this loop we set the update length to data length.
	  for (; i < nodeLength; ++i) {
	    if (node = update[i]) {
	      exit[i] = update[i];
	    }
	  }

	  update.length = dataLength;
	}

	function bindKey(parent, update, enter, exit, data, key) {
	  var i,
	      node,
	      dataLength = data.length,
	      nodeLength = update.length,
	      nodeByKeyValue = {},
	      keyValues = new Array(nodeLength),
	      keyValue;

	  // Clear the enter and exit arrays, and then initialize to the new length.
	  enter.length = 0, enter.length = dataLength;
	  exit.length = 0, exit.length = nodeLength;

	  // Compute the keys for each node.
	  for (i = 0; i < nodeLength; ++i) {
	    if (node = update[i]) {
	      keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, update);

	      // Is this a duplicate of a key we’ve previously seen?
	      // If so, this node is moved to the exit selection.
	      if (nodeByKeyValue[keyValue]) {
	        exit[i] = node;
	      }

	      // Otherwise, record the mapping from key to node.
	      else {
	        nodeByKeyValue[keyValue] = node;
	      }
	    }
	  }

	  // Now clear the update array and initialize to the new length.
	  update.length = 0, update.length = dataLength;

	  // Compute the keys for each datum.
	  for (i = 0; i < dataLength; ++i) {
	    keyValue = keyPrefix + key.call(parent, data[i], i, data);

	    // Is there a node associated with this key?
	    // If not, this datum is added to the enter selection.
	    if (!(node = nodeByKeyValue[keyValue])) {
	      enter[i] = new EnterNode(parent, data[i]);
	    }

	    // Did we already bind a node using this key? (Or is a duplicate?)
	    // If unique, the node and datum are joined in the update selection.
	    // Otherwise, the datum is ignored, neither entering nor exiting.
	    else if (node !== true) {
	      update[i] = node;
	      node.__data__ = data[i];
	    }

	    // Record that we consumed this key, either to enter or update.
	    nodeByKeyValue[keyValue] = true;
	  }

	  // Take any remaining nodes that were not bound to data,
	  // and place them in the exit selection.
	  for (i = 0; i < nodeLength; ++i) {
	    if ((node = nodeByKeyValue[keyValues[i]]) !== true) {
	      exit[i] = node;
	    }
	  }
	}

	function selection_data(value, key) {
	  if (!value) {
	    var data = new Array(this.size()), i = -1;
	    this.each(function(d) { data[++i] = d; });
	    return data;
	  }

	  var bind = key ? bindKey : bindIndex,
	      parents = this._parents,
	      update = arrayify(this),
	      enter = (this._enter = this.enter())._nodes,
	      exit = (this._exit = this.exit())._nodes;

	  if (typeof value !== "function") value = constant$4(value);

	  for (var m = update.length, j = 0; j < m; ++j) {
	    var group = update[j],
	        parent = parents[j];

	    bind(parent, group, enter[j], exit[j], value.call(parent, parent && parent.__data__, j, parents), key);

	    // Now connect the enter nodes to their following update node, such that
	    // appendChild can insert the materialized enter node before this node,
	    // rather than at the end of the parent node.
	    for (var n = group.length, i0 = 0, i1 = 0, previous, next; i0 < n; ++i0) {
	      if (previous = enter[j][i0]) {
	        if (i0 >= i1) i1 = i0 + 1;
	        while (!(next = group[i1]) && ++i1 < n);
	        previous._next = next || null;
	      }
	    }
	  }

	  return this;
	}

	function EnterNode(parent, datum) {
	  this.ownerDocument = parent.ownerDocument;
	  this.namespaceURI = parent.namespaceURI;
	  this._next = null;
	  this._parent = parent;
	  this.__data__ = datum;
	}

	EnterNode.prototype = {
	  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
	  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
	  querySelector: function(selector) { return this._parent.querySelector(selector); },
	  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
	};

	function sparse(update) {
	  return new Array(update.length);
	}

	function selection_enter() {
	  var enter = this._enter;
	  if (enter) return this._enter = null, enter;
	  enter = new Selection(this._nodes.map(sparse), this._parents);
	  enter._update = this;
	  return enter;
	}

	function selection_exit() {
	  var exit = this._exit;
	  if (exit) return this._exit = null, exit;
	  return new Selection(this._nodes.map(sparse), this._parents);
	}

	function selection_order() {

	  for (var groups = this._nodes, j = -1, m = groups.length; ++j < m;) {
	    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
	      if (node = group[i]) {
	        if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
	        next = node;
	      }
	    }
	  }

	  return this;
	}

	function selection_sort(compare) {
	  if (!compare) compare = ascending$2;

	  function compareNode(a, b) {
	    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
	  }

	  for (var groups = arrayify(this), j = 0, m = groups.length; j < m; ++j) {
	    groups[j].sort(compareNode);
	  }

	  return this.order();
	}

	function ascending$2(a, b) {
	  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
	}

	function selection_call() {
	  var callback = arguments[0];
	  arguments[0] = this;
	  callback.apply(null, arguments);
	  return this;
	}

	function selection_nodes() {
	  var nodes = new Array(this.size()), i = -1;
	  this.each(function() { nodes[++i] = this; });
	  return nodes;
	}

	function selection_node() {

	  for (var groups = this._nodes, j = 0, m = groups.length; j < m; ++j) {
	    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
	      var node = group[i];
	      if (node) return node;
	    }
	  }

	  return null;
	}

	function selection_size() {
	  var size = 0;
	  this.each(function() { ++size; });
	  return size;
	}

	function selection_empty() {
	  return !this.node();
	}

	function selection_each(callback) {

	  for (var groups = this._nodes, j = 0, m = groups.length; j < m; ++j) {
	    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
	      if (node = group[i]) callback.call(node, node.__data__, i, group);
	    }
	  }

	  return this;
	}

	var namespaces = {
	  svg: "http://www.w3.org/2000/svg",
	  xhtml: "http://www.w3.org/1999/xhtml",
	  xlink: "http://www.w3.org/1999/xlink",
	  xml: "http://www.w3.org/XML/1998/namespace",
	  xmlns: "http://www.w3.org/2000/xmlns/"
	};

	function namespace(name) {
	  var prefix = name += "", i = prefix.indexOf(":");
	  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
	  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
	}

	function attrRemove(name) {
	  return function() {
	    this.removeAttribute(name);
	  };
	}

	function attrRemoveNS(fullname) {
	  return function() {
	    this.removeAttributeNS(fullname.space, fullname.local);
	  };
	}

	function attrConstant(name, value) {
	  return function() {
	    this.setAttribute(name, value);
	  };
	}

	function attrConstantNS(fullname, value) {
	  return function() {
	    this.setAttributeNS(fullname.space, fullname.local, value);
	  };
	}

	function attrFunction(name, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.removeAttribute(name);
	    else this.setAttribute(name, v);
	  };
	}

	function attrFunctionNS(fullname, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
	    else this.setAttributeNS(fullname.space, fullname.local, v);
	  };
	}

	function selection_attr(name, value) {
	  var fullname = namespace(name);

	  if (arguments.length < 2) {
	    var node = this.node();
	    return fullname.local
	        ? node.getAttributeNS(fullname.space, fullname.local)
	        : node.getAttribute(fullname);
	  }

	  return this.each((value == null
	      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
	      ? (fullname.local ? attrFunctionNS : attrFunction)
	      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
	}

	function styleRemove(name) {
	  return function() {
	    this.style.removeProperty(name);
	  };
	}

	function styleConstant(name, value, priority) {
	  return function() {
	    this.style.setProperty(name, value, priority);
	  };
	}

	function styleFunction(name, value, priority) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) this.style.removeProperty(name);
	    else this.style.setProperty(name, v, priority);
	  };
	}

	function selection_style(name, value, priority) {
	  var node;
	  return arguments.length > 1
	      ? this.each((value == null
	            ? styleRemove : typeof value === "function"
	            ? styleFunction
	            : styleConstant)(name, value, priority == null ? "" : priority))
	      : defaultView(node = this.node())
	          .getComputedStyle(node, null)
	          .getPropertyValue(name);
	}

	function propertyRemove(name) {
	  return function() {
	    delete this[name];
	  };
	}

	function propertyConstant(name, value) {
	  return function() {
	    this[name] = value;
	  };
	}

	function propertyFunction(name, value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    if (v == null) delete this[name];
	    else this[name] = v;
	  };
	}

	function selection_property(name, value) {
	  return arguments.length > 1
	      ? this.each((value == null
	          ? propertyRemove : typeof value === "function"
	          ? propertyFunction
	          : propertyConstant)(name, value))
	      : this.node()[name];
	}

	function classArray(string) {
	  return string.trim().split(/^|\s+/);
	}

	function classList(node) {
	  return node.classList || new ClassList(node);
	}

	function ClassList(node) {
	  this._node = node;
	  this._names = classArray(node.getAttribute("class") || "");
	}

	ClassList.prototype = {
	  add: function(name) {
	    var i = this._names.indexOf(name);
	    if (i < 0) {
	      this._names.push(name);
	      this._node.setAttribute("class", this._names.join(" "));
	    }
	  },
	  remove: function(name) {
	    var i = this._names.indexOf(name);
	    if (i >= 0) {
	      this._names.splice(i, 1);
	      this._node.setAttribute("class", this._names.join(" "));
	    }
	  },
	  contains: function(name) {
	    return this._names.indexOf(name) >= 0;
	  }
	};

	function classedAdd(node, names) {
	  var list = classList(node), i = -1, n = names.length;
	  while (++i < n) list.add(names[i]);
	}

	function classedRemove(node, names) {
	  var list = classList(node), i = -1, n = names.length;
	  while (++i < n) list.remove(names[i]);
	}

	function classedTrue(names) {
	  return function() {
	    classedAdd(this, names);
	  };
	}

	function classedFalse(names) {
	  return function() {
	    classedRemove(this, names);
	  };
	}

	function classedFunction(names, value) {
	  return function() {
	    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
	  };
	}

	function selection_classed(name, value) {
	  var names = classArray(name + "");

	  if (arguments.length < 2) {
	    var list = classList(this.node()), i = -1, n = names.length;
	    while (++i < n) if (!list.contains(names[i])) return false;
	    return true;
	  }

	  return this.each((typeof value === "function"
	      ? classedFunction : value
	      ? classedTrue
	      : classedFalse)(names, value));
	}

	function textRemove() {
	  this.textContent = "";
	}

	function textConstant(value) {
	  return function() {
	    this.textContent = value;
	  };
	}

	function textFunction(value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    this.textContent = v == null ? "" : v;
	  };
	}

	function selection_text(value) {
	  return arguments.length
	      ? this.each(value == null
	          ? textRemove : (typeof value === "function"
	          ? textFunction
	          : textConstant)(value))
	      : this.node().textContent;
	}

	function htmlRemove() {
	  this.innerHTML = "";
	}

	function htmlConstant(value) {
	  return function() {
	    this.innerHTML = value;
	  };
	}

	function htmlFunction(value) {
	  return function() {
	    var v = value.apply(this, arguments);
	    this.innerHTML = v == null ? "" : v;
	  };
	}

	function selection_html(value) {
	  return arguments.length
	      ? this.each(value == null
	          ? htmlRemove : (typeof value === "function"
	          ? htmlFunction
	          : htmlConstant)(value))
	      : this.node().innerHTML;
	}

	function raise$1() {
	  this.parentNode.appendChild(this);
	}

	function selection_raise() {
	  return this.each(raise$1);
	}

	function lower() {
	  this.parentNode.insertBefore(this, this.parentNode.firstChild);
	}

	function selection_lower() {
	  return this.each(lower);
	}

	function creatorInherit(name) {
	  return function() {
	    var document = this.ownerDocument,
	        uri = this.namespaceURI;
	    return uri
	        ? document.createElementNS(uri, name)
	        : document.createElement(name);
	  };
	}

	function creatorFixed(fullname) {
	  return function() {
	    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
	  };
	}

	function creator(name) {
	  var fullname = namespace(name);
	  return (fullname.local
	      ? creatorFixed
	      : creatorInherit)(fullname);
	}

	function append(create) {
	  return function() {
	    return this.appendChild(create.apply(this, arguments));
	  };
	}

	function insert(create, select) {
	  return function() {
	    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
	  };
	}

	function constantNull() {
	  return null;
	}

	function selection_append(name, before) {
	  var create = typeof name === "function" ? name : creator(name);
	  return this.select(arguments.length < 2
	      ? append(create)
	      : insert(create, before == null
	          ? constantNull : typeof before === "function"
	          ? before
	          : selector(before)));
	}

	function remove() {
	  var parent = this.parentNode;
	  if (parent) parent.removeChild(this);
	}

	function selection_remove() {
	  return this.each(remove);
	}

	function selection_datum(value) {
	  return arguments.length
	      ? this.property("__data__", value)
	      : this.node().__data__;
	}

	function dispatchEvent(node, type, params) {
	  var window = defaultView(node),
	      event = window.CustomEvent;

	  if (event) {
	    event = new event(type, params);
	  } else {
	    event = window.document.createEvent("Event");
	    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
	    else event.initEvent(type, false, false);
	  }

	  node.dispatchEvent(event);
	}

	function dispatchConstant(type, params) {
	  return function() {
	    return dispatchEvent(this, type, params);
	  };
	}

	function dispatchFunction(type, params) {
	  return function() {
	    return dispatchEvent(this, type, params.apply(this, arguments));
	  };
	}

	function selection_dispatch(type, params) {
	  return this.each((typeof params === "function"
	      ? dispatchFunction
	      : dispatchConstant)(type, params));
	}

	var root = [null];

	function Selection(nodes, parents) {
	  this._nodes = nodes;
	  this._parents = parents;
	}

	function selection() {
	  return new Selection([[document.documentElement]], root);
	}

	Selection.prototype = selection.prototype = {
	  select: selection_select,
	  selectAll: selection_selectAll,
	  filter: selection_filter,
	  data: selection_data,
	  enter: selection_enter,
	  exit: selection_exit,
	  order: selection_order,
	  sort: selection_sort,
	  call: selection_call,
	  nodes: selection_nodes,
	  node: selection_node,
	  size: selection_size,
	  empty: selection_empty,
	  each: selection_each,
	  attr: selection_attr,
	  style: selection_style,
	  property: selection_property,
	  classed: selection_classed,
	  text: selection_text,
	  html: selection_html,
	  raise: selection_raise,
	  lower: selection_lower,
	  append: selection_append,
	  remove: selection_remove,
	  datum: selection_datum,
	  on: selection_on,
	  dispatch: selection_dispatch
	};

	function select(selector) {
	  return typeof selector === "string"
	      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
	      : new Selection([[selector]], root);
	}

	var bug44083 = typeof navigator !== "undefined" && /WebKit/.test(navigator.userAgent) ? -1 : 0; // https://bugs.webkit.org/show_bug.cgi?id=44083

	function point$5(node, event) {
	  var svg = node.ownerSVGElement || node;

	  if (svg.createSVGPoint) {
	    var point = svg.createSVGPoint();

	    if (bug44083 < 0) {
	      var window = defaultView(node);
	      if (window.scrollX || window.scrollY) {
	        svg = select(window.document.body).append("svg").style({position: "absolute", top: 0, left: 0, margin: 0, padding: 0, border: "none"}, "important");
	        var ctm = svg.node().getScreenCTM();
	        bug44083 = !(ctm.f || ctm.e);
	        svg.remove();
	      }
	    }

	    if (bug44083) point.x = event.pageX, point.y = event.pageY;
	    else point.x = event.clientX, point.y = event.clientY;

	    point = point.matrixTransform(node.getScreenCTM().inverse());
	    return [point.x, point.y];
	  }

	  var rect = node.getBoundingClientRect();
	  return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
	}

	function mouse(node, event) {
	  if (event == null) event = sourceEvent();
	  if (event.changedTouches) event = event.changedTouches[0];
	  return point$5(node, event);
	}

	function selectAll(selector) {
	  return typeof selector === "string"
	      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
	      : new Selection([selector], root);
	}

	function touch(node, touches, identifier) {
	  if (arguments.length < 3) identifier = touches, touches = sourceEvent().changedTouches;

	  for (var i = 0, n = touches ? touches.length : 0, touch; i < n; ++i) {
	    if ((touch = touches[i]).identifier === identifier) {
	      return point$5(node, touch);
	    }
	  }

	  return null;
	}

	function touches(node, touches) {
	  if (touches == null) touches = sourceEvent().touches;

	  for (var i = 0, n = touches ? touches.length : 0, points = new Array(n); i < n; ++i) {
	    points[i] = point$5(node, touches[i]);
	  }

	  return points;
	}

	var slice$4 = Array.prototype.slice;

	function identity$5(x) {
	  return x;
	};

	var top = {};
	var right = {};
	var bottom = {};
	var left = {};
	function translateX(scale) {
	  return function(d) {
	    return "translate(" + scale(d) + ",0)";
	  };
	}

	function translateY(scale) {
	  return function(d) {
	    return "translate(0," + scale(d) + ")";
	  };
	}

	function center(scale) {
	  var width = scale.bandwidth() / 2;
	  return function(d) {
	    return scale(d) + width;
	  };
	}

	function pathUpdate(path) {
	  path.enter().append("path").attr("class", "domain");
	}

	function tickUpdate(tick) {
	  tick.exit().remove();
	  var tickEnter = tick.enter().append("g", ".domain").attr("class", "tick");
	  tickEnter.append("line");
	  tickEnter.append("text");
	  tick.order();
	}

	function axis(orient, scale) {
	  var tickArguments = [],
	      tickValues = null,
	      tickFormat = null,
	      tickSizeInner = 6,
	      tickSizeOuter = 6,
	      tickPadding = 3;

	  function axis(g) {
	    var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
	        format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$5) : tickFormat,
	        spacing = Math.max(tickSizeInner, 0) + tickPadding,
	        position = scale.bandwidth ? center(scale) : scale,
	        range = scale.range();

	    g.each(function() {
	      var g = select(this),
	          path = g.selectAll(".domain").data([null]).call(pathUpdate),
	          tick = g.selectAll(".tick").data(values, scale).call(tickUpdate),
	          line = tick.select("line"),
	          text = tick.select("text").text(format);

	      switch (orient) {
	        case top: {
	          path.attr("d", "M" + range[0] + "," + -tickSizeOuter + "V0H" + range[1] + "V" + -tickSizeOuter);
	          tick.attr("transform", translateX(position));
	          line.attr("x2", 0).attr("y2", -tickSizeInner);
	          text.attr("x", 0).attr("y", -spacing).attr("dy", "0em").style("text-anchor", "middle");
	          break;
	        }
	        case right: {
	          path.attr("d", "M" + tickSizeOuter + "," + range[0] + "H0V" + range[1] + "H" + tickSizeOuter);
	          tick.attr("transform", translateY(position));
	          line.attr("y2", 0).attr("x2", tickSizeInner);
	          text.attr("y", 0).attr("x", spacing).attr("dy", ".32em").style("text-anchor", "start");
	          break;
	        }
	        case bottom: {
	          path.attr("d", "M" + range[0] + "," + tickSizeOuter + "V0H" + range[1] + "V" + tickSizeOuter);
	          tick.attr("transform", translateX(position));
	          line.attr("x2", 0).attr("y2", tickSizeInner);
	          text.attr("x", 0).attr("y", spacing).attr("dy", ".71em").style("text-anchor", "middle");
	          break;
	        }
	        case left: {
	          path.attr("d", "M" + -tickSizeOuter + "," + range[0] + "H0V" + range[1] + "H" + -tickSizeOuter);
	          tick.attr("transform", translateY(position));
	          line.attr("y2", 0).attr("x2", -tickSizeInner);
	          text.attr("y", 0).attr("x", -spacing).attr("dy", ".32em").style("text-anchor", "end");
	          break;
	        }
	      }
	    });
	  }

	  axis.scale = function(_) {
	    return arguments.length ? (scale = _, axis) : scale;
	  };

	  axis.ticks = function() {
	    return tickArguments = slice$4.call(arguments), axis;
	  };

	  axis.tickArguments = function(_) {
	    return arguments.length ? (tickArguments = _ == null ? [] : slice$4.call(_), axis) : tickArguments.slice();
	  };

	  axis.tickValues = function(_) {
	    return arguments.length ? (tickValues = _ == null ? null : slice$4.call(_), axis) : tickValues && tickValues.slice();
	  };

	  axis.tickFormat = function(_) {
	    return arguments.length ? (tickFormat = _, axis) : tickFormat;
	  };

	  axis.tickSize = function(_) {
	    return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
	  };

	  axis.tickSizeInner = function(_) {
	    return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
	  };

	  axis.tickSizeOuter = function(_) {
	    return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
	  };

	  axis.tickPadding = function(_) {
	    return arguments.length ? (tickPadding = +_, axis) : tickPadding;
	  };

	  return axis;
	}

	function axisTop(scale) {
	  return axis(top, scale);
	};

	function axisRight(scale) {
	  return axis(right, scale);
	};

	function axisBottom(scale) {
	  return axis(bottom, scale);
	};

	function axisLeft(scale) {
	  return axis(left, scale);
	};

	function constant$3(x) {
	  return function() {
	    return x;
	  };
	};

	function x$1(d) {
	  return d[0];
	};

	function y$1(d) {
	  return d[1];
	};

	function RedBlackTree() {
	  this._ = null; // root node
	}

	function RedBlackNode(node) {
	  node.U = // parent node
	  node.C = // color - true for red, false for black
	  node.L = // left node
	  node.R = // right node
	  node.P = // previous node
	  node.N = null; // next node
	};

	RedBlackTree.prototype = {

	  insert: function(after, node) {
	    var parent, grandpa, uncle;

	    if (after) {
	      node.P = after;
	      node.N = after.N;
	      if (after.N) after.N.P = node;
	      after.N = node;
	      if (after.R) {
	        after = after.R;
	        while (after.L) after = after.L;
	        after.L = node;
	      } else {
	        after.R = node;
	      }
	      parent = after;
	    } else if (this._) {
	      after = RedBlackFirst(this._);
	      node.P = null;
	      node.N = after;
	      after.P = after.L = node;
	      parent = after;
	    } else {
	      node.P = node.N = null;
	      this._ = node;
	      parent = null;
	    }
	    node.L = node.R = null;
	    node.U = parent;
	    node.C = true;

	    after = node;
	    while (parent && parent.C) {
	      grandpa = parent.U;
	      if (parent === grandpa.L) {
	        uncle = grandpa.R;
	        if (uncle && uncle.C) {
	          parent.C = uncle.C = false;
	          grandpa.C = true;
	          after = grandpa;
	        } else {
	          if (after === parent.R) {
	            RedBlackRotateLeft(this, parent);
	            after = parent;
	            parent = after.U;
	          }
	          parent.C = false;
	          grandpa.C = true;
	          RedBlackRotateRight(this, grandpa);
	        }
	      } else {
	        uncle = grandpa.L;
	        if (uncle && uncle.C) {
	          parent.C = uncle.C = false;
	          grandpa.C = true;
	          after = grandpa;
	        } else {
	          if (after === parent.L) {
	            RedBlackRotateRight(this, parent);
	            after = parent;
	            parent = after.U;
	          }
	          parent.C = false;
	          grandpa.C = true;
	          RedBlackRotateLeft(this, grandpa);
	        }
	      }
	      parent = after.U;
	    }
	    this._.C = false;
	  },

	  remove: function(node) {
	    if (node.N) node.N.P = node.P;
	    if (node.P) node.P.N = node.N;
	    node.N = node.P = null;

	    var parent = node.U,
	        sibling,
	        left = node.L,
	        right = node.R,
	        next,
	        red;

	    if (!left) next = right;
	    else if (!right) next = left;
	    else next = RedBlackFirst(right);

	    if (parent) {
	      if (parent.L === node) parent.L = next;
	      else parent.R = next;
	    } else {
	      this._ = next;
	    }

	    if (left && right) {
	      red = next.C;
	      next.C = node.C;
	      next.L = left;
	      left.U = next;
	      if (next !== right) {
	        parent = next.U;
	        next.U = node.U;
	        node = next.R;
	        parent.L = node;
	        next.R = right;
	        right.U = next;
	      } else {
	        next.U = parent;
	        parent = next;
	        node = next.R;
	      }
	    } else {
	      red = node.C;
	      node = next;
	    }

	    if (node) node.U = parent;
	    if (red) return;
	    if (node && node.C) { node.C = false; return; }

	    do {
	      if (node === this._) break;
	      if (node === parent.L) {
	        sibling = parent.R;
	        if (sibling.C) {
	          sibling.C = false;
	          parent.C = true;
	          RedBlackRotateLeft(this, parent);
	          sibling = parent.R;
	        }
	        if ((sibling.L && sibling.L.C)
	            || (sibling.R && sibling.R.C)) {
	          if (!sibling.R || !sibling.R.C) {
	            sibling.L.C = false;
	            sibling.C = true;
	            RedBlackRotateRight(this, sibling);
	            sibling = parent.R;
	          }
	          sibling.C = parent.C;
	          parent.C = sibling.R.C = false;
	          RedBlackRotateLeft(this, parent);
	          node = this._;
	          break;
	        }
	      } else {
	        sibling = parent.L;
	        if (sibling.C) {
	          sibling.C = false;
	          parent.C = true;
	          RedBlackRotateRight(this, parent);
	          sibling = parent.L;
	        }
	        if ((sibling.L && sibling.L.C)
	          || (sibling.R && sibling.R.C)) {
	          if (!sibling.L || !sibling.L.C) {
	            sibling.R.C = false;
	            sibling.C = true;
	            RedBlackRotateLeft(this, sibling);
	            sibling = parent.L;
	          }
	          sibling.C = parent.C;
	          parent.C = sibling.L.C = false;
	          RedBlackRotateRight(this, parent);
	          node = this._;
	          break;
	        }
	      }
	      sibling.C = true;
	      node = parent;
	      parent = parent.U;
	    } while (!node.C);

	    if (node) node.C = false;
	  }

	};

	function RedBlackRotateLeft(tree, node) {
	  var p = node,
	      q = node.R,
	      parent = p.U;

	  if (parent) {
	    if (parent.L === p) parent.L = q;
	    else parent.R = q;
	  } else {
	    tree._ = q;
	  }

	  q.U = parent;
	  p.U = q;
	  p.R = q.L;
	  if (p.R) p.R.U = p;
	  q.L = p;
	}

	function RedBlackRotateRight(tree, node) {
	  var p = node,
	      q = node.L,
	      parent = p.U;

	  if (parent) {
	    if (parent.L === p) parent.L = q;
	    else parent.R = q;
	  } else {
	    tree._ = q;
	  }

	  q.U = parent;
	  p.U = q;
	  p.L = q.R;
	  if (p.L) p.L.U = p;
	  q.R = p;
	}

	function RedBlackFirst(node) {
	  while (node.L) node = node.L;
	  return node;
	}

	function createEdge(left, right, v0, v1) {
	  var edge = [null, null],
	      index = edges.push(edge) - 1;
	  edge.left = left;
	  edge.right = right;
	  if (v0) setEdgeEnd(edge, left, right, v0);
	  if (v1) setEdgeEnd(edge, right, left, v1);
	  cells[left.index].halfedges.push(index);
	  cells[right.index].halfedges.push(index);
	  return edge;
	};

	function createBorderEdge(left, v0, v1) {
	  var edge = [v0, v1];
	  edge.left = left;
	  return edge;
	};

	function setEdgeEnd(edge, left, right, vertex) {
	  if (!edge[0] && !edge[1]) {
	    edge[0] = vertex;
	    edge.left = left;
	    edge.right = right;
	  } else if (edge.left === right) {
	    edge[1] = vertex;
	  } else {
	    edge[0] = vertex;
	  }
	};

	// Liang–Barsky line clipping.
	function clippedEdge(edge, x0, y0, x1, y1) {
	  var a = edge[0],
	      b = edge[1],
	      ax = a[0],
	      ay = a[1],
	      bx = b[0],
	      by = b[1],
	      t0 = 0,
	      t1 = 1,
	      dx = bx - ax,
	      dy = by - ay,
	      r;

	  r = x0 - ax;
	  if (!dx && r > 0) return;
	  r /= dx;
	  if (dx < 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  } else if (dx > 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  }

	  r = x1 - ax;
	  if (!dx && r < 0) return;
	  r /= dx;
	  if (dx < 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  } else if (dx > 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  }

	  r = y0 - ay;
	  if (!dy && r > 0) return;
	  r /= dy;
	  if (dy < 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  } else if (dy > 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  }

	  r = y1 - ay;
	  if (!dy && r < 0) return;
	  r /= dy;
	  if (dy < 0) {
	    if (r > t1) return;
	    if (r > t0) t0 = r;
	  } else if (dy > 0) {
	    if (r < t0) return;
	    if (r < t1) t1 = r;
	  }

	  if (!(t0 > 0) && !(t1 < 1)) return edge; // TODO Better check?

	  var l = edge.left, r = edge.right;
	  if (t0 > 0) a = [ax + t0 * dx, ay + t0 * dy];
	  if (t1 < 1) b = [ax + t1 * dx, ay + t1 * dy];
	  edge = [a, b];
	  edge.left = l;
	  edge.right = r;
	  return edge;
	}

	function connectedEdge(edge, x0, y0, x1, y1) {
	  var v1 = edge[1];
	  if (v1) return edge;

	  var v0 = edge[0],
	      left = edge.left,
	      right = edge.right,
	      lx = left[0],
	      ly = left[1],
	      rx = right[0],
	      ry = right[1],
	      fx = (lx + rx) / 2,
	      fy = (ly + ry) / 2,
	      fm,
	      fb;

	  if (ry === ly) {
	    if (fx < x0 || fx >= x1) return;
	    if (lx > rx) {
	      if (!v0) v0 = [fx, y0];
	      else if (v0[1] >= y1) return;
	      v1 = [fx, y1];
	    } else {
	      if (!v0) v0 = [fx, y1];
	      else if (v0[1] < y0) return;
	      v1 = [fx, y0];
	    }
	  } else {
	    fm = (lx - rx) / (ry - ly);
	    fb = fy - fm * fx;
	    if (fm < -1 || fm > 1) {
	      if (lx > rx) {
	        if (!v0) v0 = [(y0 - fb) / fm, y0];
	        else if (v0[1] >= y1) return;
	        v1 = [(y1 - fb) / fm, y1];
	      } else {
	        if (!v0) v0 = [(y1 - fb) / fm, y1];
	        else if (v0[1] < y0) return;
	        v1 = [(y0 - fb) / fm, y0];
	      }
	    } else {
	      if (ly < ry) {
	        if (!v0) v0 = [x0, fm * x0 + fb];
	        else if (v0[0] >= x1) return;
	        v1 = [x1, fm * x1 + fb];
	      } else {
	        if (!v0) v0 = [x1, fm * x1 + fb];
	        else if (v0[0] < x0) return;
	        v1 = [x0, fm * x0 + fb];
	      }
	    }
	  }

	  edge = [v0, v1];
	  edge.left = left;
	  edge.right = right;
	  return edge;
	}

	function clippedEdges(x0, y0, x1, y1) {
	  var i = edges.length,
	      clippedEdges = new Array(i),
	      edge;

	  while (i--) {
	    if ((edge = connectedEdge(edges[i], x0, y0, x1, y1))
	        && (edge = clippedEdge(edge, x0, y0, x1, y1))
	        && (Math.abs(edge[0][0] - edge[1][0]) > epsilon$2
	            || Math.abs(edge[0][1] - edge[1][1]) > epsilon$2)) {
	      clippedEdges[i] = edge;
	    }
	  }

	  return clippedEdges;
	};

	function createCell(site) {
	  return cells[site.index] = {
	    site: site,
	    halfedges: []
	  };
	};

	function cellHalfedgeAngle(cell, edge) {
	  var site = cell.site,
	      va = edge.left,
	      vb = edge.right;
	  if (site === vb) vb = va, va = site;
	  if (vb) return Math.atan2(vb[1] - va[1], vb[0] - va[0]);
	  if (site === va) va = edge[1], vb = edge[0];
	  else va = edge[0], vb = edge[1];
	  return Math.atan2(va[0] - vb[0], vb[1] - va[1]);
	}

	function cellHalfedgeStart(cell, edge) {
	  return edge[+(edge.left !== cell.site)];
	};

	function cellHalfedgeEnd(cell, edge) {
	  return edge[+(edge.left === cell.site)];
	};

	function sortCellHalfedges() {
	  for (var i = 0, n = cells.length, cell, halfedges, m; i < n; ++i) {
	    if ((cell = cells[i]) && (m = (halfedges = cell.halfedges).length)) {
	      var index = new Array(m),
	          array = new Array(m);
	      for (var j = 0; j < m; ++j) index[j] = j, array[j] = cellHalfedgeAngle(cell, edges[halfedges[j]]);
	      index.sort(function(i, j) { return array[j] - array[i]; });
	      for (var j = 0; j < m; ++j) array[j] = halfedges[index[j]];
	      for (var j = 0; j < m; ++j) halfedges[j] = array[j];
	    }
	  }
	};

	function clipCells(edges, x0, y0, x1, y1) {
	  var iCell = cells.length,
	      cell,
	      iHalfedge,
	      halfedges,
	      nHalfedges,
	      start,
	      startX,
	      startY,
	      end,
	      endX,
	      endY;

	  while (iCell--) {
	    if (cell = cells[iCell]) {
	      halfedges = cell.halfedges;
	      iHalfedge = halfedges.length;

	      // Remove any dangling clipped edges.
	      while (iHalfedge--) {
	        if (!edges[halfedges[iHalfedge]]) {
	          halfedges.splice(iHalfedge, 1);
	        }
	      }

	      // Insert any border edges as necessary.
	      iHalfedge = 0, nHalfedges = halfedges.length;
	      while (iHalfedge < nHalfedges) {
	        end = cellHalfedgeEnd(cell, edges[halfedges[iHalfedge]]), endX = end[0], endY = end[1];
	        start = cellHalfedgeStart(cell, edges[halfedges[++iHalfedge % nHalfedges]]), startX = start[0], startY = start[1];
	        if (Math.abs(endX - startX) > epsilon$2 || Math.abs(endY - startY) > epsilon$2) {
	          halfedges.splice(iHalfedge, 0, edges.push(createBorderEdge(cell.site, end,
	              Math.abs(endX - x0) < epsilon$2 && y1 - endY > epsilon$2 ? [x0, Math.abs(startX - x0) < epsilon$2 ? startY : y1]
	              : Math.abs(endY - y1) < epsilon$2 && x1 - endX > epsilon$2 ? [Math.abs(startY - y1) < epsilon$2 ? startX : x1, y1]
	              : Math.abs(endX - x1) < epsilon$2 && endY - y0 > epsilon$2 ? [x1, Math.abs(startX - x1) < epsilon$2 ? startY : y0]
	              : Math.abs(endY - y0) < epsilon$2 && endX - x0 > epsilon$2 ? [Math.abs(startY - y0) < epsilon$2 ? startX : x0, y0]
	              : null)) - 1);
	          ++nHalfedges;
	        }
	      }
	    }
	  }
	};

	var circlePool = [];

	var firstCircle;

	function Circle() {
	  RedBlackNode(this);
	  this.x =
	  this.y =
	  this.arc =
	  this.site =
	  this.cy = null;
	}

	function attachCircle(arc) {
	  var lArc = arc.P,
	      rArc = arc.N;

	  if (!lArc || !rArc) return;

	  var lSite = lArc.site,
	      cSite = arc.site,
	      rSite = rArc.site;

	  if (lSite === rSite) return;

	  var bx = cSite[0],
	      by = cSite[1],
	      ax = lSite[0] - bx,
	      ay = lSite[1] - by,
	      cx = rSite[0] - bx,
	      cy = rSite[1] - by;

	  var d = 2 * (ax * cy - ay * cx);
	  if (d >= -epsilon2$1) return;

	  var ha = ax * ax + ay * ay,
	      hc = cx * cx + cy * cy,
	      x = (cy * ha - ay * hc) / d,
	      y = (ax * hc - cx * ha) / d,
	      cy = y + by;

	  var circle = circlePool.pop() || new Circle;
	  circle.arc = arc;
	  circle.site = cSite;
	  circle.x = x + bx;
	  circle.y = cy + Math.sqrt(x * x + y * y); // y bottom
	  circle.cy = cy;

	  arc.circle = circle;

	  var before = null,
	      node = circles._;

	  while (node) {
	    if (circle.y < node.y || (circle.y === node.y && circle.x <= node.x)) {
	      if (node.L) node = node.L;
	      else { before = node.P; break; }
	    } else {
	      if (node.R) node = node.R;
	      else { before = node; break; }
	    }
	  }

	  circles.insert(before, circle);
	  if (!before) firstCircle = circle;
	};

	function detachCircle(arc) {
	  var circle = arc.circle;
	  if (circle) {
	    if (!circle.P) firstCircle = circle.N;
	    circles.remove(circle);
	    circlePool.push(circle);
	    RedBlackNode(circle);
	    arc.circle = null;
	  }
	};

	var beachPool = [];

	function Beach() {
	  RedBlackNode(this);
	  this.edge =
	  this.site =
	  this.circle = null;
	}

	function createBeach(site) {
	  var beach = beachPool.pop() || new Beach;
	  beach.site = site;
	  return beach;
	}

	function detachBeach(beach) {
	  detachCircle(beach);
	  beaches.remove(beach);
	  beachPool.push(beach);
	  RedBlackNode(beach);
	}

	function removeBeach(beach) {
	  var circle = beach.circle,
	      x = circle.x,
	      y = circle.cy,
	      vertex = [x, y],
	      previous = beach.P,
	      next = beach.N,
	      disappearing = [beach];

	  detachBeach(beach);

	  var lArc = previous;
	  while (lArc.circle
	      && Math.abs(x - lArc.circle.x) < epsilon$2
	      && Math.abs(y - lArc.circle.cy) < epsilon$2) {
	    previous = lArc.P;
	    disappearing.unshift(lArc);
	    detachBeach(lArc);
	    lArc = previous;
	  }

	  disappearing.unshift(lArc);
	  detachCircle(lArc);

	  var rArc = next;
	  while (rArc.circle
	      && Math.abs(x - rArc.circle.x) < epsilon$2
	      && Math.abs(y - rArc.circle.cy) < epsilon$2) {
	    next = rArc.N;
	    disappearing.push(rArc);
	    detachBeach(rArc);
	    rArc = next;
	  }

	  disappearing.push(rArc);
	  detachCircle(rArc);

	  var nArcs = disappearing.length,
	      iArc;
	  for (iArc = 1; iArc < nArcs; ++iArc) {
	    rArc = disappearing[iArc];
	    lArc = disappearing[iArc - 1];
	    setEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
	  }

	  lArc = disappearing[0];
	  rArc = disappearing[nArcs - 1];
	  rArc.edge = createEdge(lArc.site, rArc.site, null, vertex);

	  attachCircle(lArc);
	  attachCircle(rArc);
	};

	function addBeach(site) {
	  var x = site[0],
	      directrix = site[1],
	      lArc,
	      rArc,
	      dxl,
	      dxr,
	      node = beaches._;

	  while (node) {
	    dxl = leftBreakPoint(node, directrix) - x;
	    if (dxl > epsilon$2) node = node.L; else {
	      dxr = x - rightBreakPoint(node, directrix);
	      if (dxr > epsilon$2) {
	        if (!node.R) {
	          lArc = node;
	          break;
	        }
	        node = node.R;
	      } else {
	        if (dxl > -epsilon$2) {
	          lArc = node.P;
	          rArc = node;
	        } else if (dxr > -epsilon$2) {
	          lArc = node;
	          rArc = node.N;
	        } else {
	          lArc = rArc = node;
	        }
	        break;
	      }
	    }
	  }

	  createCell(site);
	  var newArc = createBeach(site);
	  beaches.insert(lArc, newArc);

	  if (!lArc && !rArc) return;

	  if (lArc === rArc) {
	    detachCircle(lArc);
	    rArc = createBeach(lArc.site);
	    beaches.insert(newArc, rArc);
	    newArc.edge = rArc.edge = createEdge(lArc.site, newArc.site);
	    attachCircle(lArc);
	    attachCircle(rArc);
	    return;
	  }

	  if (!rArc) { // && lArc
	    newArc.edge = createEdge(lArc.site, newArc.site);
	    return;
	  }

	  // else lArc !== rArc
	  detachCircle(lArc);
	  detachCircle(rArc);

	  var lSite = lArc.site,
	      ax = lSite[0],
	      ay = lSite[1],
	      bx = site[0] - ax,
	      by = site[1] - ay,
	      rSite = rArc.site,
	      cx = rSite[0] - ax,
	      cy = rSite[1] - ay,
	      d = 2 * (bx * cy - by * cx),
	      hb = bx * bx + by * by,
	      hc = cx * cx + cy * cy,
	      vertex = {x: (cy * hb - by * hc) / d + ax, y: (bx * hc - cx * hb) / d + ay};

	  setEdgeEnd(rArc.edge, lSite, rSite, vertex);
	  newArc.edge = createEdge(lSite, site, null, vertex);
	  rArc.edge = createEdge(site, rSite, null, vertex);
	  attachCircle(lArc);
	  attachCircle(rArc);
	};

	function leftBreakPoint(arc, directrix) {
	  var site = arc.site,
	      rfocx = site[0],
	      rfocy = site[1],
	      pby2 = rfocy - directrix;

	  if (!pby2) return rfocx;

	  var lArc = arc.P;
	  if (!lArc) return -Infinity;

	  site = lArc.site;
	  var lfocx = site[0],
	      lfocy = site[1],
	      plby2 = lfocy - directrix;

	  if (!plby2) return lfocx;

	  var hl = lfocx - rfocx,
	      aby2 = 1 / pby2 - 1 / plby2,
	      b = hl / plby2;

	  if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;

	  return (rfocx + lfocx) / 2;
	}

	function rightBreakPoint(arc, directrix) {
	  var rArc = arc.N;
	  if (rArc) return leftBreakPoint(rArc, directrix);
	  var site = arc.site;
	  return site[1] === directrix ? site[0] : Infinity;
	}

	var epsilon$2 = 1e-6;
	var epsilon2$1 = 1e-12;
	var beaches;
	var cells;
	var circles;
	var edges;

	function triangleArea(a, b, c) {
	  return (a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]);
	}

	function lexicographic(a, b) {
	  return b[1] - a[1]
	      || b[0] - a[0];
	}

	function Diagram(sites, extent) {
	  var site = sites.sort(lexicographic).pop(),
	      x,
	      y,
	      circle;

	  edges = [];
	  cells = new Array(sites.length);
	  beaches = new RedBlackTree;
	  circles = new RedBlackTree;

	  while (true) {
	    circle = firstCircle;
	    if (site && (!circle || site[1] < circle.y || (site[1] === circle.y && site[0] < circle.x))) {
	      if (site[0] !== x || site[1] !== y) {
	        addBeach(site);
	        x = site[0], y = site[1];
	      }
	      site = sites.pop();
	    } else if (circle) {
	      removeBeach(circle.arc);
	    } else {
	      break;
	    }
	  }

	  sortCellHalfedges();

	  if (extent) {
	    var x0 = extent[0][0],
	        y0 = extent[0][1],
	        x1 = extent[1][0],
	        y1 = extent[1][1];
	    this.extent = [[x0, y0], [x1, y1]];
	    this.cellEdges = clippedEdges(x0, y0, x1, y1);
	    clipCells(this.cellEdges, x0, y0, x1, y1);
	  } else {
	    this.cellEdges = edges;
	  }

	  this.cells = cells;
	  this.edges = edges;

	  beaches =
	  circles =
	  edges =
	  cells = null;
	};

	Diagram.prototype = {
	  polygons: function() {
	    var cells = this.cells,
	        edges = this.cellEdges,
	        extent = this.extent,
	        x0 = extent[0][0],
	        y0 = extent[0][1],
	        x1 = extent[1][0],
	        y1 = extent[1][1],
	        polygons = new Array(cells.length);

	    cells.forEach(function(cell, i) {
	      var site = cell.site,
	          halfedges = cell.halfedges,
	          polygon;
	      if (halfedges.length) polygon = halfedges.map(function(index) { return cellHalfedgeStart(cell, edges[index]); });
	      else if (site[0] >= x0 && site[0] <= x1 && site[1] >= y0 && site[1] <= y1) polygon = [[x0, y1], [x1, y1], [x1, y0], [x0, y0]];
	      else return;
	      polygons[i] = polygon;
	      polygon.data = site.data;
	    });

	    return polygons;
	  },
	  triangles: function() {
	    var triangles = [],
	        edges = this.edges;

	    this.cells.forEach(function(cell, i) {
	      var site = cell.site,
	          halfedges = cell.halfedges,
	          j = -1,
	          m = halfedges.length,
	          e0,
	          s0,
	          e1 = edges[halfedges[m - 1]],
	          s1 = e1.left === site ? e1.right : e1.left;

	      while (++j < m) {
	        e0 = e1;
	        s0 = s1;
	        e1 = edges[halfedges[j]];
	        s1 = e1.left === site ? e1.right : e1.left;
	        if (i < s0.index && i < s1.index && triangleArea(site, s0, s1) < 0) {
	          triangles.push([site.data, s0.data, s1.data]);
	        }
	      }
	    });

	    return triangles;
	  },
	  links: function() {
	    return this.edges.filter(function(edge) {
	      return edge.right;
	    }).map(function(edge) {
	      return {
	        source: edge.left.data,
	        target: edge.right.data
	      };
	    });
	  }
	}

	function voronoi() {
	  var x = x$1,
	      y = y$1,
	      extent = null;

	  function voronoi(data) {
	    return new Diagram(data.map(function(d, i) {
	      var s = [Math.round(x(d, i, data) / epsilon$2) * epsilon$2, Math.round(y(d, i, data) / epsilon$2) * epsilon$2];
	      s.index = i;
	      s.data = d;
	      return s;
	    }), extent);
	  }
	  voronoi.polygons = function(data) {
	    return voronoi(data).polygons();
	  };

	  voronoi.links = function(data) {
	    return voronoi(data).links();
	  };

	  voronoi.triangles = function(data) {
	    return voronoi(data).triangles();
	  };

	  voronoi.x = function(_) {
	    return arguments.length ? (x = typeof _ === "function" ? _ : constant$3(+_), voronoi) : x;
	  };

	  voronoi.y = function(_) {
	    return arguments.length ? (y = typeof _ === "function" ? _ : constant$3(+_), voronoi) : y;
	  };

	  voronoi.extent = function(_) {
	    return arguments.length ? (extent = _ == null ? null : [[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]], voronoi) : extent && [[extent[0][0], extent[0][1]], [extent[1][0], extent[1][1]]];
	  };

	  voronoi.size = function(_) {
	    return arguments.length ? (extent = _ == null ? null : [[0, 0], [+_[0], +_[1]]], voronoi) : extent && [extent[1][0], extent[1][1]];
	  };

	  return voronoi;
	};

	exports.version = version;
	exports.bisect = bisectRight;
	exports.bisectRight = bisectRight;
	exports.bisectLeft = bisectLeft;
	exports.ascending = ascending;
	exports.bisector = bisector;
	exports.descending = descending;
	exports.deviation = deviation;
	exports.extent = extent;
	exports.histogram = histogram;
	exports.thresholdFreedmanDiaconis = freedmanDiaconis;
	exports.thresholdScott = scott;
	exports.thresholdSturges = sturges;
	exports.max = max;
	exports.mean = mean;
	exports.median = median;
	exports.merge = merge;
	exports.min = min;
	exports.pairs = pairs;
	exports.permute = permute;
	exports.quantile = quantile;
	exports.range = sequence;
	exports.scan = scan;
	exports.shuffle = shuffle;
	exports.sum = sum;
	exports.ticks = ticks;
	exports.transpose = transpose;
	exports.variance = variance;
	exports.zip = zip;
	exports.entries = entries;
	exports.keys = keys;
	exports.values = values;
	exports.map = map;
	exports.set = set;
	exports.nest = nest;
	exports.randomUniform = uniform;
	exports.randomNormal = normal;
	exports.randomLogNormal = logNormal;
	exports.randomBates = bates;
	exports.randomIrwinHall = irwinHall;
	exports.randomExponential = exponential;
	exports.easeBind = bind;
	exports.easeLinearIn = linearIn;
	exports.easeLinearOut = linearIn;
	exports.easeLinearInOut = linearIn;
	exports.easeQuadIn = quadIn;
	exports.easeQuadOut = quadOut;
	exports.easeQuadInOut = quadInOut;
	exports.easeCubicIn = cubicIn;
	exports.easeCubicOut = cubicOut;
	exports.easeCubicInOut = cubicInOut;
	exports.easePolyIn = polyIn;
	exports.easePolyOut = polyOut;
	exports.easePolyInOut = polyInOut;
	exports.easeSinIn = sinIn;
	exports.easeSinOut = sinOut;
	exports.easeSinInOut = sinInOut;
	exports.easeExpIn = expIn;
	exports.easeExpOut = expOut;
	exports.easeExpInOut = expInOut;
	exports.easeCircleIn = circleIn;
	exports.easeCircleOut = circleOut;
	exports.easeCircleInOut = circleInOut;
	exports.easeBounceIn = bounceIn;
	exports.easeBounceOut = bounceOut;
	exports.easeBounceInOut = bounceInOut;
	exports.easeBackIn = backIn;
	exports.easeBackOut = backOut;
	exports.easeBackInOut = backInOut;
	exports.easeElasticIn = elasticIn;
	exports.easeElasticOut = elasticOut;
	exports.easeElasticInOut = elasticInOut;
	exports.polygonArea = area;
	exports.polygonCentroid = centroid;
	exports.polygonHull = hull;
	exports.polygonContains = contains;
	exports.polygonLength = length$1;
	exports.path = path;
	exports.quadtree = quadtree;
	exports.arc = arc;
	exports.area = area$1;
	exports.line = line;
	exports.pie = pie;
	exports.radialArea = radialArea;
	exports.radialLine = radialLine;
	exports.symbol = symbol;
	exports.symbols = symbols;
	exports.symbolCircle = circle;
	exports.symbolCross = cross;
	exports.symbolDiamond = diamond;
	exports.symbolSquare = square;
	exports.symbolStar = star;
	exports.symbolTriangle = triangle;
	exports.symbolWye = wye;
	exports.curveBasisClosed = basisClosed;
	exports.curveBasisOpen = basisOpen;
	exports.curveBasis = basis;
	exports.curveBundle = bundle;
	exports.curveCardinalClosed = cardinalClosed;
	exports.curveCardinalOpen = cardinalOpen;
	exports.curveCardinal = cardinal;
	exports.curveCatmullRomClosed = catmullRomClosed;
	exports.curveCatmullRomOpen = catmullRomOpen;
	exports.curveCatmullRom = catmullRom;
	exports.curveLinearClosed = linearClosed;
	exports.curveLinear = curveLinear;
	exports.curveMonotone = monotone;
	exports.curveNatural = natural;
	exports.curveStep = step;
	exports.curveStepAfter = stepAfter;
	exports.curveStepBefore = stepBefore;
	exports.stack = stack;
	exports.stackOffsetExpand = expand;
	exports.stackOffsetNone = none;
	exports.stackOffsetSilhouette = silhouette;
	exports.stackOffsetWiggle = wiggle;
	exports.stackOrderAscending = ascending$1;
	exports.stackOrderDescending = descending$1;
	exports.stackOrderInsideOut = insideOut;
	exports.stackOrderNone = none$1;
	exports.stackOrderReverse = reverse;
	exports.color = color;
	exports.rgb = rgb;
	exports.hsl = hsl;
	exports.lab = lab;
	exports.hcl = hcl;
	exports.cubehelix = cubehelix;
	exports.interpolateBind = interpolateBind;
	exports.interpolate = interpolateValue;
	exports.interpolators = values$1;
	exports.interpolateArray = array;
	exports.interpolateNumber = reinterpolate;
	exports.interpolateObject = object;
	exports.interpolateRound = interpolateRound;
	exports.interpolateString = string;
	exports.interpolateTransform = transform;
	exports.interpolateZoom = zoom;
	exports.interpolateRgb = rgb$1;
	exports.interpolateHsl = hsl$1;
	exports.interpolateHslLong = hslLong;
	exports.interpolateLab = lab$1;
	exports.interpolateHcl = hcl$1;
	exports.interpolateHclLong = hclLong;
	exports.interpolateCubehelix = cubehelix$1;
	exports.interpolateCubehelixLong = interpolateCubehelixLong;
	exports.dispatch = dispatch;
	exports.dsv = dsv;
	exports.csv = csv;
	exports.tsv = tsv;
	exports.request = request;
	exports.requestHtml = html;
	exports.requestJson = json;
	exports.requestText = text;
	exports.requestXml = xml;
	exports.requestCsv = csv$1;
	exports.requestTsv = tsv$1;
	exports.timer = timer;
	exports.timerFlush = timerFlush;
	exports.timeInterval = newInterval;
	exports.timeMillisecond = millisecond;
	exports.timeMilliseconds = timeMilliseconds;
	exports.timeSecond = timeSecond;
	exports.timeSeconds = timeSeconds;
	exports.timeMinute = timeMinute;
	exports.timeMinutes = timeMinutes;
	exports.timeHour = timeHour;
	exports.timeHours = timeHours;
	exports.timeDay = timeDay;
	exports.timeDays = timeDays;
	exports.timeWeek = timeSunday;
	exports.timeWeeks = timeWeeks;
	exports.timeSunday = timeSunday;
	exports.timeSundays = timeSundays;
	exports.timeMonday = timeMonday;
	exports.timeMondays = timeMondays;
	exports.timeTuesday = tuesday;
	exports.timeTuesdays = timeTuesdays;
	exports.timeWednesday = wednesday;
	exports.timeWednesdays = timeWednesdays;
	exports.timeThursday = thursday;
	exports.timeThursdays = timeThursdays;
	exports.timeFriday = friday;
	exports.timeFridays = timeFridays;
	exports.timeSaturday = saturday;
	exports.timeSaturdays = timeSaturdays;
	exports.timeMonth = timeMonth;
	exports.timeMonths = timeMonths;
	exports.timeYear = timeYear;
	exports.timeYears = timeYears;
	exports.utcMillisecond = utcMillisecond;
	exports.utcMilliseconds = utcMilliseconds;
	exports.utcSecond = utcSecond;
	exports.utcSeconds = utcSeconds;
	exports.utcMinute = utcMinute;
	exports.utcMinutes = utcMinutes;
	exports.utcHour = utcHour;
	exports.utcHours = utcHours;
	exports.utcDay = utcDay;
	exports.utcDays = utcDays;
	exports.utcWeek = utcSunday;
	exports.utcWeeks = utcWeeks;
	exports.utcSunday = utcSunday;
	exports.utcSundays = utcSundays;
	exports.utcMonday = utcMonday;
	exports.utcMondays = utcMondays;
	exports.utcTuesday = utcTuesday;
	exports.utcTuesdays = utcTuesdays;
	exports.utcWednesday = utcWednesday;
	exports.utcWednesdays = utcWednesdays;
	exports.utcThursday = utcThursday;
	exports.utcThursdays = utcThursdays;
	exports.utcFriday = utcFriday;
	exports.utcFridays = utcFridays;
	exports.utcSaturday = utcSaturday;
	exports.utcSaturdays = utcSaturdays;
	exports.utcMonth = utcMonth;
	exports.utcMonths = utcMonths;
	exports.utcYear = utcYear;
	exports.utcYears = utcYears;
	exports.format = format;
	exports.formatPrefix = formatPrefix;
	exports.formatLocale = locale;
	exports.formatCaEs = caES;
	exports.formatCsCz = csCZ;
	exports.formatDeCh = deCH;
	exports.formatDeDe = deDE;
	exports.formatEnCa = enCA;
	exports.formatEnGb = enGB;
	exports.formatEnUs = defaultLocale;
	exports.formatEsEs = esES;
	exports.formatFiFi = fiFI;
	exports.formatFrCa = frCA;
	exports.formatFrFr = frFR;
	exports.formatHeIl = heIL;
	exports.formatHuHu = huHU;
	exports.formatItIt = itIT;
	exports.formatJaJp = jaJP;
	exports.formatKoKr = koKR;
	exports.formatMkMk = mkMK;
	exports.formatNlNl = nlNL;
	exports.formatPlPl = plPL;
	exports.formatPtBr = ptBR;
	exports.formatRuRu = ruRU;
	exports.formatSvSe = svSE;
	exports.formatZhCn = zhCN;
	exports.formatSpecifier = formatSpecifier;
	exports.precisionFixed = precisionFixed;
	exports.precisionPrefix = precisionPrefix;
	exports.precisionRound = precisionRound;
	exports.timeFormat = timeFormat;
	exports.timeParse = timeParse;
	exports.utcFormat = utcFormat;
	exports.utcParse = utcParse;
	exports.isoFormat = formatIso;
	exports.isoParse = parseIso;
	exports.timeFormatLocale = locale$1;
	exports.timeFormatCaEs = caES$1;
	exports.timeFormatDeCh = deCH$1;
	exports.timeFormatDeDe = deDE$1;
	exports.timeFormatEnCa = enCA$1;
	exports.timeFormatEnGb = enGB$1;
	exports.timeFormatEnUs = locale$2;
	exports.timeFormatEsEs = esES$1;
	exports.timeFormatFiFi = fiFI$1;
	exports.timeFormatFrCa = frCA$1;
	exports.timeFormatFrFr = frFR$1;
	exports.timeFormatHeIl = heIL$1;
	exports.timeFormatHuHu = huHU$1;
	exports.timeFormatItIt = itIT$1;
	exports.timeFormatJaJp = jaJP$1;
	exports.timeFormatKoKr = koKR$1;
	exports.timeFormatMkMk = mkMK$1;
	exports.timeFormatNlNl = nlNL$1;
	exports.timeFormatPlPl = plPL$1;
	exports.timeFormatPtBr = ptBR$1;
	exports.timeFormatRuRu = ruRU$1;
	exports.timeFormatSvSe = svSE$1;
	exports.timeFormatZhCn = zhCN$1;
	exports.scaleBand = band;
	exports.scalePoint = point;
	exports.scaleIdentity = identity$2;
	exports.scaleLinear = linear;
	exports.scaleLog = log;
	exports.scaleOrdinal = ordinal;
	exports.scaleImplicit = implicit;
	exports.scalePow = pow;
	exports.scaleSqrt = sqrt;
	exports.scaleQuantile = quantile$1;
	exports.scaleQuantize = quantize;
	exports.scaleThreshold = threshold;
	exports.scaleTime = time;
	exports.scaleUtc = utcTime;
	exports.scaleCategory10 = category10;
	exports.scaleCategory20b = category20b;
	exports.scaleCategory20c = category20c;
	exports.scaleCategory20 = category20;
	exports.scaleCubehelix = cubehelix$2;
	exports.scaleRainbow = rainbow;
	exports.scaleWarm = warm;
	exports.scaleCool = cool;
	exports.scaleViridis = viridis;
	exports.scaleMagma = magma;
	exports.scaleInferno = inferno;
	exports.scalePlasma = plasma;
	exports.mouse = mouse;
	exports.namespace = namespace;
	exports.namespaces = namespaces;
	exports.select = select;
	exports.selectAll = selectAll;
	exports.selection = selection;
	exports.touch = touch;
	exports.touches = touches;
	exports.axisTop = axisTop;
	exports.axisRight = axisRight;
	exports.axisBottom = axisBottom;
	exports.axisLeft = axisLeft;
	exports.voronoi = voronoi;

}));
},{}],91:[function(require,module,exports){
function adjustScale(graphObject){

	var layout = graphObject.layout;
	var renderer = graphObject.renderer;

	var graphRect = layout.getGraphRect();
    var graphSize = Math.min(graphRect.x2 - graphRect.x1, graphRect.y2 - graphRect.y1);
    var screenSize = Math.min(document.body.clientWidth, document.body.clientHeight);

    var desiredScale = screenSize / graphSize;

    zoomOut(desiredScale, 1, renderer);
}

module.exports = adjustScale;
},{}],92:[function(require,module,exports){
function launchGraphEvents(graphObject){

	var graphGL = graphObject.graphGL;
	var graphics = graphObject.graphics;
	var layout = graphObject.layout;
	var renderer = graphObject.renderer;

	graphObject.events = Viva.Graph.webglInputEvents(graphics, graphGL);

	graphObject.selectedNodes = [],
	graphObject.nodesToCheckLinks = [], 
	graphObject.toRemove = "";


	var ctrlDown = false, altDown = false, remakeSelection = false, multipleselection = false;

	var multiSelectOverlay;

  document.addEventListener('keydown', function(e) {

    if (e.which == 18) altDown = true;
  
    if (e.which === 16 && !multiSelectOverlay) { // shift key
      multipleselection = false;
      for (i in graphObject.selectedNodes){
        var nodeToUse = graphics.getNodeUI(graphObject.selectedNodes[i].id);
        nodeToUse.colorIndexes = nodeToUse.backupColor;
      } 
      graphObject.selectedNodes = [];

      if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 5);
      }
      
      multiSelectOverlay = startMultiSelect(graphObject);
    }

    if (e.which === 17){
      ctrlDown = true;
      if (!multipleselection ){
        for (i in graphObject.selectedNodes){
          var nodeToUse = graphics.getNodeUI(graphObject.selectedNodes[i].id);
          nodeToUse.colorIndexes = nodeToUse.backupColor;
          //nodeToUse.size = nodeToUse.backupSize;
        } 
        remakeSelection = false;
        graphObject.selectedNodes = [];

        if(graphObject.isLayoutPaused){
	        renderer.resume();
	        setTimeout(function(){ renderer.pause();}, 5);
	      }
      }
    }
    if (e.which === 87){
    	if (!graphObject.isLayoutPaused){
        	renderer.pause();
            graphObject.isLayoutPaused = true;
        }
        else{
        	renderer.resume();
            graphObject.isLayoutPaused = false;
        }
    }
  });
  document.addEventListener('keyup', function(e) {

    if (e.which === 16 && multiSelectOverlay) {
      multiSelectOverlay.destroy();
      multiSelectOverlay = null;

      graphGL.forEachNode(function(node){
        var currentNodeUI = graphics.getNodeUI(node.id);
        if (currentNodeUI.colorIndexes[0][0] == 0xFFA500ff) graphObject.selectedNodes.push(node);
      });
      multipleselection = true;

    }

    if (e.which === 17){
      ctrlDown = false;
    } 

    if (e.which == 18){

      altDown = false;
      restoreLinkSearch(graphObject);
      graphObject.nodesToCheckLinks = [];
      toRemove = "";

    }
    
  });
}

module.exports = launchGraphEvents;
},{}],93:[function(require,module,exports){
function changeLogScale(graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;


    graph.links.forEach(function(link){

            var linkUI = graphGL.getLink(link.source, link.target);

            var spring = layout.getSpring(link.source, link.target);

            if (graphObject.isLogScale) spring.length = Math.log10(spring.length);
            else spring.length = linkUI.data.connectionStrength;

        })

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }
}

function changeSpringLength(newValue, max, graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;

    graph.links.forEach(function(link){

            var linkUI = graphGL.getLink(link.source, link.target);

            var spring = layout.getSpring(link.source, link.target);

            if (graphObject.isLogScale) spring.length = Math.log10(1 + linkUI.data.value) + (200 * Math.log10(1 + linkUI.data.value * (newValue/max)));
            else spring.length = linkUI.data.value + (200 * (1 + Math.log10(linkUI.data.value)) * (newValue/max));

        })

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

}

function changeDragCoefficient(newValue, max, graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;

    layout.simulator.dragCoeff(parseInt(newValue) * 0.001);

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

}

function changeSpringCoefficient(newValue, max, graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;

    layout.simulator.springCoeff(parseInt(newValue) * 0.0001);

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

}

function changeGravity(newValue, max, graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;

    layout.simulator.gravity(parseInt(newValue));

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

}

function changeTheta(newValue, max, graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;

    layout.simulator.theta(parseInt(newValue) * 0.01);

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

}

function changeMass(newValue, max, graphObject){

    var renderer = graphObject.renderer;
    var graphGL = graphObject.graphGL;
    var layout = graphObject.layout;
    var graph = graphObject.graphInput;

    graphObject.graphGL.forEachNode(function(node){
        graphObject.layout.getBody(node.id).mass = graphObject.layout.getBody(node.id).defaultMass * ((graphObject.layout.getBody(node.id).defaultMass / parseFloat(newValue)));
    });

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

}

function adjustScale(graphObject){

            var layout = graphObject.layout;
            var renderer = graphObject.renderer;

            var graphRect = layout.getGraphRect();
            var graphSize = Math.min(graphRect.x2 - graphRect.x1, graphRect.y2 - graphRect.y1);
            var screenSize = Math.min(document.body.clientWidth, document.body.clientHeight);

            var desiredScale = screenSize / graphSize;

            zoomOut(desiredScale, 1, renderer);
        }

module.exports = {
    changeLogScale: changeLogScale,
    changeSpringLength: changeSpringLength,
    changeDragCoefficient: changeDragCoefficient,
    changeSpringCoefficient: changeSpringCoefficient,
    changeGravity: changeGravity,
    changeTheta: changeTheta,
    changeMass: changeMass,
    adjustScale: adjustScale
}
},{}],94:[function(require,module,exports){
//adjust Node Size
function NodeSize(newSize, max, graphObject){

    var renderer = graphObject.renderer;
    var graph = graphObject.graphInput;
    var graphics = graphObject.graphics;

    graph.nodes.forEach(function(node){
        var nodeUI = graphics.getNodeUI(node.key);

        nodeUI.size = nodeUI.backupSize + (nodeUI.backupSize * 2 * (parseInt(newSize) / parseInt(max))); 
    });

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }
}

//adjust Node Size
function LabelSize(newSize, graphObject, domLabels, type){

    var graph = graphObject.graphInput;
    var graphics = graphObject.graphics;

    if (type == 'node'){
        graph.nodes.forEach(function(node){
            var labelStyle = domLabels[node.key].style;
            labelStyle.fontSize = String(newSize) + 'px';
        });
    }
    else if (type == 'link'){
        graph.links.forEach(function(link){
            ID = link.source + "👉 " + link.target;
            var labelStyle = domLabels[ID].style;
            labelStyle.fontSize = String(newSize) + 'px';
        });
    }   
    
}

module.exports = {
	nodeSize: NodeSize,
	labelSize: LabelSize
}


},{}],95:[function(require,module,exports){
var layout_utils = require('./graph_layout/layout_functions.js');
var visual_utils = require('./graph_visual/visual_functions.js');
var adjustScale = require('./adjust_scale.js');
var events = require('./events/phyloviz_events.js');
var nlvGraph = require('phyloviz_nlv');
var splitTree = require('phyloviz_splittree');
var labels = require('./labels/phyloviz_labels.js');


module.exports = {
	layout: layout_utils,
	visual: visual_utils,
	nlv: nlvGraph,
	splitTree: splitTree,
	adjustScale: adjustScale,
	events: events,
	labels: labels
}
},{"./adjust_scale.js":91,"./events/phyloviz_events.js":92,"./graph_layout/layout_functions.js":93,"./graph_visual/visual_functions.js":94,"./labels/phyloviz_labels.js":96,"phyloviz_nlv":98,"phyloviz_splittree":99}],96:[function(require,module,exports){
function generateDOMLabels(graphObject){

var graphGL = graphObject.graphGL;
var graphics = graphObject.graphics;
var container = document.getElementById(graphObject.container);

var containerPosition = container.getBoundingClientRect();

var nodeLabels = Object.create(null);
      graphGL.forEachNode(function(node) {
        if (node.id.search('TransitionNode') < 0){
          var label = document.createElement('span');
          label.classList.add('node-label');
          label.innerText = node.id;
          nodeLabels[node.id] = label;
          container.appendChild(label);
        }
        
      });

  var countLinks = 0;
  var treeLinks = {};

  var linkLabels = Object.create(null);
  graphGL.forEachLink(function(link) {
      //console.log(link.id);
      var label = document.createElement('span');
      label.classList.add('link-label');
      label.innerText = parseFloat(link.data.connectionStrength.toFixed(4));
      treeLinks[link.id] = true;
      linkLabels[link.id] = label;
      container.appendChild(label);
      countLinks += 1;
    
    
  });

  graphObject.nodeLabels = nodeLabels;
  graphObject.linkLabels = linkLabels;
  graphObject.treeLinks = treeLinks;
  // NOTE: If your graph changes over time you will need to
  // monitor graph changes and update DOM elements accordingly
  //return [nodeLabels, linkLabels, treeLinks];

  graphObject.tovisualizeLabels = false;
  graphObject.tovisualizeLinkLabels = false;

  //$('.node-label').css('display','none');
  //$('.link-label').css('display','none');

  graphics.placeNode(function(ui, pos) {
      // This callback is called by the renderer before it updates
      // node coordinate. We can use it to update corresponding DOM
      // label position;

      // we create a copy of layout position
      var domPos = {
          x: pos.x,
          y: pos.y
      };
      // And ask graphics to transform it to DOM coordinates:
      graphics.transformGraphToClientCoordinates(domPos);

      // then move corresponding dom label to its own position:
      var nodeId = ui.node.id;
      if (nodeLabels[nodeId] != undefined){
        var labelStyle = nodeLabels[nodeId].style;
        labelStyle.left = domPos.x + 'px';
        labelStyle.top = domPos.y  + 'px';
        labelStyle.position = 'absolute';

        if (graphObject.tovisualizeLabels){

          if (domPos.y + containerPosition.top < containerPosition.top || domPos.y + containerPosition.top > containerPosition.bottom){
            labelStyle.display = "none";
          }
          else if (domPos.x + containerPosition.left < containerPosition.left || domPos.x + containerPosition.left*2 > containerPosition.right){
            labelStyle.display = "none";
          }
          else labelStyle.display = "block";

        }
      }
	});

  graphics.placeLink(function(ui, pos) {
          // This callback is called by the renderer before it updates
          // node coordinate. We can use it to update corresponding DOM
          // label position;
          newX = (ui.pos.from.x + ui.pos.to.x) / 2;
          newY = (ui.pos.from.y + ui.pos.to.y) / 2;

          // we create a copy of layout position

          var domPos = {
              x: newX,
              y: newY,
          };
          // And ask graphics to transform it to DOM coordinates:
          graphics.transformGraphToClientCoordinates(domPos);

          // then move corresponding dom label to its own position:
          var linkId = ui.idGL;

          if (linkLabels[linkId] != undefined){
            var labelStyle = linkLabels[linkId].style;
            labelStyle.left = domPos.x + 'px';
            labelStyle.top = domPos.y  + 'px';
            labelStyle.position = 'absolute';
            labelStyle.color = 'red';
            //console.log(labelStyle);

            if (graphObject.tovisualizeLinkLabels){

              if (domPos.y + containerPosition.top < containerPosition.top || domPos.y + containerPosition.top > containerPosition.bottom){
                labelStyle.display = "none";
              }
              else if (domPos.x + containerPosition.left < containerPosition.left || domPos.x + containerPosition.left*2 > containerPosition.right){
                labelStyle.display = "none";
              }
              else labelStyle.display = "block";

            }
          }
  });
}

module.exports = generateDOMLabels;
},{}],97:[function(require,module,exports){
function NLVgraph(graphObject, value) {

    var graphGL = graphObject.graphGL;
    var graph = graphObject.graphInput;
    var graphics = graphObject.graphics;
    var addedLinks = graphObject.addedLinks;
    var prevValue = graphObject.prevNLVvalue;
    var treeLinks = graphObject.treeLinks;
    var renderer = graphObject.renderer;

    value = parseInt(value);

    if (value < prevValue){
        for (i in addedLinks){
            if (addedLinks[i].data.value > value) {
                graphGL.removeLink(addedLinks[i]);
                delete addedLinks[i];
            }    
        }
    }
    else{

        countNodes = 0;
        nodesLength = graph.nodes.length;

        graphGL.forEachNode(function(node){

            for (i=1; i<graph.distanceMatrix[countNodes].length-1; i++){
                if (graph.distanceMatrix[countNodes][i] <= value && graph.distanceMatrix[countNodes][i] != 0){
                    targetIndex = parseInt(countNodes) + parseInt(i);

                    LinkID = graph.nodes[countNodes].key + "👉 " + graph.nodes[targetIndex].key;
                    if (addedLinks.hasOwnProperty(LinkID)){
                        continue;
                    }
                    if (!treeLinks.hasOwnProperty(LinkID)){

                        graphGL.addLink(graph.nodes[countNodes].key, graph.nodes[targetIndex].key, { connectionStrength: graph.distanceMatrix[countNodes][i] , value: graph.distanceMatrix[countNodes][i], color: "#00ff00"});
                        var link = graphGL.getLink(graph.nodes[countNodes].key, graph.nodes[targetIndex].key);

                        addedLinks[LinkID] = link;
                    }
                }
            }

            if (nodesLength > countNodes+2) countNodes += 1;
        });
    }
    prevValue = value;

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

    graphObject.addedLinks = addedLinks;
    graphObject.prevNLVvalue = prevValue;

}

module.exports = NLVgraph;
},{}],98:[function(require,module,exports){

var NLV_graph = require('./NLV_graph.js');

module.exports = NLV_graph;

},{"./NLV_graph.js":97}],99:[function(require,module,exports){
var splitTree = require('./splitTree.js');

module.exports = splitTree;
},{"./splitTree.js":100}],100:[function(require,module,exports){
function splitTree(graphObject, value) {
    //console.log(linkLabels);
    var graph = graphObject.graphGL;
    var graphics = graphObject.graphics;
    var removedLinks = graphObject.removedLinks;
    var prevValue = graphObject.prevSplitTreeValue;
    //var linkLabels = graphObject.linkLabels;
    //var tovisualizeLinkLabels = graphObject.tovisualizeLinkLabels;
    var treeLinks = graphObject.treeLinks;
    var renderer = graphObject.renderer;

    value = parseInt(value);
    if (value < prevValue){
        graph.forEachNode(function(node){
            graph.forEachLinkedNode(node.id, function(linkedNode, link) { 
                if (link.data.value >= value){
                    if (treeLinks.hasOwnProperty(link.id)){
                        //var labelStyle = linkLabels[link.id].style;
                        //labelStyle.display = "none";
                        removedLinks[link.id] = link;
                        graph.removeLink(link);
                    }
                }
             });
        });

    }
    else{
        for (i in removedLinks){
            if (removedLinks[i].data.value < value) {
                graph.addLink(removedLinks[i].fromId, removedLinks[i].toId, removedLinks[i].data);
                //if (tovisualizeLinkLabels){
                //    var labelStyle = linkLabels[removedLinks[i].id].style;
                //    labelStyle.display = "block";
                //}
                delete removedLinks[i];
            }    
        }
    }
    prevValue = value;

    if(graphObject.isLayoutPaused){
        renderer.resume();
        setTimeout(function(){ renderer.pause();}, 50);
    }

    graphObject.removedLinks = removedLinks;
    graphObject.prevSplitTreeValue = prevValue;

}

module.exports = splitTree;
},{}],101:[function(require,module,exports){
var randgen = require('randgen');

function generate_profiles(input_options, callback){

	var profile_length = 0;
	var profileNumbers = 0;
	var min = null;
	var max = null;
	var is_int = null;
	var profiles = [];
	var schemegenes = [];

	profile_length = input_options.profile_length || 7;
	min = input_options.min || 1;
	max = input_options.max || 7;
	profileNumbers = input_options.number_of_profiles || 10;
	mean = input_options.mean || 1;

	var randToUse = '';

	switch (input_options.distribution){
		case 'poisson':
			randToUse = 'rvpoisson';
			break;
		case 'norm':
			randToUse = 'rvnorm';
			break;
		case 'cauchy':
			randToUse = 'rvcauchy';
			break;
		case 'bernoully':
			randToUse = 'rvbernully';
			break;
		default:
			randToUse = 'rvnorm';
	}

	var firstProfile = true;

	for(i=0; i<profileNumbers; i++){
		var profileToUse = {};
		profileToUse["ID"] = String(i+1);
		if(firstProfile){
			firstProfile = false;
			schemegenes.push('ID');
			for(j=0; j<profile_length; j++){
				schemegenes.push(String(j+1));
			}
		}
		var newProfile = randgen[randToUse](profile_length);
		newProfile = newProfile.map(function(x){ return 1 + Math.abs(parseInt( mean * x ))});
		var count = 0;
		for(x in newProfile){
			count ++;
			profileToUse[String(count)] = String(newProfile[x]);
		}
		profiles.push(profileToUse);
	}

	var output = {};
	output.profiles = profiles;
	output.schemegenes = schemegenes;
	
	callback(output);
	
}

/*
var input_options = {
	profile_length: 4,
	number_of_profiles: 4,
	mean: 3,
	min: 1,
	max: 4,
	distribution: 'rvcauchy'
}


generate_profiles(input_options, function(output){
	console.log(output);
});
*/

module.exports = generate_profiles;


},{"randgen":102}],102:[function(require,module,exports){
// Export ./lib/randgen

module.exports = require("./lib/randgen");

},{"./lib/randgen":103}],103:[function(require,module,exports){
/*jslint indent: 2, plusplus: true, sloppy: true */
// Generate uniformly distributed random numbers
// Gives a random number on the interval [min, max).
// If discrete is true, the number will be an integer.
function runif(min, max, discrete) {
  if (min === undefined) {
    min = 0;
  }
  if (max === undefined) {
    max = 1;
  }
  if (discrete === undefined) {
    discrete = false;
  }
  if (discrete) {
    return Math.floor(runif(min, max, false));
  }
  return Math.random() * (max - min) + min;
}

// Generate normally-distributed random nubmers
// Algorithm adapted from:
// http://c-faq.com/lib/gaussian.html
function rnorm(mean, stdev) {
  var u1, u2, v1, v2, s;
  if (mean === undefined) {
    mean = 0.0;
  }
  if (stdev === undefined) {
    stdev = 1.0;
  }
  if (rnorm.v2 === null) {
    do {
      u1 = Math.random();
      u2 = Math.random();

      v1 = 2 * u1 - 1;
      v2 = 2 * u2 - 1;
      s = v1 * v1 + v2 * v2;
    } while (s === 0 || s >= 1);

    rnorm.v2 = v2 * Math.sqrt(-2 * Math.log(s) / s);
    return stdev * v1 * Math.sqrt(-2 * Math.log(s) / s) + mean;
  }

  v2 = rnorm.v2;
  rnorm.v2 = null;
  return stdev * v2 + mean;
}

rnorm.v2 = null;

// Generate Chi-square distributed random numbers
function rchisq(degreesOfFreedom) {
  if (degreesOfFreedom === undefined) {
    degreesOfFreedom = 1;
  }
  var i, z, sum = 0.0;
  for (i = 0; i < degreesOfFreedom; i++) {
    z = rnorm();
    sum += z * z;
  }

  return sum;
}

// Generate Poisson distributed random numbers
function rpoisson(lambda) {
  if (lambda === undefined) {
    lambda = 1;
  }
  var l = Math.exp(-lambda),
    k = 0,
    p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > l);

  return k - 1;
}

// Generate Cauchy distributed random numbers
function rcauchy(loc, scale) {
  if (loc === undefined) {
    loc = 0.0;
  }
  if (scale === undefined) {
    scale = 1.0;
  }
  var n2, n1 = rnorm();
  do {
    n2 = rnorm();
  } while (n2 === 0.0);

  return loc + scale * n1 / n2;
}

// Bernoulli distribution: gives 1 with probability p
function rbernoulli(p) {
  return Math.random() < p ? 1 : 0;
}

// Vectorize a random generator
function vectorize(generator) {
  return function () {
    var n, result, i, args;
    args = [].slice.call(arguments)
    n = args.shift();
    result = [];
    for (i = 0; i < n; i++) {
      result.push(generator.apply(this, args));
    }
    return result;
  };
}

// Generate a histogram from a list of numbers
function histogram(data, binCount) {
  binCount = binCount || 10;

  var bins, i, scaled,
    max = Math.max.apply(this, data),
    min = Math.min.apply(this, data);

  // edge case: max == min
  if (max === min) {
    return [data.length];
  }

  bins = [];

  // zero each bin
  for (i = 0; i < binCount; i++) {
    bins.push(0);
  }

  for (i = 0; i < data.length; i++) {
    // scale it to be between 0 and 1
    scaled = (data[i] - min) / (max - min);

    // scale it up to the histogram size
    scaled *= binCount;

    // drop it in a bin
    scaled = Math.floor(scaled);

    // edge case: the max
    if (scaled === binCount) { scaled--; }

    bins[scaled]++;
  }

  return bins;
}

/**
 * Get a random element from a list
 */
function rlist(list) {
  return list[runif(0, list.length, true)];
}

exports.runif = runif;
exports.rnorm = rnorm;
exports.rchisq = rchisq;
exports.rpoisson = rpoisson;
exports.rcauchy = rcauchy;
exports.rbernoulli = rbernoulli;
exports.rlist = rlist;

exports.rvunif = vectorize(runif);
exports.rvnorm = vectorize(rnorm);
exports.rvchisq = vectorize(rchisq);
exports.rvpoisson = vectorize(rpoisson);
exports.rvcauchy = vectorize(rcauchy);
exports.rvbernoulli = vectorize(rbernoulli);
exports.rvlist = vectorize(rlist);

exports.histogram = histogram;

},{}]},{},[1]);
