// Guidelines for creating JS objects/classes

/**
 *
 *  gum/cherry.js
 *  (c) Jorge Bucaran 2014
 *
 *  Use to create objects that represent either functions or symbols
 *  like constants, variables or operators and link them together in
 *  a conditional chain that returns the resulting PHP expression's
 *  string.
 *
 *    console.log( a.is.not.b.or.c.is.f('data') );
 *   ↓
 *    'a !== b && c === f("data")'
 *
 *  @this.name     of the node. (myVar, myFunc, %)
 *  @this.value    of the expression string up to this node.
 *  @this.symbol   of the node in case of operators.
 */
$ = function(name, value) {
  /*
   *  Only for array or dictionary objects.
   */
  this.length = null;
  /*
   *  If value is null, this.add will create a function node.
   *  This value will change as the node chain is built while
   *  the original value is kept in symbol.
   */
  this.name = name, this.symbol = value, this.value = value;
  /*
   *  Every new node is added here. The list is then parsed and
   *  This is linked to all nodes and all nodes to This.
   */
  $.nodes || ($.nodes = []);
  /**
   *
   *  If value exists define a property in the node with the specified
   *  name and value (value == name in case of variables), else define
   *  a function with the name. The get function appends value to this
   *  and returns itself creating a node chain where the last node has
   *  the result of concatenating all values. Functions work similarly
   *  returning another function that appends the name and the list of
   *  arguments to the node's value and returns it.
   *
   *  @since 0.0.1
   *
   */
  this.add = function(name, value) {
    if (this.hasOwnProperty(name)) return;

    if (value) {
      Object.defineProperty(this, name, {
        get: function() {
          if (value === "!" && this.value.substr(-3) === '===') {
          /*
           *  If node is ! fix the output if the last node
           *  was === to allow is.not to echo !==.
           */
            this.value = this.value.slice(0,-3) + value + '==';

          } else if ((value === '>' || value === '<') &&
                     this.value.substr(-3) === '===') {
          /*
           *  If node is > or < fix the output if the last node was
           *  === to allow is.greater.than , etc.
           */
          this.value = this.value.slice(0,-3) + value ;
          } else {
            /*
             *  This is the current node in the chain and value is
             *  the next value to append to the expression string
             *  returned by this.toString when the last node in a
             *  chain is evaluated.
             */
            this.value += value;
          }
          return this;
        }
      });// ~ Object.defineProperty
    } else {
      this[name] = $.util.defineFunction(this, name);
      /*
       *  name !== this.name when binding the current node to
       *  every other node in $.nodes. Note that passing null
       *  as name to $.util.defineFunction will use this.name
       *  instead, so it is used only when creating nodes for
       *  the first time.
       */
    }
  };
  /**
   *
   *  ..
   *
   *  @since 0.0.1
   *
   */
  this._ = function(value) {
    this.value += $.util.qstr(value);
    return this;
  };
  /**
   *
   *  ..
   *
   *  @since 0.0.1
   *
   */
  this.at = function(index) {
    this.value += "[" + $.util.qstr(index) + "]";
    return this;
  };
  /**
   *
   *  Concats all nodes and returns the result separated by @set.
   *
   *  @since 0.0.1
   */
  this.cat = function(sep) {
    sep = sep || '.';
    this.value = this.value.replace(/\$/g, sep + '$').slice(sep.length);
    return this;
  };
  /*
   *  Adds basic operators ! && || ===
   */
  (function(node) {
    node.add('not', '!');
    node.add('and', '&&');
    node.add('or', '||');
    node.add('is', '===');
    node.add('gt', '>');
    node.add('greater', '>');
    // node.add('more', '>');
    node.add('lt', '<');
    node.add('less', '<');
    node.add('than', ' ');


    // node.add('cat', '.');


  })(this);
  /*
   *  Links This to all nodes and all nodes to This.
   */
  (function(node) {
    $.nodes.push(node);
    for (var i in $.nodes) {
      for (var j in $.nodes) {
        $.nodes[i].add($.nodes[j].name, $.nodes[j].value);
      }
    }
  })(this);
};
/**
 *
 *  Returns the string representation of the node chain.
 *  Runs when the last node of a chain is evaluated.
 *
 *  Resets value to the node's symbol for operators and
 *  variables, or name for functions.
 *
 *  @since 0.0.1
 */
