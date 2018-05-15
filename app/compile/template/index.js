import * as utils from '../utils'
import { beautify } from '../../utils'
import fs from 'fs-extra-promisify'
import to from 'to-js'
import templates from 'templates'
import { forEach, map, reduce } from 'async-array-methods'
import consolidate from 'consolidate'
import _ from 'lodash'
import path from 'path'
import i18n from 'i18next'
import sprintf from 'i18next-sprintf-postprocessor'

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
export default async function template(files, options = {}, project_root) { // eslint-disable-line
  debug('start')
  files = to.array(files)
  options = to.extend({
    root: process.cwd(),
    globals: { _ },
    pretty: true,
    fallback_locale: 'eng',
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

  app.option('cwd', options.project_root)

  const template_files = files.filter((file) => utils.type(file) === 'template') // find only the template files
  const project_files = files.filter((file) => file.includes(project_root))

  addTemplateLanguages(app, options, template_files) // adds all the template languages available

  let initial_resources = await resolveContent(files) // gets the content to use for the project for the initial run
  let all_locales = to.keys(initial_resources)
  let locales_from_folders = false

  for (const file of project_files) {
    const parts = file.split(path.sep)
    const locales_index = parts.indexOf('locales')
    if (locales_index > -1) {
      const locale = parts[locales_index + 1]
      // if there is a file in the locales folder, we want to error
      if (locale.includes('.')) {
        throw new Error('All items in the "locales" folder must be folders.')
      }
      locales_from_folders = true
      all_locales.push(locale)
    }
  }

  all_locales = to.unique(all_locales)

  // reads all the template files and adds them to the app so they can be compiled
  await addTemplateFiles(app, options, template_files, all_locales)

  // find the correct amount of spaces to indent the contents before a layout's applied
  let spaces = app.find(options.layout, 'layouts')
  spaces = spaces && spaces.content && spaces.content.match(/^(\s+){%\s*body\s*%}/gmi)
  spaces = spaces ? spaces[0].replace(/{.*}/, '').length : 0

  app.on('preLayout', (view) => {
    // only apply the indent if it's a view
    if (spaces && view.isView && !view.isPartial) {
      // indent all the lines, then remove the padding from the starting line
      view.contents = pad(view.contents, spaces).replace(/^\s*/, '')
    }
  })

  // Note that this wouldn't be necessary if the `templates` lib supported
  // `pug` and other indented languages better
  app.on('postCompile', fixIndentLang)
  app.on('postLayout', fixIndentLang)

  includeHelper(app)

  debug('end')

  ///# @name render
  ///# @arg {string} file - the file path to compile
  ///# @arg {object} locals - Local variables to be accessible in the templates
  ///#
  ///# @returns {object}
  ///# ```js
  ///# {
  ///#   locale: '', // the locale that was used to compile the file
  ///#   code: '', // the compiled code for the file
  ///#   map: '', // the sourcemap for the file
  ///#   language: '' // the language it was compile from
  ///# }
  ///# ```
  ///# @async
  return async (file, locals = {}) => {
    debug('render:start')
    locals.file = file

    let { locales: locales_to_build } = locals
    delete locals.locales

    if (locales_to_build && locales_to_build.includes('all')) {
      // if a locale is found to be in `locales_to_build` but
      // is not in `all_locales`, we want to throw an error.
      // NOTE: `locales_to_build` is typically an array, but it
      // can sometimes just be the string 'all' if nothing is specified on the --locale flag.
      // if `locales_to_build` is just 'all', then we don't have to do all this checking.
      if (locales_to_build !== 'all') {
        const unbuildable_locales = locales_to_build.filter((locale) => {
          return locale !== 'all' && all_locales.indexOf(locale) === -1
        })

        if (unbuildable_locales.length) {
          throw new Error(`The locales "${unbuildable_locales}" could not be built.`)
        }
      }

      locales_to_build = all_locales
    }

    if (locales_from_folders) {
      const parts = file.split(path.sep)
      const file_locale = parts[parts.indexOf('locales') + 1]
      if (!locales_to_build.includes(file_locale)) {
        return null
      }
      locales_to_build = [ file_locale ]
    }

    let resources
    // if the `initial_resources` is defined then use it then set it to null
    // so the following times this render function is run it will update the content
    if (initial_resources) {
      resources = initial_resources
      initial_resources = null
    } else {
      resources = await resolveContent(files)
    }


    function render(locale = null) {
      const project_locals = to.clone(locals)
      project_locals.locale = locale

      // create a new instance of i18n so that multiple builds can run at the same time
      const i18nInstance = i18n.createInstance()
      i18nInstance
        .use(sprintf)
        .init({
          overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
          resources,
          lng: locale || options.fallback_locale,
          fallbackLng: options.fallback_locale, // if a language doesn't have a key defined then it will fallback to the one set here
          interpolation: { escapeValue: false }, // doesn't escape html characters so html can be appart of the content
          returnObjects: true, // returns arrays and objects as arrays and objects
          initImmediate: false, // since we aren't loading the data, we don't need it to be async
        })

      // add the i18n.t function as helpers in the app
      const translate = i18nInstance.t.bind(i18nInstance)

      // add the i18n.t function to the locals for other languages like pug
      project_locals.t = project_locals.translate = translate // eslint-disable-line id-length
      app.helper('t', translate)
      app.helper('translate', translate)


      return new Promise((resolve, reject) => {
        app.render(getLocaleFile(file, locale), project_locals, (err, page) => {
          if (err) {
            err.filename = file
            if (typeof err.toJSON === 'function') {
              delete err.src
              delete err.toJSON
            }
            reject(err)
            return
          }

          renderLayout(page)
            .then((view) => {
              let code = view.content

              if (options.pretty) {
                code = beautify(code, 'html')
              }

              resolve({
                locale,
                code,
                map: '',
                language: utils.ext(file),
              })
            })
            .catch(reject)
        })
      })
    }

    if ((locales_to_build || []).length) {
      return map(locales_to_build, render)
    }

    return render()
  }
}



/// @name resolveContent
/// @description This will take the content files that're passed to it ad read
/// them and modify them to conform to i18n standard of namespacing
/// @arg {array} files [[]] - The files to read
/// @returns {object} - The object of content that has been merged together
function resolveContent(files = []) {
  return reduce(files.filter((file) => file.includes('_content.json')), async (prev, file) => {
    const contents = await fs.readJson(file)
    for (const [ locale, content ] of to.entries(contents)) {
      // if the keys don't include translation then add it in there
      if (to.keys(content)[0] !== 'translation') {
        contents[locale] = { translation: content }
      }
    }
    return to.extend(prev, contents)
  }, {})
}


/// @name fixIndentLang
/// @description This fixes weird issues with indented languages
/// @note that this wouldn't be necessary if the `templates` lib supported `pug` and other indented languages better
/// @returns {function}
/// @access private
function fixIndentLang(item) {
  if ([ 'pug', 'jade' ].includes(utils.ext(item.key))) {
    const str = item.contents.toString()
    const script_regex = /<script(?:\s+[^>]*)?>((?:.|\n)*?)<\/script(\s+[^>]*)?>/g
    str.replace(script_regex, (match, content) => {
      if (content.split('\n').slice(1).filter((line) => line.trim()).length) {
        throw new Error('Inline JS with multiple lines is not supported with `pug`, and `jade` files')
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
}


/// @name addTemplateLanguages
/// @description This adds all the languages avaliable to the app
/// @arg {Templates} app - the app
/// @arg {object} options - the options
/// @arg {array} files - the template files
/// @access private
function addTemplateLanguages(app, options, template_files) {
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
}



/// @name getLocaleFile
/// @description This is used to get the locale file path to use since the templates lib
/// is weird about rendering the same page with different locales
/// @arg {stirng} file - The file path to use
/// @arg {string, undefined} locale - the locale to use if it's needed
/// @returns {string} the same file that was passed if no locale was passed or the file path with the locale
function getLocaleFile(file, locale) {
  if (!locale) return file

  const parsed_file = path.parse(file)
  parsed_file.base = parsed_file.base.replace(parsed_file.ext, `____${locale}${parsed_file.ext}`)
  return path.format(parsed_file)
}

/// @name addTemplateFiles
/// @description This adds the views to the app
/// @arg {Templates} app - the app
/// @arg {object} options - the options
/// @arg {array} files - the template files
/// @access private
/// @async
async function addTemplateFiles(app, options, template_files, locales = []) {
  const ignore = template_files.filter(utils.shouldIgnore)
  const views = {}
  views.layouts = ignore.filter((file) => path.basename(file).includes('layout.'))
  views.partials = ignore.filter((file) => !views.layouts.includes(file))
  views.pages = template_files.filter((file) => !utils.shouldIgnore(file))

  await forEach(_.keys(views), async (type) => {
    await forEach(views[type], async (page) => {
      const content = to.string(await fs.readFile(page))

      function addFile(file) {
        const info = {
          path: file,
          content,
        }

        // if the type is a page, then set the layout to be the layout that was passed in
        if (type === 'pages' && !!options.layout) {
          info.layout = options.layout
        }

        app[type.slice(0, -1)](file, info)
      }



      // always add the original file
      addFile(page)

      // if the type is pages then add all the locale files
      if (type === 'pages') {
        for (const locale of locales) {
          addFile(getLocaleFile(page, locale))
        }
      }
    })
  })
}


/// @name includeHelper
/// @description This is used to add the include helper to the app
/// @arg {Template} app - the app
function includeHelper(app) {
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

    const ctx = to.extend(to.extend(to.extend({}, this.context || {}), locals || {}), view.ctx || {})

    view.render(ctx, (err, { content }) => {
      if (err) {
        return cb(err)
      }

      cb(null, content)
    })
  })
}

/// @name pad
/// @description pad each line with spaces
/// @arg {string} str - the string to pad with characters
/// @arg {number} amount - the amount of characters you put infront of each line
/// @arg {string} character [' '] - the character
/// @returns {string} the padded string with characters
function pad(str, amount, character = ' ') {
  const characters = _.repeat(character, amount)
  return str.toString()
    .split('\n')
    .map((line) => `${characters}${line}`)
    .join('\n')
}


/// @name renderLayout
/// @description this will render the layout file with correct data
/// @arg {View} page - This is the view class
/// @returns {View} - With the updated contents
/// @async
function renderLayout(page) {
  return new Promise((resolve, reject) => {
    // If the page has a layout applied to it and the layouts template language is different than the
    // pages language then render the layout with the correct engine. This is nessisary because
    // the templates lib doesn't compile the layout file
    if (
      page.layoutStack &&
      page.layoutStack.length &&
      utils.ext(page.key) !== utils.ext(page.layoutStack[0].layout.key)
    ) {
      const file = page.layoutStack[0].layout.key
      page.engine = `.${utils.ext(file)}`

      const locals = page.localsStack.reduce((prev, next) => to.extend(prev, next), {})
      locals.file = file

      page.render(locals, (error, view) => {
        if (error) return reject(error)

        resolve(view)
      })
    } else {
      resolve(page)
    }
  })
}
