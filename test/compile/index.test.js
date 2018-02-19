import ava from 'ava-spec'
const test = ava.group('compile:')
import compile from '../../dist/compile'
import path from 'path'
import { stripRoot } from '../utils'

const fixtures = path.join(__dirname, 'fixtures')

test('style', async (t) => {
  const expected = '.level-1__level-2 {\n  background: #00f;\n}\n'
  const root = path.join(fixtures, 'style')
  const render = await compile(root)
  const result = await render(path.join(root, '**', '*'))

  t.truthy(Array.isArray(result), 'is an array')
  t.is(5, result.length)

  result.forEach((item) => {
    t.is(item.code, expected)
    t.truthy(item.language)
    t.truthy(item.src)
    t.truthy(item.root)
    t.truthy(item.processor)
    t.truthy(item.map)
  })
})

test('javascript', async (t) => {
  const expected = '(function() {\n  \'use strict\';\n\n\n\n}());\n'
  const root = path.join(fixtures, 'javascript')
  const render = await compile(root)
  const result = await render(path.join(root, '**', '*'))
  t.truthy(Array.isArray(result), 'is an array')
  t.is(2, result.length)
  result.forEach((item) => {
    t.is(item.code, expected)
    t.truthy(item.language)
    t.truthy(item.src)
    t.truthy(item.path)
    t.truthy(item.root)
    t.truthy(item.processor)
    t.truthy(item.map)
  })
})


test.group('template', (test) => {
  const folders = [ 'css', 'data', 'simple' ]

  folders.forEach((folder) => {
    const root = path.join(fixtures, 'template', folder)
    test(folder, async (t) => {
      const render = await compile(root, { root, layout: '_layout.html' })
      const actual = await render(path.join(root, '**', '*'))
      t.snapshot(stripRoot(actual))
    })
  })
})
