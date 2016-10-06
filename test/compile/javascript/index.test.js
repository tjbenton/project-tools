/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import path from 'path'
import javascript from '../../../dist/compile/javascript'

const test = ava.group('compile/javascript:')


test.group('expanded', (test) =>{
  function run(ext) {
    return async (t) => {
      const expected = '(function() {\n  \'use strict\';\n\n\n\n}());\n'
      const result = await javascript(path.join(__dirname, '..', 'fixtures', 'javascript', `test.${ext}`))

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
  const result = await javascript(path.join(__dirname, '..', 'fixtures', 'javascript', 'test.js'), {
    minify: true
  })

  t.is(result.code, expected)
  t.pass()
})

test('no sourcemaps', async (t) => {
  const expected = '(function() {\n  \'use strict\';\n\n\n\n}());\n'
  const result = await javascript(path.join(__dirname, '..', 'fixtures', 'javascript', 'test.js'), {
    sourcemaps: false
  })

  t.is(result.code, expected)
  t.falsy(result.map)
  t.pass()
})

test('no pretty', async (t) => {
  const expected = '(function () {\n  \'use strict\';\n\n\n\n}());\n'
  const result = await javascript(path.join(__dirname, '..', 'fixtures', 'javascript', 'test.js'), {
    pretty: false
  })

  t.is(result.code, expected)
  t.pass()
})
