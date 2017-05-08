/* eslint-disable id-length, no-shadow */

import test from 'ava-spec'
import path from 'path'
import sass from '../../../../dist/compile/style/processors/sass.js'

test('compile/style/processors/sass:', async (t) => {
  const file = path.join(__dirname, '..', '..', 'fixtures', 'style', 'test.sass')
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const result = await sass(file)
  t.is(result.code, expected)
  t.is(typeof result.map, 'string')
})
