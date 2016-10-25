<!---
@page home
@markdown
--->

# Project Tools

It's a tool for managing multiple projects, it's very useful for designers who work on landing pages for a site or have to create multiple emails with the same layout. This is a command line utility but it's js api is still accessible if it's needed.


## Install

```bash
npm install --global project-tools
# or
npm install --save-dev project-tools
```

## Usage

```bash
project [command]
```

to see a list of all the commands and what they just run the following

```bash
project help
# or
project [command] help
```


## Config

To configure your project the way you want just create a `.projectrc.js` in the root of your project directory.

```js
module.exports = {
  // the current working directory.
  root: process.cwd(),

  // display logging information
  log: true,

  // check to see if docker is running
  dockerCheck: true,

  // if true it will minify all the files when they're built
  minify: false,

  // this will reformat the output of files.
  // this will change be disabled if `minify` is true
  pretty: true,

  // will output sourcemaps for the files that have been built
  sourcemaps: true,

  // globs to be ignored
  ignore: [],

  // other options are in more detail below
}
```


#### `options.create`

This option can be a `function`, `array`, or `string`.

If it's a `function` the first argument is the `name` of the project being created and the second argument is the `dir` that it will be created it. This function should return a promise.

```js
options.create = async (name, dir) => {
  ...
}
```

If it's an array, then the items in the array will be created as files under the app directory for the name that was passed.

```js
options.create = [ 'index.scss', 'index.js', 'index.pug' ],
```

If a string is used then it will read the folder path that was passed and duplicate any files under that folder into the app directory. This can be relative to the root directory or an absolute path.


```js
options.create = 'base'
```


#### `options.style`

This can accept any plugins that work with [postcss](http://postcss.org). Below are just the defaults that have are set.

**Note:** `entry` and `target` are disabled because this is determined by the app it's self.

```js
options.style = {
  minify: options.minify, // same as options.minify if not specified
  pretty: options.pretty, // same as options.pretty if not specified
  sourcemaps: options.sourcemaps, // same as options.sourcemaps if not specified


  // extra dirs to add to the resolve functionality of the processor that the file's passed to.
  // by default the files directory and the root directory are included.
  dirs: [],

  // any post css plugins that you want to this file to run through.
  // you can pass a string with the name of the package, or you can pass a function
  plugins: [],
}
```

#### `options.javascript`

This will accept any options that can be passed to [rollupjs](http://rollupjs.org). Below are just the defaults that are set.

**Note:** `entry` and `target` are disabled because this is determined by the app it's self.

```js
options.javascript = {
  minify: options.minify, // same as options.minify if not specified
  pretty: options.pretty, // same as options.pretty if not specified
  sourcemaps: options.sourcemaps, // same as options.sourcemaps if not specified

  // rollup options
  context: 'window',
  plugins: [],

  // any other options that can be passed to rollup

  // bundle.generate options
  format: 'iife',
  exports: 'none',
  indent: '  ',
  globals: {
    jquery: 'jQuery',
    document: 'document',
    $document: '$(document)',
    window: 'window',
    $window: '$(window)',
    browser: 'browser',
    $html: '$(document.documentElement)',
  },
  sourceMap: true,
  useStrict: true,
}
```


#### `options.template`

```js
options.template = {
  // any globals that will be available to the template engine
  globals: { _ },

  // this will pretty print the compiled template code
  pretty: true,

  // any languages to use that are different that their file extensions.
  // If you need to pass in options to a language you can pass them in via an object
  // `{ pkg: 'pug', options: { pretty: true } }`
  languages: {
    // [extension]: [package to use]
    txt: 'engine-base',
    html: 'engine-base',
    hbs: 'handlebars'
  },

  // the layout file to use for all projects
  layout: '',
}
```


#### `options.publish`

todo

#### `options.translate`

todo