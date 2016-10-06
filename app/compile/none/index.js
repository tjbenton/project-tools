import { ext } from '../utils'
import fs from 'fs-extra-promisify'

export default async function none(file) {
  return {
    code: await fs.readFile(file),
    map: '',
    language: ext(file)
  }
}
