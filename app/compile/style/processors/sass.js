import sass from 'node-sass'
import to from 'to-js'
const debug = require('debug')('compile:style:sass')


/// @name sass
/// @page compile/style/sass
/// @description
/// This is used to compile sass files
/// @arg {string} file - The file path that is going to be compiled
/// @arg {array} dirs - The dirs to include in the include paths
/// @returns {object}
/// ```js
/// {
///   code: '', // the compiled code of the sass file
///   map: '', // map of the resulting file
/// }
/// ```
/// @async
export default function(file, dirs) {
  return new Promise((resolve, reject) => {
    debug('start')
    sass.render({
      file,
      includePaths: dirs,
      outputStyle: 'expanded',
      sourceMap: true,
      sourceMapEmbed: false,
      sourceMapContents: true,
      outFile: file,
      omitSourceMapUrl: true,
    }, (err, { css: code, map }) => {
      if (err) {
        return reject(err)
      }

      code = to.string(code)
      map = to.string(map)

      resolve({ code, map })
      debug('end')
    })
  })
}
