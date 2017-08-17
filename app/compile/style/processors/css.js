import fs from 'fs-extra-promisify'
import to from 'to-js'
const debug = require('debug')('compile:style:css')

/// @name css
/// @page compile/style/css
/// @description
/// This is used to compile css files
/// @arg {string} file - The path to the file that is going to be compiled
/// @returns {object}
/// ```js
/// {
///   code: '', // the code of the css file
///   map: '', // always blank since it's a css file
/// }
/// ```
/// @async
export default async function css(file) {
  debug('start')
  const code = to.string(await fs.readFile(file))
  debug('end')
  return {
    code,
    map: '',
  }
}
