import { ext, color } from '../utils'
import postcss from 'postcss'
import path from 'path'
import to from 'to-js'
import cssnano from 'cssnano'
import { beautify } from '../../utils'
const debug = require('debug')('compile:style')


/// @name style
/// @page compile/style
/// @description
/// This is used to compile any stylesheet
///
/// @arg {string} file - the file path to compile
/// @arg {object} options
/// ```js
/// {
///   root: process.cwd()
///   plugins: [] // any postcss plugins to use
/// }
/// ```
///
/// @returns {object}
/// ```js
/// {
///   code: '', // the compiled code for the file
///   map: '', // the sourcemap for the file
///   language: '' // the language it was compile from
/// }
/// ```
/// @async
export default async function style(file, options = {}) {
  const debug_file = color(file)
  debug(`start ${debug_file}`)
  options = Object.assign({
    root: process.cwd(),
    minify: false,
    pretty: true,
    sourcemaps: true,
    plugins: [],
  }, options)

  const dirs = [
    path.dirname(file),
    path.dirname(path.resolve(options.root))
  ]

  const language = ext(file)
  let processor

  try {
    processor = require(`./processors/${language}`).default
  } catch (e) {
    console.error(e)
    return
  }


  const compiled = await processor(file, dirs)

  if (options.minify) {
    options.plugins.push(cssnano())
  }

  return postcss(options.plugins)
    .process(compiled.code, {
      map: {
        inline: false,
        prev: options.sourcemaps ? compiled.map : '',
        annotation: false
      }
    })
    .then((result) => {
      result.warnings().forEach((warn) => console.warn(warn.toString()))
      let { css: code, map } = result

      if (options.minify) {
        // always add trailing line to the file
        code += '\n'
      }

      if (options.pretty && !options.minify) {
        code = beautify(code, 'css')
      }

      map = options.sourcemaps ? to.json(map) : ''

      result = { code, map, language }
      debug(`end   ${debug_file}`)
      return result
    })
}
