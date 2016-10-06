import * as utils from './utils'
import globby from 'globby'
import { map } from 'async-array-methods'
import to from 'to-js'
import path from 'path'
const debug = require('debug')('compile')

/// @name compile
/// @page compile
/// @arg {string} root - The root of folder to compile
/// @arg {object} options
///
/// ```js
/// {
///   ignore: [], // files to ignore
///   minify: false, // if the file should be minified or not
///   sourcemaps: true,
///   style: {}, // options for postcss
///   template: {}, // options for templates
///   javascript: {}, // options for rollup
/// }
/// ```
/// @description
/// This will compile any file if it can be compiled
///
/// @returns {function} render
export default async function compile(root, options = {}) {
  debug('start setup')

  options = to.extend({
    ignore: [],
    minify: false,
    sourcemaps: true,
    pretty: true,
    style: {},
    template: {},
    javascript: {}
  }, options)

  const processors = to.keys(utils.processors)
    .reduce((prev, next) => {
      prev[next] = require(`./${next}/index.js`).default
      return prev
    }, {})
  const glob_options = { ignore: [ 'node_modules' ].concat(options.ignore), nodir: true }

  let root_files = await globby(path.join(root, '**', '*'), glob_options)

  processors.template = await processors.template(root_files, options.template)

  debug('end  setup')
  ///# compile.render
  ///# @description This function is used to render any glob that's passed to it
  ///# @arg {string} glob ['**/*'] - The glob to render
  ///# @returns {array} - files that have been rendered
  return async (glob = '**/*') => {
    debug('start render')
    let files = await globby(glob, glob_options)
    files = files.filter((file) => !utils.shouldIgnore(file))
    files = await map(files, async (file) => {
      const debug_file = utils.color(file)
      debug(`start file ${debug_file}`)
      const type = utils.type(file)
      // get the processor options
      let opts = options[type]

      switch (to.type(opts)) {
        case 'array':
          opts = { plugins: [] }
          break
        case 'object':
          break
        default:
          opts = {}
      }

      let result = await processors[type](file, {
        root,
        minify: options.minify,
        sourcemaps: options.sourcemaps,
        pretty: options.pretty,
        ...opts[type]
      })

      result.type = type
      result.src = file
      result.path = utils.renameExt(file)
      result.root = root
      result.processor = type

      if (!options.sourcemaps) {
        result.map = ''
      }


      debug(`end file ${debug_file}`)
      return result
    })

    debug('end  render')
    return files
  }
}
