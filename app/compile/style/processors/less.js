import less from 'less'
import fs from 'fs-extra-promisify'
import to from 'to-js'
const debug = require('debug')('compile:style:less')

export default function(file, dirs) {
  return new Promise((resolve, reject) => {
    debug('start')
    fs.readFile(file)
      .then((contents) => {
        less.render(to.string(contents), {
          paths: dirs,
          filename: file,
          compress: false,
          sourceMap: true
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
  })
}
