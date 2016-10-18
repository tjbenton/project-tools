import stylus from 'stylus'
import fs from 'fs-extra-promisify'
import to from 'to-js'
const debug = require('debug')('compile:style:styl')

/// @name styl
/// @page compile/style/styl
/// @description
/// This is used to compile styl files
/// @arg {string} file - The file path that is going to be compiled
/// @arg {array} dirs - The dirs to include in the include paths
/// @returns {object}
/// ```js
/// {
///   code: '', // the compiled code of the styl file
///   map: '', // map of the resulting file
/// }
/// ```
/// @async
export default function(file, dirs) {
  return new Promise((resolve, reject) => {
    debug('start')
    fs.readFile(file)
      .then((contents) => {
        const style = stylus(to.string(contents))
        style.set('filename', file)
        style.set('paths', dirs)
        style.set('compress', false)
        style.set('include css', true)
        style.set('sourcemap', {
          comment: false,
          inline: false
        })

        style.render((err, code) => {
          if (err) {
            return reject(err)
          }

          resolve({ code, map: to.json(style.sourcemap, 0) })
          debug('end')
        })
      })
  })
}
