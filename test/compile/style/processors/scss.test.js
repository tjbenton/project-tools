/* eslint-disable id-length, no-shadow */

import test from 'ava-spec'
import path from 'path'
import scss from '../../../../dist/compile/style/processors/scss.js'

test('compile/style/processors/scss:', async (t) => {
  const file = path.join(__dirname, '..', '..', 'fixtures', 'style', 'test.scss')
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const result = await scss(file)
  t.is(result.code, expected)
  t.is(typeof result.map, 'string')
})
