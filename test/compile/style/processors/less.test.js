/* eslint-disable id-length, no-shadow */

import test from 'ava-spec'
import path from 'path'
import less from '../../../../dist/compile/style/processors/less.js'

test('compile/style/processors/less:', async (t) => {
  const file = path.join(__dirname, '..', '..', 'fixtures', 'style', 'test.less')
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  let result = await less(file)
  t.is(result.code, expected)
  t.is(typeof result.map, 'string')
})
