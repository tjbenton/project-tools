import stylus from 'stylus'
import fs from 'fs-extra-promisify'
import to from 'to-js'
const debug = require('debug')('compile:style:styl')

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
