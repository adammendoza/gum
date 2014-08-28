/*
 *  gum/gum.js
 *  (c) Jorge Bucaran 2014
 *
 *  Create objects that represent either functions or symbols like constants,
 *  variables or operators and link them together in a conditional chain that
 *  returns the resulting PHP expression's string.
 *
 *    a.is.not.b.or.c.is.f('data')
 *   ↓
 *    'a !== b && c === f("data")'
 */
'use strict';
/*
 *  Alias for $.Function and $.Symbol. Returns a function $.Node and adds it
 *  to the $ namespace. If a value is passed creates a symbol node instead.
 *
 *  @since 0.0.1
 */
$ = function(name, value) {
  return value ? $.Symbol(name, value) : $.Function(name);
};
/*
 *  Returns a function $.Node and adds it to the $ namespace.
 *
 *  @name String e.g, myFunc
 *
 *  @since 0.0.1
 */
$.Function = function(name) {
  return $[name] = $.private.defineFunction(new $.Node(name));
};
/*
 *  Returns a symbol $.Node and adds it to the $ namespace.
 *
 *  @name  String mod, plus, myVar
 *  @value String %, +, $myVar (Optional)
 *
 *  @since 0.0.1
 */
$.Symbol = function(name, value) {
  return $[name] = new $.Node(name, value || name) ;
};
/*
 *  Namespace for internal use-only functions and data.
 *
 *  @since 0.0.1
 */
$.private = {};
/*
 *  Helper for $.Function. Returns a function that appends name or
 *  node.name to the value string and returns the node.
 *
 *  Sets node.value to A + B + C where:
 *
 *    - A is the expression string up to this node.
 *
 *    - B is the function's name.
 *
 *    - C is the list of arguments passed to the returned function like
 *      ($0, $1, $2,...)
 *
 *  @since 0.0.1
 */
$.private.defineFunction = function(node, name) {
  return function() {
    if (!name) node.value = '';
    /*
     *  Reset value when starting a new node chain.
     */
      node.value = (node.value || '')  +
                   (name || node.name) +
                   $.util.argsToList(arguments);
      return node;
  };
};
/*
 *  Namespace for configurable properties such as default operators,
 *  and storing static data.
 *
 *  @since 0.0.1
 */
$.global = {};
/*
 *  New nodes are added here and existing nodes are bound each time a
 *  new $.Node object is instantiated via $.Function or $.Symbol.
 */
$.global.nodes = [];
/*
 *  Aliases for PHP default operators.
 */
$.global.symbols = {
  not     : '!'   ,   null      : 'null'  ,
  or      : '||'  ,   and       : '&&'    ,
  pow     : '**'  ,   mod       : '%'     ,
  gt      : '>'   ,   greater   : '>'     ,
  lt      : '<'   ,   less      : '<'     ,
  than    : ' '   ,   is        : '==='   ,
  inc     : '++'  ,   dec       : '--'    ,
  plus    : '+'   ,   minus     : '-'     ,
  times   : '*'   ,   by        : '/'
};
/*
 *  Invokes @callback for each property in $.global.symbols.
 *
 *  @since 0.0.1
 */
$.global.symbols.forEach = function(callback){
  for (var prop in this) {
    if (!(this[prop] instanceof Function)) {
      callback(prop, this[prop]);
    }
  }
};
/*
 *  Main $.Node definition. Calls $.Node.prototype.add for each symbol in
 *  $.global.symbols and for each node in $.globals.nodes.
 */
$.Node = function(name, value) {
  this.length = null; // Only for array symbol nodes.
  this.name = name;
  this.value = value, this.symbol = value; // Null in function nodes.

  // Adds the symbols defined in $.global.symbols to the instance.
  +function(node){
    $.global.symbols.forEach(function(name, value) {
      node.add(name, value);
    });
  }(this);

   // Adds the instance to each node in $.global.nodes and viceversa.
  +function(node) {
    $.global.nodes.push(node);
    for (var i in $.global.nodes) {
      for (var j in $.global.nodes) {
        $.global.nodes[i].add($.global.nodes[j].name, $.global.nodes[j].value);
      }
    }
  }(this);
};
/*
 *  Returns the string representation of the node chain when the last node
 *  of a chain is evaluated. Resets this.value to its original value, name
 *  for function nodes and symbol for symbol nodes.
 *
 *  @since 0.0.1
 */
$.Node.prototype.toString = function() {
  var value = this.value;
  this.value = this.symbol || this.name;
  return value;
};
/*
 *  Creates a new property or function in the current instance with name
 *  and/or value. When either the function or property is evaluated, the
 *  value is appended to the instance and the node is returned.
 *
 *  @since 0.0.1
 */
