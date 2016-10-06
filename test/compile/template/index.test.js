/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import path from 'path'
import globby from 'globby'
import template from '../../../dist/compile/template'

const test = ava.group('compile/template:')

test(async (t) => {
  const root = path.join(__dirname, '..', 'fixtures', 'template')
  const render = await template(await globby(path.join(root, '**', '*')), {
    languages: {
      pug: 'pug'
    },
    layout: '_layout'
  })

  const actual = await render(path.join(root, 'index.pug'))
  const expected = {
    code: [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <meta charset="utf-8">',
      '  <title></title>',
      '</head>',
      '<body>',
      '  <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>',
      '  <ul>',
      '    <li>item</li>',
      '    <li>item</li>',
      '    <li>item</li>',
      '    <li>item</li>',
      '  </ul>',
      '  <h1>Partial</h1>',
      '</body>',
      '</html>',
      ''
    ].join('\n'),
    map: '',
    language: 'pug'
  }

  t.deepEqual(actual, expected)
})
