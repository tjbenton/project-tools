import * as utils from './utils'
import globby from 'globby'
import { map } from 'async-array-methods'
import to from 'to-js'
import _ from 'lodash'
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

  const root_files = await globby(path.join(root, '**', '*'), glob_options)

  function run(files) {
    return map(files, async (file) => {
      const debug_file = utils.color(file)
      debug(`start file ${debug_file}`)
      const type = utils.type(file)
      // get the processor options
      let opts = options[type]

      switch (to.type(opts)) {
        case 'array':
          opts = { plugins: opts }
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
        ...opts
      })

      result.type = type
      result.src = file
      result.path = utils.renameExt(file)
      result.root = root
      result.file = result.path.slice(result.root.length + 1)
      result.processor = type

      if (!options.sourcemaps) {
        result.map = ''
      }

      debug(`end file ${debug_file}`)
      return result
    })
  }

  processors.template = await processors.template(root_files, options.template)

  debug('end  setup')
  ///# @name render
  ///# @description This function is used to render any glob that's passed to it
  ///# @arg {string} glob ['**/*'] - The glob to render
  ///# @returns {array} - files that have been rendered
  return async (glob = '**/*') => {
    debug('start render')
    let files = await globby(glob, glob_options)

    files = files
      .filter((file) => !utils.shouldIgnore(file))
      // move all the template files to the second array and any other file to the first array
      .reduce((prev, next) => {
        prev[utils.processors.template.includes(utils.ext(next)) ? 1 : 0].push(next)
        return prev
      }, [ [], [] ])

    files[0] = await run(files[0])

    // add the compiled files on to the template globals so
    // that they will be available to the project
    options.template.files = _.assign(
      options.template.files || {},
      files[0].reduce((prev, next) => {
        let list = next.file.split(path.sep)
        let file = list.pop().split('.') // remove the file from the list
        list.unshift(file.pop()) // unshift the file ext on the start of the list
        list.push(file.join('.')) // push the file back onto the list
        list = list.map(to.snakeCase) // normalize the strings to be snake case
        _.set(prev, list, next)
        return prev
      }, {})
    )

    // render the rest of the files
    files[1] = await run(files[1])

    debug('end  render')
    return to.flatten(files)
  }
}