$.Node.prototype.add = function(name, value) {
  if (this.hasOwnProperty(name)) return;
  if (value) {
    Object.defineProperty(this, name, {
      get: function() {
        if (value === "!" && this.value.substr(-3) === '===') {
        // is.not should echo !==
          this.value = this.value.slice(0,-3) + value + '==';

        } else if ((value === '>' || value === '<') &&
                  this.value.substr(-3) === '===') {
        //is.greater/less should echo >/< instead of ===>/<
          this.value = this.value.slice(0,-3) + value ;

        } else {
          this.value += value;
        }
        return this;
      }
    });
  } else {
    this[name] = $.private.defineFunction(this, name);
  }
};
/*
 *  Creates a node for the the not ! unary operator.
 *
 *  @since 0.0.1
 */
$('not', '!');
/**
 *
 *  Appends @value to the expression string.
 *
 *  @since 0.0.1
 *
 */
$.Node.prototype._ = function(value) {
  this.value += $.util.quoteString(value);
  return this;
};
/**
 *
 *  Returns value[index]. Wraps @index in quotes if String.
 *
 *  @since 0.0.1
 *
 */
$.Node.prototype.at = function(index) {
  this.value += "[" + $.util.quoteString(index) + "]";
  return this;
};
/**
 *
 *  Updates value replacing @symbol with @append + @symbol in all nodes.
 *
 *  @since 0.0.1
 */
$.Node.prototype.cat = function(symbol,append) {
  symbol = symbol || '$';
  append = append || '.';
  this.value = this.value.split(symbol).join(append+symbol).slice(1);
  return this;
};
/*
 *  Namespace for general purpose string, parsing, etc. utitilities.
 *
 *  @since 0.0.1
 */
$.util = {};
/*
 *  Returns "value".
 *
 *  @value Mixed Data to quote.
 *
 *  @since 0.0.1
 */
$.util.quote = function(value) {
  return '"' + (value || '') + '"';
};
/*
 *  If value is a string returns "value".
 *
 *  @value Mixed Data to quote.
 *
 *  @since 0.0.1
 */
$.util.quoteString = function(value) {
  return (typeof value === 'string') ? $.util.quote(value) : value;
};
/*
 *  Escape quotes in @value and returns it.
 *
 *  @since 0.0.1
 */
$.util.escapeQuotes = function(value) {
  return value.replace(/&quot;/g, '"');
}
/*
 *  Converts a JavaScript arguments array-ish object to a string
 *  representation and quotes items of String type.
 *
 *  @args Arguments.
 *
 *  @since 0.0.1
 */
$.util.argsToList = function(args) {
  for (var index in args) {
    // (typeof args[i] !== 'string') || (args[i] = $._q(args[i]));
    args[index] = this.quoteString(args[index]);
  }
  return '(' + [].join.call(args,',') + ')';
};
/*
 *  Converts a JavaScript object to a PHP dictionary declaration and
 *  returns an object like { output: String, length: Number }
 *
 *  @since 0.0.1
 */
$.util.jsToDictionary = function(array) {
  console.log(array);
  var output = '[', length = 0;
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      output +=  $.util.quote(prop) + '=>' + object[prop] + ',';
      length++;
    }
  }
  if (length > 0) {
    output = output.slice(0,-1);
  }
  return { output: output + "]", length: length };
};
/*
 *  Returns the property at @index in @object.
 *
 *  @since 0.0.1
 */
 $.util.has = function(object, index) {
  index = index || 1
  var count = 1;
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      if (index === count++) return prop;
    }
  }
  return null;
};
/*
 *  Wraps text in PHP tags as described below.
 *
 *  [$0]<?php {[$0 | $1]} [{$3 | ;}] ?>[$2]
 *
 *  @since 0.0.1
 */
$.util.php = function () {
  var pre = '<?php ', php = '', pos = ' ?>';
  if (arguments.length > 0) php = arguments[0];
  if (arguments.length > 1) {
    pre = php + pre;
    php = arguments[1];
  }
  if (arguments.length > 2) pos += arguments[2];
  return pre + php + (arguments.length > 3 ? arguments[3] : ';') + pos;
}
/*
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
  // Allow .#id.class to be be parsed as div#id.class.
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
    // Trim the extra white space.
  };
};
/*
 *  Namespace for PHP HTTP method global arrays.
 *
 *  @since 0.0.1
 */
$.method = {};
/*
 */
$.method.Post = function(name) {
  return '$_POST[' + $.util.quote(name) + ']';
};
$.method.Get = function(name) {
  return '$_GET[' + $.util.quote(name) + ']';
};

