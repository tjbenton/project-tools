import { rollup } from 'rollup'
import { ext } from '../utils'
import to from 'to-js'
import { beautify } from '../../utils'
const debug = require('debug')('compile:javascript')
import uglify from 'rollup-plugin-uglify'

/// @name javascript
/// @page compile/javascript
/// @description
/// This is used to compile javascript using [rollup](http://rollupjs.org)
///
/// @arg {string} file - the file path to compile
/// @arg {object} options -
/// This can be any options that are passed to [rollup](http://rollupjs.org).
/// `options.entry` will always be overwritten though.
///
/// ```js
/// {
///   root: process.cwd(),
///   // rollup options
///   context: 'window',
///
///   // bundle.generate options
///   format: 'iife',
///   exports: 'none',
///   indent: '  ',
///   globals: {},
///   sourceMap: true,
///   useStrict: true,
/// }
/// ```
///
/// @returns {object}
///
/// ```js
/// {
///   code: '', // the compiled code for the file
///   map: '', // the sourcemap for the file
///   language: '' // the language it was compile from
/// }
/// ```
/// @async
export default async function javascript(file, options = {}) {
  debug('start')
  options = Object.assign({
    root: process.cwd(),
    minify: false,
    pretty: true,
    sourcemaps: true,

    // rollup options
    context: 'window',
    plugins: [],

    // bundle.generate options
    format: 'iife',
    exports: 'none',
    indent: '  ',
    globals: {},
    sourceMap: true,
    useStrict: true,
  }, options)

  // normalize the sourcemap variable to work with rollup
  options.sourceMap = options.sourcemaps

  options.plugins = options.plugins.map((plugin) => {
    if (to.type(plugin) === 'string') {
      try {
        return require(plugin)()
      } catch (e) {
        console.log(`can't require the plugin ${plugin} to use for rollupjs`)
        throw new Error(e)
        return
      }
    }

    return plugin
  })

  if (options.minify) {
    options.plugins.push(uglify())
  }

  const getOptions = (possibles) => {
    return possibles.reduce((prev, next) => {
      if (options[next]) {
        prev[next] = options[next]
      }
      return prev
    }, {})
  }

  // const language = ext(file)
  const rollup_options = getOptions([
    'plugins',
    'cache',
    'treeshake',
    'external',
    'paths',
    'onwarn',
    'acorn',
    'context'
  ])
  rollup_options.entry = file

  const generate_options = getOptions([
    'format',
    'exports',
    'indent',
    'globals',
    'moduleId',
    'moduleName',
    'interop',
    'banner',
    'footer',
    'intro',
    'outro',
    'sourceMap',
    'useStrict'
  ])

  let result = await rollup(rollup_options)
  result = await result.generate(generate_options)

  if (options.pretty && !options.minify) {
    result.code = beautify(result.code, 'js')
  }


  result.map = options.sourcemaps ? to.json(result.map) : ''
  result.language = ext(file)

  debug('end')
  return result
}
