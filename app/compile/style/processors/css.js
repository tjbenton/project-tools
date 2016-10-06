import fs from 'fs-extra-promisify'
import to from 'to-js'
const debug = require('debug')('compile:style:css')

export default async function css(file) {
  debug('start')
  const code = to.string(await fs.readFile(file))
  debug('end')
  return {
    code,
    map: ''
  }
}
