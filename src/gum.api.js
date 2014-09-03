/*!
 *  gum/gum.api.js
 *  (c) Jorge Bucaran 2014
 *
 *  Create objects that represent either functions or symbols, i.e, constants,
 *  variables, operators, etc, and link them together in a chain that returns
 *  the resulting PHP expression as a string.
 *
 *   $('getData')
 *
 *  The above adds a getData Function object to $ that returns an expression
 *  invoking getData([args, ..]). To define variables, operators, etc., pass
 *  a second argument to $(name, value) with the output to echo when $.object
 *  is evaluated.
 *
 *  Gum is useful when manipulating several symbols in complex expressions:
 *
 *    a.is.not.b.or.c.is.f('data')
 *   ↓
 *    'a !== b && c === f("data")'
 */
'use strict';
// Used across the class.
$.gum = {};
/*
 *  Wraps text in PHP tags as described below.
 *
 *  [$0]<?php {[$0 | $1]} [{$3 | ;}] ?>[$2]
 */
$.gum.php = function () {
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
 */
$.gum.markupToObject = function(markup) {
  var name = '', id = null, _class = null, tok = '', ch = '', buffer = '';
  /*
   *  name, id and _class store the element properties as markup is parsed.
   *  tok holds the tok character
   */
  if (markup[0] === '.' || markup[0] === '#') {
  // Allow .#id.class to be be parsed as div#id.class.
    markup = 'div' + markup;
  }
  for (var i = 0; i <= markup.length; i++) {
    if (i === markup.length) {
      ch = tok || ' ';
      /*
       *  If this is the last iteration, set ch to the last . or # token.
       *  If there was no token, markup only holds a name, so add ' '.
       */
    } else {
      ch = markup[i];
    }
    buffer += ch;
    if (ch === '.' || ch === '#' || i === markup.length) {
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
  return { name: name, id: id, class: _class ? _class.slice(0,-1) : _class };
};
// Returns "value".
$.gum.quote = function(value) {
  return '"' + (value || '') + '"';
};
// Returns "value" if value is of type String.
$.gum.squote = function(value) {
  return (typeof value === 'string') ? $.gum.quote(value) : value;
};
// Escapes html special characters "&'>< in @value.
$.gum.decode = function(value) {
  value = value.replace(/&quot;/g, '"');
  value = value.replace(/&amp;/g, '&');
  value = value.replace(/&#39;/g, "'");
  value = value.replace(/&gt;/g, '>');
  return value = value.replace(/&lt;/g, '<');
}
// Returns true if value is a function() or $variable.
$.gum.isFuncOrVar = function(value) {
  var name = value.substr(0, value.indexOf('('));
  name = name.substr(0, 'function '.length) === 'function ' ?
    name.substr('function '.length) : name;
  return 'undefined' !== typeof $[name] || '$' === value.slice(0,1);
};
// Converts Strings, Arrays, Objects and $.Node objects to a PHP expression.
$.gum.parse = function() {
  var args = [].slice.call(arguments,0);

  args.forEach(function(item, index) {
    var output = $.gum.toString(item);

    if ('string' === typeof item && !$.gum.isFuncOrVar(output)) {
      output = $.gum.quote(item); // @todo: isNaN(parseInt(value)) ?

    } else if ('[object Object]' === output || item instanceof Array) {
      output = '';
      for (var prop in item) {
        if (!item.hasOwnProperty(prop)) continue;
        output += (item instanceof Array ? '' : $.gum.quote(prop) + '=>') +
          $.gum.parse(item[prop]) + ',';
      }
      output = '[' + output.slice(0,-1) + ']';
    }
    args[index] = output;
  });
  return [].join.call(args,',');
};
/*
 *  Returns $.Node.prototype.$ for $.Node objects or defaults to toString.
 */
$.gum.toString = function(object) {
  return object ? (object.$ || object + '') : object + '';
};
/*
 *  Returns the property at @index in @object.
 */
$.gum.has = function(object, index) {
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
 *  Alias for $.Func and $.Symbol. Creates a function $.Node. If a value is
 *  passed, creates a symbol $.Node instead.
 */
function $(name, value) {
  return (typeof value === 'undefined') ? $.Func(name) : $.Symbol(name, value);
};
/*
 *  Returns a function $.Node and adds it to the $ namespace.
 *
 *  @name String e.g, myFunc
 */
$.Func = function(name) {
  if (!$[name]) $[name] = $.private.defineFunction(new $.Node(name));
  return $[name];
};
/*
 *  Returns a symbol $.Node and adds it to the $ namespace.
 *
 *  @name  String mod, plus, myVar
 *  [@value String   %,    +, $myVar]
 */
$.Symbol = function(name, value) {
  if (!$[name]) { //@todo Allow updating symbols
    Object.defineProperty($, name, {
      get: function() {
        return new $.Node(name, value || '');
      }
    });
  }
  return $[name];
};
// Internal functions and data.
$.private = {};
/*
 *  Used by $.Func when creating a new node or $.Node.new when binding to
 *  existing nodes. Returns the function used in $.name().
 */
$.private.defineFunction = function(node, name) {
  return function() {
    if (!name) node = new $.Node(node.name);
    // Create a new $.Node to reset the output.
    node.output = (node.output || '') + (name || node.name) +
      '(' + $.gum.parse.apply( this, [].slice.call(arguments, 0) ) + ')';
    return node;
  };
};
// Global properties, default operators, superglobals.
$.global = {
  Globals : '$GLOBALS'  ,   Post    : '$_POST'    ,
  Server  : '$_SERVER'  ,   Get     : '$_GET'     ,
  Post    : '$_POST'    ,   Files   : '$_FILES'   ,
  Cookie  : '$_COOKIE'  ,   Session : '$_SESSION' ,
  Request : '$_REQUEST' ,   Env     : '$_ENV'
};
/*
 *  New nodes are added here and existing nodes are bound each time a
 *  new $.Node object is instantiated via $.Func or $.Symbol.
 */
$.global.nodes = [];
$.global.symbols = {
  or      : '||'  ,   and       : '&&'    ,
  pow     : '**'  ,   mod       : '%'     ,
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
// Returns the superglobal alias for @name[@value].
$.global.get = function(name, value) {
  return name.toUpperCase() + '[' + $.gum.parse(value) + ']';
};
// Invokes @callback for each property in $.global.symbols.
$.global.symbols.forEach = function(callback){
  for (var prop in this) {
    if (!(this[prop] instanceof Function)) callback(prop, this[prop]);
  }
};
/*
 *  $.Node definition. Sets up new nodes with the default symbols and binds
 *  them to $.globals.nodes.
 */
$.Node = function(name, value) {
  this.name = name;
  this.value = value, this.output = value; // Undefined for function nodes.
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
// Returns the output and resets it to its original value.
Object.defineProperty($.Node.prototype, '$', {
  get: function() {
    var output = this.output;
    this.output = this.value;
    return output;
  }
});
/*
 *  Creates a new property or function in the current instance with name
 *  and/or value. When either the function or property is evaluated, the
 *  value is appended to the output and the node is returned.
 */
$.Node.prototype.new = function(name, value) {
  if (this.hasOwnProperty(name)) return;

  if ( 'undefined' === typeof value ) {
    this[name] = $.private.defineFunction(this, name);
  } else {
    Object.defineProperty(this, name, {
      get: function() {

        if (value === '===' && this.output.substr(-1) === '!') {
          value = '=='; // not.equals → !==
        }
        switch (this.output.substr(-3)) {
          case '===': // last node → ===
            switch(value) {
              case '!': // is.not → !==
                value = '!==';
              case '>': // is.greater → >
              case '<': // is.less → <
                this.output = this.output.slice(0,-3);
                break;

              case '=': // is.equal → ===
                value = '';
                break;
            }
            break;

          case '!==': // last node → !==
            switch(value) {
              case '=': // is.not.equal → !==
                value = '';
                break;
            }
            break;

          case '>||': // is.greater.or.equal → >=
          case '<||': // is.less.or.equal → <=
            if (value === '=')
            this.output = this.output.slice(0,-2);
            break;
        }
        this.output += value;
        return this;
      }
    });
  }
};
// Creates a node for the not, true and false operators.
$.Symbol('not', '!');
$.Symbol('true', 'true');
$.Symbol('false', 'false');
/*
 *  Empty node to allow binding prototype functions to the root $, as well
 *  as writing more readable code like:
 *
 *    $.myVar.be(X) or $.myVar.equal._(X)  →  $.let.myVar.be(10)
 */
$.Symbol('let');
/*
 *  Appends @value to the expression string. Also useful when you need to
 *  bypass the default operator precedence.
 */
$.Node.prototype._ = function(value) {
  //@todo: add paranthesis around expression if not a number
  this.output += $.gum.parse(value);
  return this;
};
// Root alias for node._()
$._ = function(value) {
  return $.let._(value);
}
/*
 *  Negates the arguments and returns !(expression) in parenthesis. Use it
 *  when you need to bypass the default operator precedence.
 */
$.Node.prototype.no = function(value) {
  this.output += '!(' + $.gum.parse(value) + ')';
  return this;
};
// Root alias for node.no()
$.no = function(value) {
  return $.let.no(value);
}
/*
 *  Alias for node._(). Convenient for writing more readable conditions:
 *
 * $.var.is.equal.to()
 * $.var.is.greater.or.equal.to()
 * $.var.is.not.equal.to()
 */
$.Node.prototype.to = function(value) {
  return this._(value);
};
// Alias for node.equal._(). Convenient when using $.let.
$.Node.prototype.be = function(value) {
  return this.set.to(value);
};
/*
 *  Returns value[index] as a string. Wraps @index in quotes if index is
 *  of type String.
 */
$.Node.prototype.at = function(index) {
  this.output += '[' + $.gum.parse(index) + ']';
  return this;
};
// Concatenates all $variable nodes. $.s1.s2.s3.s4.cat
Object.defineProperty($.Node.prototype, 'concat', {
  get: function() {
    this.output = this.output.split('$').join('.$').slice(1);
    return this;
  }
});
// Alias for node.plus.equal.to().
$.Node.prototype.add = function(value) {
  return this.plus._(value);
};
// Alias for node.minus.equal.to().
$.Node.prototype.sub = function(value) {
  return this.minus._(value);
};
// Returns this * 10^value string representation.
$.Node.prototype.e = function(value) {
  this.output += 'e'+value;
  return this;
};
// PHP $GLOBALS and root alias.
$.Node.prototype.Globals = function(value) {
  this.output += $.global.get($.global.Globals, value);
  return this;
};
$.Globals = function(value) { return $.let.Globals(value); }
// PHP $_SERVER - Server and execution environment info and root alias.
$.Node.prototype.Server = function(value) {
  this.output += $.global.get($.global.Server, value);
  return this;
};
$.Server = function(value) { return $.let.Server(value); }
// PHP $_GET - HTTP GET variables and root alias.
$.Node.prototype.Get = function(value) {
  this.output += $.global.get($.global.Get, value);
  return this;
};
$.Get = function(value) { return $.let.Get(value); }
// PHP $_POST - HTTP POST variables and root alias.
$.Node.prototype.Post = function(value) {
  this.output += $.global.get($.global.Post, value);
  return this;
};
$.Post = function(value) { return $.let.Post(value); }
// PHP $_FILES - HTTP File Upload variables and root alias.
$.Node.prototype.Files = function(value) {
  this.output += $.global.get($.global.Files, value);
  return this;
};
$.Files = function(value) { return $.let.Files(value); }
// $_REQUEST — HTTP Request variables and root alias.
$.Node.prototype.Request = function(value) {
  this.output += $.global.get($.global.Request, value);
  return this;
};
$.Request = function(value) { return $.let.Request(value); }
// $_SESSION — Session variables and root alias.
$.Node.prototype.Session = function(value) {
  this.output += $.global.get($.global.Session, value);
  return this;
};
$.Session = function(value) { return $.let.Session(value); }
// $_ENV — Environment variables and root alias.
$.Node.prototype.Env = function(value) {
  this.output += $.global.get($.global.Env, value);
  return this;
};
$.Env = function(value) { return $.let.Env(value); }
// $_COOKIE — HTTP Cookies and root alias.
$.Node.prototype.Cookies = function(value) {
  this.output += $.global.get($.global.Cookies, value);
  return this;
};
$.Cookies = function(value) { return $.let.Cookies(value); }