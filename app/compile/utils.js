////
/// @name utils
/// @page compile
////

import path from 'path'
import to from 'to-js'
import chalk from 'chalk'
import _ from 'lodash'
import consolidate from 'consolidate'
const template = to.keys(consolidate)
_.pull(template, 'requires', 'requireReact', 'clearCache')
template.push('html')
template.push('txt')


const processors = {
  template,
  style: [ 'styl', 'scss', 'sass', 'less', 'css' ],
  javascript: [ 'js', 'es' ],
  none: []
}

export { processors }


/// @name ext
/// @description used to get the file extention from a file path
/// @arg {string} file - the filepath
/// @returns {string} the extention
export function ext(file) {
  return path.extname(file).replace(/^\./, '')
}

/// @name type
/// @description check to see if the file that was passed is a template
/// @arg {string} file - the filepath
/// @returns {string}
export function type(file) {
  const keys = to.keys(processors)

  for (let key of keys) {
    if (processors[key].includes(ext(file))) {
      return key
    }
  }

  return 'none'
}

/// @name renameExt
/// @description
/// This is used to rename filepaths to use the correct extention
/// @arg {string} file - The file path to update
/// @returns {string}
export function renameExt(file) {
  const file_ext = ext(file)
  const file_type = type(file)
  let lang = file_ext
  if (file_type === 'template') {
    lang = 'html'
  } else if (file_type === 'style') {
    lang = 'css'
  } else if (file_type === 'javascript' && file_ext === 'es') {
    lang = 'js'
  }

  return file.slice(0, file_ext.length * -1) + lang
}


/// @name shouldIgnore
/// @description determins if the file should be ignored
/// @returns {boolean}
export function shouldIgnore(file) {
  return !!file.split(path.sep)
    .filter((segment) => {
      if (!segment) {
        return false
      }
      return segment[0] === '_' || segment.indexOf('.git') === 0
    }).length
}

/// @name color
/// @description
/// used to get a random color from the `chalk`
/// @arg {string, undefined} str - The string to be colored. If it's not passed a function will be returned
/// @returns {string, funtion}
export function color(str) {
  const fn = chalk[to.random([ 'red', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray' ])]
  if (str) {
    return `${fn(str)}`
  }
  return fn
}
