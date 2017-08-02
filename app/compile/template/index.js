import * as utils from '../utils'
import { beautify } from '../../utils'
import fs from 'fs-extra-promisify'
import to from 'to-js'
import templates from 'templates'
import { forEach } from 'async-array-methods'
import consolidate from 'consolidate'
import _ from 'lodash'
import path from 'path'
const debug = require('debug')('compile:template')

/// @name template
/// @page compile/template
/// @description
/// This is used to compile any template
/// @arg {string, array} files - files to use
/// @arg {object} options
///
/// ```js
/// {
///   root: process.cwd(),
///
///   // globals that will be applied to the templates
///   globals: { _ },
///
///   // determins if the code should be printed in a run through a beautifier
///   pretty: true,
///
///   // languages that can be used along with their npm package as a string.
///   // Can also pass in any language that's supported by [`consolidate`](https://github.com/tj/consolidate.js/)
///   // If you need to pass in options to a language you can pass them in via an object
///   // `{ ext: 'pug', options: { pretty: true } }`
///   languages: {
///     txt: 'engine-base',
///     html: 'engine-base',
///     hbs: 'handlebars'
///   },
///
///   // The layout file to use for these pages
///   layout: '',
/// }
/// ```
/// @async
export default async function template(files, options = {}) { // eslint-disable-line
  debug('start')
  files = to.array(files)
  options = to.extend({
    root: process.cwd(),
    globals: { _ },
    pretty: true,
    languages: {
      txt: 'engine-base',
      html: 'engine-base',
      hbs: 'handlebars',
    },
    layout: '',
  }, options)

  const app = templates()

  app.create('pages')
  app.create('layouts', { viewType: 'layout' })
  app.create('partials', { viewType: 'partial' })

  app.option('cwd', options.root)

  ///# @todo {5} Add the ability to add data to the project
  // const data = files.filter((file) => utils.ext(file) === 'json')
  const template_files = files.filter((file) => utils.type(file) === 'template')

  // and any languages that aren't specifcally defined
  to.unique(template_files.map(utils.ext))
    .filter((lang) => options.languages[lang] == null)
    .forEach((lang) => app.engine(lang, consolidate[lang]))

  // set the languages
  for (let [ language, pkg ] of to.entries(options.languages)) { // eslint-disable-line
    let language_options = {}
    if (to.type(pkg) === 'object') {
      language_options = pkg
      pkg = pkg.pkg || language
      delete language_options.pkg
    }

    app.engine(language, consolidate[pkg] || require(pkg), language_options)
  }

  const ignore = template_files.filter(utils.shouldIgnore)
  const views = {}
  views.layouts = ignore.filter((file) => path.basename(file).includes('layout.'))
  views.partials = ignore.filter((file) => !views.layouts.includes(file))
  views.pages = template_files.filter((file) => !utils.shouldIgnore(file))

  await forEach(_.keys(views), async (type) => {
    await forEach(views[type], async (page) => {
      const content = to.string(await fs.readFile(page))
      const info = {
        path: page,
        content
      }

      if (type === 'pages' && !!options.layout) {
        info.layout = options.layout
      }

      app[type.slice(0, -1)](page, info)
    })
  })

  ///# @name include
  ///# @description This is used inside of any template file to import any other template file
  ///# @arg {string} file - The file path to the template to include
  ///# @arg {object} locals - Any local variables to pass into the template
  ///# @markup {pug} **Usage**
  ///# != helpers.include('_partial.pug')
  ///# != helpers.include('_partial')
  app.asyncHelper('include', function Include(file, locals, cb) {
    if (typeof locals === 'function') {
      cb = locals
      locals = {}
    }

    const view = this.app.find(file)

    if (!view) {
      return cb(null, `<!-- can't find import ${file} -->`)
    }

    const ctx = _.extend({}, this.context || {}, locals || {}, view.ctx || {})

    view.compile()

    view.render(ctx, (err, { content }) => {
      if (err) {
        return cb(err)
      }

      cb(null, content)
    })
  })

  debug('end')

  ///# @name render
  ///# @arg {string} file - the file path to compile
  ///# @arg {object} locals - Local variables to be accessible in the templates
  ///#
  ///# @returns {object}
  ///# ```js
  ///# {
  ///#   code: '', // the compiled code for the file
  ///#   map: '', // the sourcemap for the file
  ///#   language: '' // the language it was compile from
  ///# }
  ///# ```
  ///# @async
  return (file, locals = {}) => {
    debug('render:start')
    return new Promise((resolve, reject) => {
      locals.file = file

      const view = app.find(file)

      // Note that this wouldn't be necessary if the `templates` lib supported
      // `pug` and other indented languages better
      app.on('preRender', (item) => {
        if ([ 'pug', 'jade' ].includes(utils.ext(item.key))) {
          const str = item.contents.toString()
          const script_regex = /<script(?:\s+[^>]*)?>((?:.|\n)*?)<\/script(\s+[^>]*)?>/g
          str.replace(script_regex, (match, content) => {
            if (content.split('\n').slice(1).filter((line) => line.trim()).length) {
              reject(new Error('Inline JS with multiple lines is not supported with `pug`, and `jade` files'))
              return ''
            }

            return content
          })

          item.contents = str
            // minify each <style> tag into their own single line so that pug/jade doesn't break
            .replace(/(<style(?:\s+[^>]*)?>)((?:.|\n)*?)(<\/style(\s+[^>]*)?>)/g, (match, open, content, close) => {
              content = content
                // remove the last `;` from each property list
                .replace(/;(?=(\s|\n)*})/g, '')
                // remove the space between these characters
                .replace(/\s*([{}:;,]|!important)\s*/g, '$1')
                .trim()
              return `${open}${content}${close}\n`
            })
            // remove the space before each line that starts with `<` otherwise pug/jade breaks
            .split(/\n/)
            .map((line) => /^\s*</.test(line) ? line.trim() : line)
            .join('\n')
        }
      })

      view.compile()

      view.render(locals, (err, res) => {
        if (err) {
          err.filename = file
          if (typeof err.toJSON === 'function') {
            delete err.src
            delete err.toJSON
          }
          reject(err)
          return
        }

        let code = res.content

        if (options.pretty) {
          code = beautify(code, 'html')
        }

        resolve({
          code,
          map: '',
          language: utils.ext(file)
        })
        debug('render:end')
      })
    })
  }
}
