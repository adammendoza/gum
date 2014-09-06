# Gum v0.1.5 [![Built with Grunt](https://cdn.gruntjs.com/builtwith.png> "Optional title")](http://gruntjs.com)
> Write PHP in Jade.

+ [What's this?](#what)
+ [Installation](#install)
+ [Gum](#gum)
  + [Variables & Functions](#varfunc)
  + [Control](#control)
    + [If](#if)
    + [Switch](#switch)
    + [For](#for)
+ [$](#$)
+ [Samples](#samples)
+ [Get Social](#social)
+ [Release History](#history)

# <a name="what"></a>What's this?
Gum is a Jade+JavaScript library that lets you write PHP with Jade. While not intended as a PHP replacement of any kind, Gum should offer a funky approach to most basic PHP programming tasks.

# <a name="install"></a>Installation
Download with `bower install gum` and start using it in your Jade projects with one line `include gum/main`.

Clone to explore, modify and / or compile the code yourself. If you can help finding bugs and improving the library it's a ++!

    git clone git://github.com/bucaran/gum.git
    cd gum
    npm install

# <a name="gum"></a>Gum.jade
`gum.jade` is a mixin library that generates PHP. Think things like `+if`, `+while`, `+for`, `+each`, they are all there. Use `+-` to declare and initialize variables, define and invoke functions or just echo out plain old PHP.

## <a name="varfunc"></a>Variables & Functions

    +-(meat="beef" countries=["Japan", "Argentina", "U.S"])

The above will register `meat` and `countries` as variables in the global namespace `$` and echo the PHP to declare and initialize them. See [$](#$) below for more information.

There is also `+- block` to echo the block of text inside `<?php ?>` tags and

    +-(before, after)
     [block]

to output the block wrapped in `before` and `after` strings inside the `<?php ?>` tags. Note that `before` and `after` are echoed even if no block is passed. Finally,

    +-(function=myFunc a b[=c])
     block

declares a PHP function `myFunc`. The above will also add the `myFunc` identifier as a Function object to `$`.

## <a name="control"></a>Control

There are several control structure-like mixins available in Gum that generate the corresponding PHP. Check the available _documentation_ for more details.

### <a name="if"></a>If..elseif..else

    +if(condition)
      ...
    +elseif(condition)
      ...
    +else
      ...
    +fi

Echoes a PHP `if` stament. Ideally we would do away with the closing `+fi` but that means `+elseif` and `+else` would have to be nested inside the `+if`.

### <a name="switch"></a>Switch

    +switch(condition)
      +case(condition)

      +case ...

      +else
        ...

`Switch` statement. Use `+else` to handle default cases.

### <a name="for"></a>For

    +for(i=0 to=10)
      ...
    +for(j=10 to=0)
      ...
    +for(k=100 to=-100 by=-10)

The above registers `i`, `j` and `k` in `$` and generates a `for` loop that runs:

   * `to` - `from` times at `by` intervals where `from` is `i`, `j` or `k`.
   * If `by` is not set, the default will be 1 if `from < to`, or -1 otherwise.

Similarly,

    +each(in=array item)

registers `item` in `$` and echoes a `foreach` loop that runs for each item in `array`.

### <a name="while"></a>While

    +while(condition)
      ...

Echoes a PHP `while` statement.

# <a name="$"></a>$

We use blocks in Jade in order to implement [mixins](http://jade-lang.com/reference/mixins/) that nest and behave like the control flow structures we know and love. But without blocks to describe the logical conditions, variables or other extra parameters, we need to *hack* the arguments and [attributes](http://jade-lang.com/reference/attributes/) to make our mixins work akin to real control structures.

We can use regular strings to embed the PHP code and it will work, or we can use `$` to create JavaScript objects that represent either functions or symbols; constants, variables, operators, etc., and link them together in a chain that returns the resulting PHP expression as a string.

    $('getData')
    +if($.getData('query'))
      .success
    +fi

The above adds a `getData` Function object to `$` that returns a PHP expression invoking `getData([args, ...])`. To define variables, operators, etc., pass a second argument to `$(name, value)` with the PHP output to echo when `$.object` is evaluated.

In practice, it's easier to declare variables directly in Gum with `+-` since that will generate the PHP as well.

# <a name="samples"></a>Samples

This repository includes a `samples/` directory where you can find the examples available for this release. Edit the `samples.enabled` and `samples.localhost` configuration in the `package.json` file to enable the samples.

# <a name="social"></a>Get Social

  * [GitHub](http://github.com/bucaran)
  * [Twitter](http://twitter.com/jbucaran)
  * [Homepage](http://bucaran.me)

## <a name="history"></a>Release History

##### 0.1.5 / 2014-09-6

  * Adds `main.jade` that loads gum. Including gum in your project it's easier now `include gum/main`.

##### 0.1.4 / 2014-09-5

  * Adds `echo` and `print` to `$.global.functions`.

##### 0.1.2 / 2014-09-5

  * Adds `$.global.functions` to include some PHP functions by default: `print_r`, `var_dump`, `printf`, etc.
  * Pass an array to `$(['f1', 'f2', 'f3'...])` to batch define a list of functions.

##### 0.1.1 / 2014-09-4

  * Patches a versioning issue with bower.

##### 0.1.0 / 2014-09-4

  * Initial Release.

---

By [Jorge Bucaran](http://bucaran.me)
