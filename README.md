<!---
@page home
@markdown
--->

# Project Tools

It's a tool for managing multiple projects, it's very useful for designers who work on landing pages for a site or have to create multiple emails with the same layout. It also supports different languages via a content system run off of [i18next](https://www.npmjs.com/package/i18next). This was built to be used as a command line utility but it's js api is still accessible if it's needed.


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

## Simple Example:

Here's a small example of how fast it is to get up and running.

![example](https://user-images.githubusercontent.com/4776422/30338659-55fb3066-97ba-11e7-9fdb-ecd4613310ca.gif)

## Getting Started

To get started head over to the [wiki](https://github.com/tjbenton/project-tools/wiki) and go through the different tutorials to get you up to speed, and also to see some examples of how `project-tools` can help you and your team.


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


#### `options.layout`

This is the path to the layout file you want to use. Note that this must be inside at least one folder, because of the other files that may be used in the layout. For example `layout/index.html`

```js
options.layout = ''
```


#### `options.fallback_locale`

This is used to determine which language should be used if the key for a language isn't specified. Note that locales don't have to be in a specific format (aka `en-US`), you can even have `cheesecake` as a locale. It just has to match what's in your `_content.json` file for your project, and layout.

```js
options.fallback_locale = 'eng'
```

#### `options.default_build_locales`

This indicates the default locale that should be built if a locale isn't passed into the build/watch functions. This option can be a string, comma delimited list, or an array of values. You can also use the `all` keyword, this will build all the locales that you've specified in your specific project.

```js
options.default_build_locales = 'all'
```


#### `options.rename`

This function is called to rename the file paths so project-tools knows where to put the compiled files. This gives you the flexibility to rename files in anyway you see fit. Currently the default function will place files in the same location in the `dist` folder as they were in the `app` or `layout` folder. For the template files if a locale is used then it will be placed inside a folder of the current locale.

```js
options.rename = function rename(item, locale, project) {
  // the item that was passed in is from the layout root
  if (!item.path.includes(project)) {
    return path.join(this.root, 'projects', project, 'dist', item.file)
  }

  const dist = item.path.replace(/\bapp\b/, 'dist')

  if (item.processor === 'template' && locale) {
    return dist.replace(`${item.file}`, path.join(locale, item.file))
  }
  return dist
}
```

For example if you had the following project structure

```
projects/one/app
├── _content.json
└── index.pug
```

```js
// projects/one/app/_content.json
{
  "eng": { "header": "This is the header" },
  "mex": { "header": "Esta es la cabecera" }
}
```

You would end up with the following folder structure

```
projects/one/dist
└── eng
    └── index.html
└── mex
    └── index.html
```


#### `options.create`

This option can be a `function`, `array`, or `string`.

If it's an array, then the items in the array will be created as files under the app directory for the name that was passed.

```js
options.create = [ 'index.scss', 'index.js', 'index.pug' ] // this is the default
```

If it's a `function` the first argument is the `name` of the project being created and the second argument is the `dir` that it will be created it. This function should return a promise.

```js
options.create = async (name, dir) => {
  ...
}
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
    hbs: 'handlebars',
  },
}
```


#### `options.publish`

todo
