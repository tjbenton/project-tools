/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import fs from 'fs-extra-promisify'
import path from 'path'
import none from '../../../dist/compile/none'

const test = ava.group('compile/none:')
const test_root = path.join(__dirname, 'none-test')

test.before(async () => {
  await fs.remove(test_root)
})

test.todo('none')

test.after.always(() => fs.remove(test_root))
