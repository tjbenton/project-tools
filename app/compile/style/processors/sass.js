import sass from 'node-sass'
import to from 'to-js'
const debug = require('debug')('compile:style:sass')

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
      omitSourceMapUrl: true
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
