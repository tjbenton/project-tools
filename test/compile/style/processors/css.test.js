import test from 'ava-spec'
import path from 'path'
import css from '../../../../dist/compile/style/processors/css.js'

test('compile/style/processors/css:', async (t) => {
  const file = path.join(__dirname, '..', '..', 'fixtures', 'style', 'test.css')
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const result = await css(file)
  t.is(result.code, expected)
  t.is(typeof result.map, 'string')
})
