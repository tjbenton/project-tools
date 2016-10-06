/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import path from 'path'
import style from '../../../dist/compile/style'

const test = ava.group('compile/style:')

function run(ext) {
  return async (t) => {
    const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
    const result = await style(path.join(__dirname, '..', 'fixtures', 'style', `test.${ext}`))

    t.is(result.code, expected)
    t.truthy(result.map)
    t.is(result.language, ext)
  }
}

test('css', run('css'))
test('less', run('less'))
test('sass', run('sass'))
test('scss', run('scss'))
test('styl', run('styl'))


test('minify', async (t) => {
  const expected = '.level-1__level-2{background:#00f}\n'
  const result = await style(path.join(__dirname, '..', 'fixtures', 'style', 'test.scss'), {
    minify: true
  })

  t.is(result.code, expected)
  t.truthy(result.map)
  t.is(result.language, 'scss')
})

test('no pretty', async (t) => {
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const result = await style(path.join(__dirname, '..', 'fixtures', 'style', 'test.scss'), {
    pretty: false
  })

  t.is(result.code, expected)
  t.truthy(result.map)
  t.is(result.language, 'scss')
})

test('no sourcemaps', async (t) => {
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const result = await style(path.join(__dirname, '..', 'fixtures', 'style', 'test.scss'), {
    sourcemaps: false
  })

  t.is(result.code, expected)
  t.falsy(result.map)
  t.is(result.language, 'scss')
})
