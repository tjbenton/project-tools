import * as utils from './utils'
import globby from 'globby'
import { reduce } from 'async-array-methods'
import to from 'to-js'
import _ from 'lodash'
import path from 'path'
const debug = require('debug')('compile')

/// @name compile
/// @page compile
/// @arg {string} project_root - The root of folder to compile
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
///   layout: '', // the layout to use
///   rename(item, locale, project) {
///     // the item that was passed in is from the layout root
///     if (!item.path.includes(project)) {
///       return path.join(this.root, 'projects', project, 'dist', item.file)
///     }
///
///     const dist = item.path.replace(/\bapp\b/, 'dist')
///
///     if (item.processor === 'template' && locale) {
///       return dist.replace(`${item.file}`, path.join(locale, item.file))
///     }
///     return dist
///   },
/// }
/// ```
/// @description
/// This will compile any file if it can be compiled
///
/// @returns {function} render
export default async function compile(project_root, options = {}) {
  debug('start setup')

  options = to.extend({
    root: process.cwd(),
    ignore: [],
    minify: false,
    sourcemaps: true,
    pretty: true,
    style: { dirs: [] },
    template: {},
    javascript: {},
    layout: '',
    rename(item, locale, project) {
      // the item that was passed in is from the layout root
      if (!item.path.includes(project)) {
        return path.join(this.root, 'projects', project, 'dist', item.file)
      }

      const dist = item.path.replace(/\bapp\b/, 'dist')
      if (item.processor === 'template' && locale) {
        return dist.replace(`${item.file}`, path.join(locale, item.file))
      }
      return dist
    },
  }, options)

  const [ , project_name ] = project_root.replace(options.root + path.sep, '').split(path.sep)

  const glob_options = {
    ignore: [ 'node_modules' ].concat(options.ignore),
    nodir: true,
    cwd: options.root,
  }
  const root_files = await globby(path.join(project_root, '**', '*'), glob_options)


  let layout_files = []
  if (options.layout_folder) {
    layout_files = await globby(
      options.layout_folder ? `${options.layout_folder}/**/*` : `${options.root}/_content.json`,
      { nodir: true },
    )

    options.style.dirs.push(options.layout_folder)

    // prepend layout files so that the layout content file will be overwritten by the project specific content file
    root_files.unshift(...layout_files)
  }
  options.template.root = options.root
  options.template.layout_folder = options.layout_folder

  const processors = to.keys(utils.processors)
    .reduce((prev, next) => {
      prev[next] = require(`./${next}/index.js`).default
      return prev
    }, {})

  function run(files, locales) {
    return reduce(files, async (prev, file) => {
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

      const result = await processors[type](file, {
        project_root,
        root: options.root,
        minify: options.minify,
        sourcemaps: options.sourcemaps,
        pretty: options.pretty,
        fallback_locale: options.fallback_locale,
        layout: options.layout,
        layout_folder: options.layout_folder,
        locales,
        ...opts,
      })

      for (const item of to.array(result)) {
        item.type = type
        item.path = utils.renameExt(file)
        item.src = file
        item.root = file.includes(project_root) ? project_root : options.layout_folder
        item.file = item.path.replace(item.root + path.sep, '')
        item.processor = type
        item.dist = options.rename(item, item.locale, project_name)

        if (typeof item.dist !== 'string' || !item.dist) {
          throw new Error(`the file must be a string, you return '${item.dist}' from 'options.rename'`)
        }

        if (!options.sourcemaps) {
          item.map = ''
        }

        prev.push(item)
      }

      debug(`end file ${debug_file}`)
      return prev
    }, [])
  }

  // run the initial setup for templates and reset it to call in the `run` function above
  processors.template = await processors.template(root_files, options.template, project_root)

  debug('end  setup')
  ///# @name render
  ///# @description This function is used to render any glob that's passed to it
  ///# @arg {string} glob ['**/*'] - The glob to render
  ///# @arg {array, string} locales [all] - the locales to build
  ///# @returns {array} - files that have been rendered
  return async (glob = '**/*', locales = 'all') => {
    debug('start render')
    const globs = [ glob ]
    if (glob.includes('**/*')) {
      globs.unshift(...layout_files)
    }
    let files = await globby(globs, glob_options)

    files = files
      // move all the template files to the second array and any other file to the first array
      .reduce((prev, file) => {
        const is_template_file = utils.processors.template.includes(utils.ext(file)) ? 1 : 0

        // if the file is a template file and is a layout file then ignore it
        if (
          utils.shouldIgnore(file) || (
            is_template_file &&
            layout_files.includes(file)
          )
        ) {
          return prev
        }

        prev[is_template_file].push(file)
        return prev
      }, [ [], [] ])

    // run all the files through that aren't template files
    files[0] = await run(files[0], locales)

    // add the compiled files on to the template globals so
    // that they will be available to the project
    options.template.files = _.assign(
      options.template.files || {},
      files[0].reduce((prev, next) => {
        let list = next.file.split(path.sep)
        const file = list.pop().split('.') // remove the file from the list
        list.unshift(file.pop()) // unshift the file ext on the start of the list
        list.push(file.join('.')) // push the file back onto the list
        list = list.map(to.snakeCase) // normalize the strings to be snake case
        _.set(prev, list, next)
        return prev
      }, {}),
    )

    // render all the template files
    files[1] = await run(files[1], locales)

    debug('end render')
    return to.flatten(files)
  }
}
