/* eslint-disable id-length, no-shadow */

import test from 'ava-spec'
import path from 'path'
import styl from '../../../../dist/compile/style/processors/styl.js'

test('compile/style/processors/styl:', async (t) => {
  const file = path.join(__dirname, '..', '..', 'fixtures', 'style', 'test.styl')
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const result = await styl(file)
  t.is(result.code, expected)
  t.is(typeof result.map, 'string')
})
