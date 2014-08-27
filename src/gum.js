/**
 *
 *  gum/gum.js
 *  (c) Jorge Bucaran 2014
 *
 *  Use to create objects that represent either functions or symbols
 *  like constants, variables or operators and link them together in
 *  a conditional chain that returns the resulting PHP expression's
 *  string.
 *
 *    a.is.not.b.or.c.is.f('data')
 *   ↓
 *    'a !== b && c === f("data")'
 *\
 */
$ = function(name, value) {
  $.default = {
    symbols: {
      /**
       *
       *  Invokes @callback for each property in $.default.symbols.
       *
       *  @since 0.0.1
       */
      each: function(callback){
        for (var index in this) {
          if (!(this[index] instanceof Function)) {
            callback(index, this[index]);
          }
        }
      },
      not     : '!',
      and     : '&&',
      or      : '||',
      mod     : '%',
      pow     : '**',
      is      : '===',
      gt      : '>',
      greater : '>',
      lt      : '<',
      less    : '<',
      than    : ' ',
      inc     : '++',
      dec     : '--',
      plus    : '+',
      minus   : '-',
      times   : '*',
      by      : '/'
    }
  };
  /*
   *  New nodes are added here and existing nodes are bound to them.
   */
  $.nodes || ($.nodes = []);
  /*
   *  Only for array like objects.
   */
  this.length = null;
  /*
   *  If value is null, this.add will create a function node. This value
   *  will change as the node chain is built while the original value is
   *  kept in symbol.
   */
  this.name = name, this.symbol = value, this.value = value;
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
   */
  this.add = function(name, value) {
    if (this.hasOwnProperty(name)) return;
    if (value) {
      Object.defineProperty(this, name, {
        get: function() {
          if (value === "!" && this.value.substr(-3) === '===') {
          /*
           *  Allows is.not to echo !==
           */
            this.value = this.value.slice(0,-3) + value + '==';

          } else if ((value === '>' || value === '<') &&
                     this.value.substr(-3) === '===') {
          /*
           *  Allows is.greater/less to echo >/< instead of ===>/<
           */
            this.value = this.value.slice(0,-3) + value ;
          } else {
            /*
             *  Buffer @value each time the property is accessed.
             */
            this.value += value;
          }
          return this;
        }
      });
    } else {
      this[name] = $.defineFunction(this, name);
      /*
       *  Create a function with @name in the current node. $.defineFunction
       *  returns a function that can be called with any parameters and will
       *  evaluate to a string such as a myFunc(['arg', ...]).
       */
    }
  };
  /**
   *
   *  Appends @value to the expression string.
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
   *  Returns value[index]. Wraps @index in quotes if String.
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
   *  Returns the replacing of all nodes with @symbol with @append + @symbol.
   *
   *  @since 0.0.1
   */
  this.cat = function(symbol,append) {
    symbol = symbol || '$';
    append = append || '.';
    this.value = this.value.split(symbol).join(append+symbol).slice(1);
    return this;
  };
  /*
   *  Add default operators.
   */
  ~function(node){
    $.default.symbols.each(function(name, value) {
      node.add(name, value);
    });
  }(this);
  /*
   *  Links This to all nodes and all nodes to This.
   */
  ~function(node) {
    $.nodes.push(node);
    for (var i in $.nodes) {
      for (var j in $.nodes) {
        $.nodes[i].add($.nodes[j].name, $.nodes[j].value);
      }
    }
  }(this);
};
/**
 *
 *  Returns the string representation of the node chain. Runs when the last
 *  node of a chain is evaluated. Resets value to the node's symbol in the
 *  case of operator / variable nodes, or name for functions.
 *
 *  @since 0.0.1
 */
$.prototype.toString = function() {
// なぜPROTOTYPEなんだ？
  var value = this.value;
  this.value = this.symbol || this.name;
  return value;
};
/**
 *
 *  Helper for $.F. Returns a function that appends name or node.name to
 *  the value string and returns the node.
 *
 *  Sets node.value to A + B + C and returns it where:
 *
 *    - A is the expression string up to this node.
 *
 *    - B is the function's name; node.name for root nodes created by $.F
 *      or name for dynamically added functions with this.add.
 *
 *    - C is the list of arguments passed to the returned function in the
 *      format ($0, $1, $2,...)
 *
 *  @since 0.0.1
 */
$.defineFunction = function(node, name) {
  return function() {
    if (!name) node.value = '';
    /*
     *  Reset value when starting a new node chain.
     */
    return node.value = (node.value || '')  +
                        (name || node.name) +
                        $.util.args(arguments);
  };
};
/**
 *
 *  Returns a function node and adds the node to $.
 *
 *  @name String e.g, myFunc
 *
 *  @since 0.0.1
 */
$.F = function(name) {
  return $[name] = $.defineFunction(new $(name));
};
/**
 *
 *  Returns a symbol node, (variables, arrays, operators) and adds the
 *  node to $.
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
 *  Namespace for general purpose string, parsing, etc. utitilities.
 *
 *  @since 0.0.1
 */
$.util = {};
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
 *  Wraps text in PHP tags as described below.
 *
 *  [$0]<?php {[$0 | $1]} [{$3 | ;}] ?>[$2]
 *
 *  @since 0.0.1
 */
$.util.php = function() {
  var pre = '', php = '', pos = '', tok = ';';
  if (arguments.length > 0) {
    php = arguments[0];
  }
  if (arguments.length > 1) {
    pre = arguments[0];
    php = arguments[1];
  }
  if (arguments.length > 2) {
    pos = arguments[2];
  }
  if (arguments.length > 3) {
    tok = arguments[3];
  }
  return pre + '<?php ' + php + tok + ' ?>' + pos;
};
/**
 *
 *  For a string such as 'element#id.class1.class2' returns an object:
 *
 *  { name  : 'element'
 *    id    : 'id'
 *    class : 'class1 class2' }
 *
 *  @since 0.0.1
 */
$.util.tag = function(s) {
  var name = '', id = null, _class = null,
      tok = '', ch = '', buffer = '';
  /*
   *  name, id and _class store the element properties as s is parsed.
   *  tok holds the tok character
   */
  if (s[0] === '.' || s[0] === '#') {
  /*
   *  Allow .#id.class to be be parsed as div#id.class.
   */
    s = 'div' + s;
  }
  for (var i = 0; i <= s.length; i++) {
    if (i === s.length) {
      ch = tok || ' ';
      /*
       *  If this is the last iteration, set ch to the last . or # token.
       *  If there was no token s only holds a name, so add a blank space.
       */
    } else {
      ch = s[i];
    }
    buffer += ch;
    if (ch === '.' || ch === '#' || i === s.length) {
    /*
     *  The current character is either . # or this is the last iteration.
     *  Reset the buffer and store the token for the next cycle.
     */
      if (name === '') {
        name = buffer.slice(0,-1);
      } else if (tok === '.') {
          _class = (_class || '') + buffer.slice(0,-1) + ' ';
      } else if (tok === '#') {
        id = buffer.slice(0,-1);
      }
      tok = ch, buffer = '';
    }
  }
  return {
    name: name,
    id: id,
    class: _class ? _class.slice(0,-1) : _class
    /*
     *  Trim the extra white space.
     */
  };
};
/**
 *
 *  Creates a node for the the not ! unary operator.
 *
 *  @since 0.0.1
 */
$.S('not', '!');