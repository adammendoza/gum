/*!
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
$.util.escape = function(value) {
  value = value.replace(/&quot;/g, '"');
  value = value.replace(/&amp;/g, '&');
  value = value.replace(/&#0*39;/g, "'");
  value = value.replace(/&gt;/g, '>');
  value = value.replace(/&lt;/g, '<');
  return value
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
 *  Converts a JavaScript object to a PHP dictionary declaration string.
 *
 *  @since 0.0.1
 */
$.util.objectToString = function(object) {
  if (object.toString() !== '[object Object]') return object.toString();
  var output = '';
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      output += $.util.quote(prop) + '=>';
      if (object[prop] instanceof Array) {
        output += $.util.arrayToString(object[prop]);
      } else if (object[prop] instanceof Object) {
        output += $.util.objectToString(object[prop]);
      } else {
        output += $.util.quoteString(object[prop]);
      }
    }
    output += ',';
  }
  return '[' + output.slice(0,-1) + ']';
};
/*
 *  Converts a JavaScript Array to a PHP dictionary declaration string.
 *
 *  @since 0.0.1
 */
$.util.arrayToString = function(array) {
  var output = '';
  for (var i=0; i < array.length; i++) {
    if (array[i] instanceof Array) {
      output += $.util.arrayToString(array[i]);
    } else if (array[i] instanceof Object) {
        output += $.util.objectToString(array[i]);
    } else {
      output += $.util.quoteString(array[i]);
    }
    output += ',';
  }
  return '[' + output.slice(0,-1) + ']';
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
  return '';
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
 *  Alias for $.Function(name) and $.Symbol. Creates a function $.Node,
 *  and returns its result. If a value is passed, creates a symbol $.Node
 *  and returns the object instead.
 *
 *  @since 0.0.1
 */
function $(name, value) {
  return (typeof value === 'undefined') ? $.Function(name) : $.Symbol(name, value);
};
/*
 *  Returns a function $.Node and adds it to the $ namespace.
 *
 *  @name String e.g, myFunc
 *
 *  @since 0.0.1
 */
$.Function = function(name) {
  if (!$[name]) $[name] = $.private.defineFunction(new $.Node(name));
  return $[name];
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
  if (!$[name]) $[name] = new $.Node(name, value || '') ;
  return $[name];
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
    if (!name) node.output = '';
    /*
     *  Reset the output when starting a new node chain.
     */
    node.output += (name || node.name) + $.util.argsToList(arguments);
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
  or      : '||'  ,   and       : '&&'    ,
  /*pow   : '**'  ,*/ mod       : '%'     ,
  gt      : '>'   ,   greater   : '>'     ,
  lt      : '<'   ,   less      : '<'     ,
  than    : ''    ,   equals    : '==='   ,
  are     : '===' ,   is        : '==='   ,
  inc     : '++'  ,   dec       : '--'    ,
  plus    : '+'   ,   minus     : '-'     ,
  times   : '*'   ,   by        : '/'     ,
  append  : '.='  ,   cat       : '.'     ,
  equal   : '='   ,   set       : '='     ,
  empty   : '""'  ,   null      : 'null'
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
 *  $.Node definition. Sets up new nodes with the default symbols and binds
 *  them to $.globals.nodes.
 */
$.Node = function(name, value) {
  this.name = name;
  this.value = value, this.output = value;
  // Both undefined for function nodes.

  // Adds the symbols defined in $.global.symbols to the instance.
  +function(node){
    $.global.symbols.forEach(function(name, value) {
      node.new(name, value);
    });
  }(this);

  // Push this node to $.global.nodes and add all the nodes to each other.
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
 *  Returns the output and resets it. It's called when the last node in a
 *  chain is to be evaluated as text. Resets output to the original value.
 *
 *  @since 0.0.1
 */
$.Node.prototype.toString = function() {
  var output = this.output;
  this.output = this.value;
  return output;
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
 *  value is appended to the output and the node is returned.
 *
 *  @since 0.0.1
 */
$.Node.prototype.new = function(name, value) {
  if (this.hasOwnProperty(name)) return;

  if ( typeof value === 'undefined' ) {
    this[name] = $.private.defineFunction(this, name);
  } else {
    Object.defineProperty(this, name, {
      get: function() {
        var output = value;
        if (output === '===' && this.output.substr(-1) === '!') {
          output = '=='; // not.equals → !==
        }
        switch (this.output.substr(-3)) {
          case '===': // last node → ===
            switch(output) {
              case '!': // is.not → !==
                output = '!==';
              case '>': // is.greater → >
              case '<': // is.less → <
                this.output = this.output.slice(0,-3);
                break;

              case '=': // is.equal → ===
                output = '';
                break;
            }
            break;

          case '!==': // last node → !==
            switch(output) {
              case '=': // is.not.equal → !==
                output = '';
                break;
            }
            break;

          case '>||': // is.greater.or.equal → >=
          case '<||': // is.less.or.equal → <=
            if (output === '=')
            this.output = this.output.slice(0,-2);
            break;
        }
        this.output += output;
        return this;
      }
    });
  }
};
/*
 *  Creates a node for the the not, true and false operators.
 *
 *  @since 0.0.1
 */
$.Symbol('not', '!');
$.Symbol('true', 'true');
$.Symbol('false', 'false');
/*
 *  Empty node to allow binding prototype functions to the root $, as well
 *  as writing more readable code on occasion:
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
    value = $.util.arrayToString(value);
  } else if (value instanceof Object) {
    value = $.util.objectToString(value);
  } else {
    value = $.util.quoteString(value);
  }
  this.output += value;
  return this;
};
/*
 *  Root alias for node._()
 *
 *  @since 0.0.1
 */
$._ = function(value) {
  return $.let._(value);
}
/*
 *  Negates the arguments and returns !(expression) in parenthesis. Use it
 *  when you need to bypass the default operator precedence.
 *
 *  @since 0.0.1
 */
$.Node.prototype.no = function(value) {
  this.output += '!(' + $.util.quoteString(value) + ')';
  return this;
};
/*
 *  Root alias for node.no()
 *
 *  @since 0.0.1
 */
$.no = function(value) {
  return $.let.no(value);
}
/*
 *  Alias for node._(). Convenient for writing readable conditions:
 *
 * $.var.is.equal.to()
 * $.var.is.greater.or.equal.to()
 * $.var.is.not.equal.to()
 *
 *  @since 0.0.1
 */
$.Node.prototype.to = function(value) {
  return this._(value);
};
/*
 *  Alias for node.equal._(). Convenient when using $.let.
 *
 *  @since 0.0.1
 */
$.Node.prototype.be = function(value) {
  return this.set.to(value);
};
/*
 *  Returns value[index] as a string. Wraps @index in quotes if index is
 *  of type String.
 *
 *  @since 0.0.1
 *
 */
$.Node.prototype.at = function(index) {
  this.output += "[" + $.util.quoteString(index) + "]";
  return this;
};
/*
 *  Updates value replacing @symbol with @append + @symbol in all nodes.
 *
 *  $.s1.s2.s3.s4.cat
 *
 *  @since 0.0.1
 */
Object.defineProperty($.Node.prototype, 'concat', {
  get: function() {
    this.output = this.output.split('$').join('.$').slice(1);
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
 *  Returns this * 10^value string representation.
 *
 *  @since 0.0.1
 */
$.Node.prototype.e = function(value) {
  this.output += "e"+value;
  return this;
};
/*
 *  Alias for PHP $GLOBALS.
 *  References all variables available in global scope.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Globals = function(value) {
  this.output += $.global.get($.global.Globals, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Globals.
 *
 *  @since 0.0.1
 */
$.Globals = function(value) { return $.let.Globals(value); }
/*
 *  Alias for PHP $_SERVER - Server and execution environment info.
 *
 *  Contains information such as headers, paths, and script locations.
 *  The entries in this array are created by the web server.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Server = function(value) {
  this.output += $.global.get($.global.Server, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Server.
 *
 *  @since 0.0.1
 */
$.Server = function(value) { return $.let.Server(value); }
/*
 *  Alias for PHP $_GET - HTTP GET variables.
 *
 *  An associative array of variables passed to the
 *  current script via the URL parameters.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Get = function(value) {
  this.output += $.global.get($.global.Get, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Get.
 *
 *  @since 0.0.1
 */
$.Get = function(value) { return $.let.Get(value); }
/*
 *  Alias for PHP $_POST - HTTP POST variables.
 *
 *  An associative array of variables passed to the
 *  current script via the HTTP POST method.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Post = function(value) {
  this.output += $.global.get($.global.Post, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Post.
 *
 *  @since 0.0.1
 */
$.Post = function(value) { return $.let.Post(value); }
/*
 *  Alias for PHP $_FILES - HTTP File Upload variables.
 *
 *  An associative array of items uploaded to the current script via the
 *  HTTP POST method.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Files = function(value) {
  this.output += $.global.get($.global.Files, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Files.
 *
 *  @since 0.0.1
 */
$.Files = function(value) { return $.let.Files(value); }
/*
 *  Alias for PHP $_REQUEST — HTTP Request variables
 *
 *  An associative array that by default contains the contents of $_GET,
 *  $_POST and $_COOKIE.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Request = function(value) {
  this.output += $.global.get($.global.Request, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Request.
 *
 *  @since 0.0.1
 */
$.Request = function(value) { return $.let.Request(value); }
/*
 *  Alias for $_SESSION — Session variables.
 *
 *  An associative array containing session variables available to the
 *  current script.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Session = function(value) {
  this.output += $.global.get($.global.Session, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Session.
 *
 *  @since 0.0.1
 */
$.Session = function(value) { return $.let.Session(value); }
/*
 *  Alias for $_ENV — Environment variables.
 *
 *  An associative array of variables passed to the current script via the
 *  environment method. See PHP docs.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Env = function(value) {
  this.output += $.global.get($.global.Env, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Env.
 *
 *  @since 0.0.1
 */
$.Env = function(value) { return $.let.Env(value); }
/*
 *  Alias for $_COOKIE — HTTP Cookies.
 *
 *  An associative array of variables passed to the current script via
 *  HTTP Cookies.
 *
 *  @since 0.0.1
 */
$.Node.prototype.Cookies = function(value) {
  this.output += $.global.get($.global.Cookies, value);
  return this;
};
/*
 *  Root alias for $.Node.prototype.Cookies.
 *
 *  @since 0.0.1
 */
$.Cookies = function(value) { return $.let.Cookies(value); }