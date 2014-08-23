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
 *
 *  @since 0.0.1
 *
 */
$ = function(name, value) {
  this.name = name, this.symbol = value;
  /*
   *  If value = null, this.add will create a function node when
   *  be created, else this.symbol will keep the original value
   *  while this.value will change as the node chain is built.
   */
  this.value = value;
  /*
   *  Every new node is added here. The list is then parsed and
   *  This is linked to all nodes and all nodes to This.
   */
  $.nodes || ($.nodes = []);
  /*
   *  If value exists define a property in the node with the specified
   *  name and value (value == name in case of variables), else define
   *  a function with the name. The get function appends value to this
   *  and returns itself creating a node chain where the last node has
   *  the result of concatenating all values. Functions work similarly
   *  returning another function that appends the name and the list of
   *  arguments to the node's value and returns it.
   */
  this.add = function(name, value) {
  /*
   *  this.add() is called when creating a new node to add the default
   *  operators and bind all existing nodes with each other.
   */
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
           *  If node is > or < fix the output if the last
           *  node was === to allow is.greater.than , etc.
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
          /*
           * Links nodes like node.node.node
           */
          return this;
        }
      });// ~ Object.defineProperty
    } else {
      this[name] = $.func(this, name);
      /*
       *  name !== this.name when binding the current node to
       *  every other node in $.nodes. Note that passing null
       *  as name to $.func will use this.name instead, so it
       *  is used only when creating nodes for the first time.
       */
    }
  };
  /*
   *  Add the equals operator. e.g., a.equals(5) -> a === 5
   */
  this.equals = function(it) {
    var op = this.value.slice(-1) === '!' ? '==' : '===';
    this.value += op + (typeof it === 'string' ? $.quote(it) : it);
    return this;
  };
  /*
   *  Add the than function to match greater and less operators.
   */
  this.than = function(it) {
    this.value += (typeof it === 'string' ? $.quote(it) : it);
    return this;
  };
  /*
   *  Add basic operators ! && || ===
   */
  (function(node) {
    node.add('not', '!');
    node.add('and', '&&');
    node.add('or', '||');
    node.add('is', '===');
    node.add('greater', '>');
    node.add('more', '>');
    node.add('less', '<');
  })(this);
  /*
   *  @bind: Link This to all nodes and all nodes to This.
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
 *  $.quote = function(text)
 *
 *  Returns text surrounded by single quotes.
 *
 *  @text to quote.
 *
 *  @since 0.0.1
 *
 */
$.quote = function(text) {
  return "'" + (text || '') + "'";
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
$.prototype.toString = function() {
  var value = this.value;
  this.value = this.symbol || this.name;
  return value;
};
/**
 *
 *  Helper for $.F. Returns a function that appends name
 *  | node.name to the value string and returns the node.
 *
 *  Sets node.value to A + B + C and returns it where:
 *    - A is the expression string up to this node.
 *
 *    - B is the function's name; node.name for root
 *      nodes created by $.Fun or name for dynamically
 *      added functions in @bind via this.add.
 *
 *    - C is the list of variable arguments passed to the
 *      returned function formatted like ($0, $1, $2,...)
 *
 *  Nodes can be used in two ways, (1) for the first time,
 *  when the node is at the root of the expression or (2)
 *  when the node appears inside an expression.
 *
 *  The return function for (1) is created by $.Fun that
 *  calls $.func without name, so the name is taken from
 *  node.name. This function is run when using a node at
 *  the root of an expression. ->root().node().node()
 *
 *  The return function for (2) is created by $ this.add
 *  when binding nodes with every other node in $.nodes.
 *
 *  @since 0.0.1
 */
$.func = function(node, name) {
  return function() {
    if (!name) node.value = '';
    /*
     *  Reset value string when starting a new node chain,
     *  in $ node function calls; when name is null.
     */
    node.value = (node.value || '')   +
                 (name || node.name)  +
                 $.argsToString(arguments);
    return node;
  };
};
/**
 *
 *  Returns a function $ node. Creates a node and calls
 *  $.func() without a name to get a function that runs
 *  only for root nodes; when starting a new node chain.
 *
 *  @name String e.g, myFunc
 *
 *  @since 0.0.1
 *
 */
$.F = function(name) {
  return $.func(new $(name));
};
/**
 *
 *  Returns a symbol $ node; operators or variables.
 *
 *  @name  String e.g, mod, plus, the_key
 *  @value String for example; %, +, posts['key']
 *
 *  @since 0.0.1
 *
 */
$.S = function(name, value) {
  return new $(name, value || name);
};
/**
 *
 *  Declare $ symbol for the not ! unary operator.
 *
 *  @since 0.0.1
 *
 */
not = $.S('not', '!');
/**
 *
 *  Returns a string like ($0, $1, ...) from an array of
 *  strings. Objects of String type are quoted.
 *
 *  @args Array of strings.
 *
 *  @since 0.0.1
 *
 */
$.argsToString = function(args) {
  for (var i in args) {
    (typeof args[i] !== 'string') || (args[i] = $.quote(args[i]));
  }
  return '(' + [].join.call(args,',') + ')';
};
