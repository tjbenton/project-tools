import { ext } from '../utils'
import fs from 'fs-extra-promisify'

/// @name none
/// @page compile/none
/// @description
/// This is used to compile any other filetype
///
/// @arg {string} file - The file to read
///
/// @returns {object}
///
/// ```js
/// {
///   code: <Buffer ...>, // the buffer for the file
///   map: '', // the map is always blank
///   language: '', // the file extention
/// }
/// ```
/// @async
export default async function none(file) {
  return {
    code: await fs.readFile(file),
    map: '',
    language: ext(file)
  }
}
