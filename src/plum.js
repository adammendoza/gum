/**
 *
 *  gum/plum.js
 *  (c) Jorge Bucaran 2014
 *
 *  PHP, markup and string manipulation utilities for Jade projects.
 *
 *
 *  Wraps text in PHP tags as described below.
 *
 *  [$0]<?php {[$0 | $1]} [{$3 | ;}] ?>[$2]
 *
 *  @since 0.0.1
 *
 */
$.php = function() {
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
 *  For a string such as 'element#id.class1.class2'
 *  should return the following object:
 *
 *  { name  : 'element'
 *    id    : 'id'
 *    class : 'class1 class2' }
 *
 *  @since 0.0.1
 *
 */
$.tag = function(s) {
  var name = '', id = null, _class = null,
      tok = '', ch = '', buffer = '';
  /*
   *  name, id and _class store the element properties
   *  as s is parsed. tok holds the tok character
   */
  if (s[0] === '.' || s[0] === '#') {
  /*
   *  Since divs are common, allow them to be omitted.
   *  So, .#id.class should be parsed as div#id.class.
   */
    s = 'div' + s;
  }
  for (var i = 0; i <= s.length; i++) {
    if (i === s.length) {
      ch = tok || ' ';
      /*
       *  If this is the last iteration, set ch to the last . or #
       *  token. If there was no token s only holds a name, so add
       *  a blank space to maek up for slice(0,-1).
       */
    } else {
      ch = s[i];
    }
    buffer += ch;
    /*
     *  Begin buffering...
     */
    if (ch === '.' || ch === '#' || i === s.length) {
    /*
     *  The current character is either . # or this is
     *  the last iteration. Reset the buffer and store
     *  the token for the next cycle.
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
     *  Trim the blank space added to the class list
     *  during _class assignment.
     */
  };
};