$.prototype.toString = function() { // why prototype?
  var value = this.value;
  this.value = this.symbol || this.name;
  return value;
};
/**
 *
 *
 *  @since 0.0.1
 */
$.util = {};
/**
 *
 *  Helper for $.F. Returns a function that appends name or node.name
 *  to the value string and returns the node.
 *
 *  Sets node.value to A + B + C and returns it where:
 *    - A is the expression string up to this node.
 *
 *    - B is the function's name; node.name for root nodes created by
 *      $.F or name for dynamically added functions with this.add.
 *
 *    - C is the list of variable arguments passed to the returned
 *      function formatted like ($0, $1, $2,...)
 *
 *  Nodes can be used in two ways, 1 for the first time, when the node
 *  is at the root of the expression or 2 when the node appears inside
 *  an expression.
 *
 *  The function for 1 is created by $.F that calls $.util.defineFunction
 *  without name, so the name is taken from node.name. This function runs
 *  when using a node at the root of an expression. ->root().node().node()
 *
 *  The return function for (2) is created by $ this.add when binding nodes
 *  with every other node in $.nodes.
 *
 *  @since 0.0.1
 */
$.util.defineFunction = function(node, name) {
  return function() {
    if (!name) node.value = '';
    /*
     *  Reset value string when starting a new node chain
     *  in $ node function calls, i.e., when name is null.
     */
    node.value = (node.value || '')   +
                 (name || node.name)  +
                 $.util.args(arguments);
    return node;
  };
};
/**
 *
 *  Returns "value".
 *
 *  @value Mixed Data to quote.
 *
 *  @since 0.0.1
 */
$.util.q = function(value) {
  return '"' + (value || '') + '"';
};
/**
 *
 *  If value is a string returns "value".
 *
 *  @value Mixed Data to quote.
 *
 *  @since 0.0.1
 */
$.util.qstr = function(value) {
  return (typeof value === 'string' ? $.util.q(value) : value);
};
/**
 *
 *  Returns a string like ($0, $1, ...) from a JavaScript
 *  arguments array-like object. Any items of String type
 *  are quoted.
 *
 *  @args Arguments.
 *
 *  @since 0.0.1
 */
$.util.args = function(args) {
  for (var index in args) {
    // (typeof args[i] !== 'string') || (args[i] = $._q(args[i]));
    args[index] = this.qstr(args[index]);
  }
  return '(' + [].join.call(args,',') + ')';
};
/**
 *
 *  Returns an associative array declaration string and its length
 *  packed in an object.
 *
 *  @since 0.0.1
 */
$.util.assoc = function(object) {
  var output = '[', length = 0;
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      output +=  $.util.q(prop) + '=>' + object[prop] + ',';
      length++;
    }
  }
  if (length > 0) {
    output = output.slice(0,-1);
  }
  return { output: output + "]", length: length };
};
/**
 *
 *  Returns the property at @index in @object.
 *
 *  @since 0.0.1
 */
 $.util.propAt = function(index, object) {
  var count = 1;
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      if (index === count++) return prop;
    }
  }
};
/**
 *
 *  Creates a node and calls $.util.defineFunction() without a name to
 *  get the function that runs only for root nodes, ie., when starting
 *  a new node chain.
 *
 *  @name String e.g, myFunc
 *
 *  @since 0.0.1
 */
$.F = function(name) {
  return $[name] = $.util.defineFunction(new $(name));
};
/**
 *
 *  Returns a symbol $ node; operators or variables
 *  and adds the node to the global $ namespace.
 *
 *  @name  String e.g, mod, plus, the_key
 *  @value String for example; %, +, posts['key']
 *
 *  @since 0.0.1
 */
$.S = function(name, value) {
  return $[name] = new $(name, value || name) ;
};
/**
 *
 *  Declare $ symbol for the not ! unary operator
 *  and adds the node to the global $ namespace.
 *
 *  @since 0.0.1
 */
not = $.S('not', '!');
