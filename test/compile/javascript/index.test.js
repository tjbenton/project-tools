/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import { join as p } from 'path'
import javascript from '../../../dist/compile/javascript'

const test = ava.group('compile/javascript:')
const test_root = p(__dirname, '..', 'fixtures', 'javascript')

test.group('expanded', (test) =>{
  function run(ext) {
    return async (t) => {
      const expected = '(function() {\n  \'use strict\';\n\n\n\n}());\n'
      const result = await javascript(p(test_root, `test.${ext}`))

      t.is(result.code, expected)
      t.truthy(result.map)
      t.is(result.language, ext)
    }
  }

  test('js', run('js'))
  test('es', run('es'))
})

test('minified', async (t) => {
  const expected = '!function(){"use strict"}();\n'
  const result = await javascript(p(test_root, 'test.js'), {
    minify: true
  })

  t.is(result.code, expected)
  t.pass()
})

test('no sourcemaps', async (t) => {
  const expected = '(function() {\n  \'use strict\';\n\n\n\n}());\n'
  const result = await javascript(p(test_root, 'test.js'), {
    sourcemaps: false
  })

  t.is(result.code, expected)
  t.falsy(result.map)
  t.pass()
})

test('no pretty', async (t) => {
  const expected = '(function () {\n  \'use strict\';\n\n\n\n}());\n'
  const result = await javascript(p(test_root, 'test.js'), {
    pretty: false
  })

  t.is(result.code, expected)
  t.pass()
})
