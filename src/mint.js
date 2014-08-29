/*
 *  gum/mint.js
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
 *  General utilities used across the class.
 *
 *  @since 0.0.1
 */
$.util = {/* ♥ */};
/*
 *  Returns true if @value is undefined.
 *
 *  @since 0.0.1
 */
$.util.undefined = function(value) {
  return typeof value === 'undefined';
};
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
$.util.jsToDictionary = function(object) {
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
 *  Alias for $.Function(name)() and $.Symbol. Creates a function $.Node,
 *  and returns its result. If a value is passed, creates a symbol $.Node
 *  and returns the object instead.
 *
 *  @since 0.0.1
 */
function $(name, value) {
  return $.util.undefined(value) ? $.Function(name) : $.Symbol(name, value);
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
  // console.log("__"+name+"___"+(value||'.')+"__")
  return $[name] = new $.Node(name, value || '') ;
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
 *  Namespace for global properties, default operators, superglobals.
 *
 *  @since 0.0.1
 */
$.global = {
  Globals : '$GLOBALS'  ,   Post    : '$_POST'    ,
  Server  : '$_SERVER'  ,   Get     : '$_GET'     ,
  Post    : '$_POST'    ,   Files   : '$_FILES'   ,
  Cookie  : '$_COOKIE'  ,   Session : '$_SESSION' ,
  Request : '$_REQUEST' ,   Env     : '$_ENV'
};
/*
 *  New nodes are added here and existing nodes are bound each time a
 *  new $.Node object is instantiated via $.Function or $.Symbol.
 */
$.global.nodes = [];
/*
 *  Aliases for default operators.
 */
$.global.symbols = {
  not     : '!'   ,   null      : 'null'  ,
  or      : '||'  ,   and       : '&&'    ,
  pow     : '**'  ,   mod       : '%'     ,
  gt      : '>'   ,   greater   : '>'     ,
  lt      : '<'   ,   less      : '<'     ,
  than    : ''    ,   is        : '==='   ,
  inc     : '++'  ,   dec       : '--'    ,
  plus    : '+'   ,   minus     : '-'     ,
  times   : '*'   ,   by        : '/'     ,
  append  : '.='  ,   concat    : '.'     ,
  equal   : '='
};
/*
 *  Returns the superglobal alias for @name[@value].
 *
 *  @since 0.0.1
 */
$.global.get = function(name, value) {
  return name.toUpperCase() + '[' + $.util.quoteString(value) + ']';
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
 *  Main $.Node definition. Calls $.Node.prototype.new for each symbol in
 *  $.global.symbols and for each node in $.globals.nodes.
 */
$.Node = function(name, value) {
  this.length = null; // Only for array symbol nodes.
  this.name = name;
  this.value = value, this.symbol = value; // Undefined for function nodes.

  // Adds the symbols defined in $.global.symbols to the instance.
  +function(node){
    $.global.symbols.forEach(function(name, value) {
      node.new(name, value);
    });
  }(this);

   // Adds the instance to each node in $.global.nodes and viceversa.
  +function(node) {
    $.global.nodes.push(node);
    for (var i in $.global.nodes) {
      for (var j in $.global.nodes) {
        $.global.nodes[i].new($.global.nodes[j].name, $.global.nodes[j].value);
      }
    }
  }(this);
};
/*
 *  Returns the string representation of the node chain. It's called when the
 *  last node in a chain is to be evaluated as a text value or when an object
 *  is referred to in a manner in which a string is expected. Resets value to
 *  its original value; @name for function nodes or @symbol for symbol nodes.
 *
 *  @since 0.0.1
 */
$.Node.prototype.toString = function() {
  var value = this.value;
  this.value = $.util.undefined(this.symbol) ? this.name : this.symbol;
  return value;
};
/*
 *  Alias for node.toString(). $.node.node.node.$
 *
 *  @since 0.0.1
 */
Object.defineProperty($.Node.prototype, '$', {
  get: function() { return this.toString(); }
});
/*
 *  Creates a new property or function in the current instance with name
 *  and/or value. When either the function or property is evaluated, the
 *  value is appended to the instance and the node is returned.
 *
 *  @since 0.0.1
 */
$.Node.prototype.new = function(name, value) {
  if (this.hasOwnProperty(name)) return;

  if ( $.util.undefined(value) ) {
    this[name] = $.private.defineFunction(this, name);
  } else {
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
  }
};
/*
 *  Creates a node for the the not ! unary operator.
 *
 *  @since 0.0.1
 */
$.Symbol('not', '!');
/*
 *  Semantic node. It's empy but it allows:
 *
 *  $.myVar.be(X) or $.myVar.equal._(X)  →  $.let.myVar.be(10)
 *
 *  @since 0.0.1
 */
$.Symbol('let');
/*
 *  Appends @value to the expression string.
 *
 *  @since 0.0.1
 */
$.Node.prototype._ = function(value) {
  if (value instanceof Array) {

  } else if (value instanceof Object) {

  }
  this.value += $.util.quoteString(value);
  return this;
};
/*
 *  Alias for node._(). Convenient when writing $.myVar.greater.equal.to()
 *
 *  @since 0.0.1
 */
$.Node.prototype.to = function(value) {
  return this._(value);
};
/*
 *  Alias for node.equal._(). Use with $.let to improve code readability.
 *
 *  @since 0.0.1
 */
$.Node.prototype.be = function(value) {
  return this.equal._(value);
};
/*
 *  Returns value[index] as a string. Wraps @index in quotes if index is
 *  of type String.
 *
 *  @since 0.0.1
 *
 */
$.Node.prototype.at = function(index) {
  this.value += "[" + $.util.quoteString(index) + "]";
  return this;
};
/*
 *  Updates value replacing @symbol with @append + @symbol in all nodes.
 *
 *  $.s1.s2.s3.s4.cat
 *
 *  @since 0.0.1
 */
Object.defineProperty($.Node.prototype, 'cat', {
  get: function() {
    this.value = this.value.split('$').join('.$').slice(1);
    return this;
  }
});
/*
 *  Alias for node.plus.equal.to().
 *
 *  @since 0.0.1
 */
$.Node.prototype.add = function(value) {
  return this.plus.equal.to(value);
};
/*
 *  Alias for node.minus.equal.to().
 *
 *  @since 0.0.1
 */
$.Node.prototype.sub = function(value) {
  return this.minus.equal.to(value);
};
/*
 *  Alias for node.times.equal.to().
 *
 *  @since 0.0.1
 */
$.Node.prototype.multiply = function(value) {
  return this.times.equal._(value);
};
/*
 *  Alias for node.by.equal.to().
 *
 *  @since 0.0.1
 */
$.Node.prototype.divide = function(value) {
  return this.by.equal.to(value);
};
/*
 *  Alias for PHP $GLOBALS.
 *  References all variables available in global scope.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Globals = function(name) {
  this.value += $.global.get($.global.Globals, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Globals.
 *
 *  @since 0.0.1
 */
$.Globals = function(name) { return $.let.Globals(name); }
/*
 *  Alias for PHP $_SERVER - Server and execution environment info.
 *
 *  Contains information such as headers, paths, and script locations.
 *  The entries in this array are created by the web server.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Server = function(name) {
  this.value += $.global.get($.global.Server, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Server.
 *
 *  @since 0.0.1
 */
$.Server = function(name) { return $.let.Server(name); }
/*
 *  Alias for PHP $_GET - HTTP GET variables.
 *
 *  An associative array of variables passed to the
 *  current script via the URL parameters.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Get = function(name) {
  this.value += $.global.get($.global.Get, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Get.
 *
 *  @since 0.0.1
 */
$.Get = function(name) { return $.let.Get(name); }
/*
 *  Alias for PHP $_POST - HTTP POST variables.
 *
 *  An associative array of variables passed to the
 *  current script via the HTTP POST method.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Post = function(name) {
  this.value += $.global.get($.global.Post, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Post.
 *
 *  @since 0.0.1
 */
$.Post = function(name) { return $.let.Post(name); }
/*
 *  Alias for PHP $_FILES - HTTP File Upload variables.
 *
 *  An associative array of items uploaded to the current script via the
 *  HTTP POST method.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Files = function(name) {
  this.value += $.global.get($.global.Files, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Files.
 *
 *  @since 0.0.1
 */
$.Files = function(name) { return $.let.Files(name); }
/*
 *  Alias for PHP $_REQUEST — HTTP Request variables
 *
 *  An associative array that by default contains the contents of $_GET,
 *  $_POST and $_COOKIE.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Request = function(name) {
  this.value += $.global.get($.global.Request, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Request.
 *
 *  @since 0.0.1
 */
$.Request = function(name) { return $.let.Request(name); }
/*
 *  Alias for $_SESSION — Session variables.
 *
 *  An associative array containing session variables available to the
 *  current script.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Session = function(name) {
  this.value += $.global.get($.global.Session, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Session.
 *
 *  @since 0.0.1
 */
$.Session = function(name) { return $.let.Session(name); }
/*
 *  Alias for $_ENV — Environment variables.
 *
 *  An associative array of variables passed to the current script via the
 *  environment method. See PHP docs.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Env = function(name) {
  this.value += $.global.get($.global.Env, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Env.
 *
 *  @since 0.0.1
 */
$.Env = function(name) { return $.let.Env(name); }
/*
 *  Alias for $_COOKIE — HTTP Cookies.
 *
 *  An associative array of variables passed to the current script via
 *  HTTP Cookies.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Cookies = function(name) {
  this.value += $.global.get($.global.Cookies, name);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Cookies.
 *
 *  @since 0.0.1
 */
$.Cookies = function(name) { return $.let.Cookies(name); }





