import ava from 'ava-spec'
const test = ava.group('compile/utils:')
import * as utils from '../../dist/compile/utils.js'

test('processors', (t) => {
  t.deepEqual(Object.keys(utils.processors), [ 'template', 'style', 'javascript', 'none' ])
})

test('ext', (t) => {
  t.is(utils.ext('file.js'), 'js')
  t.is(utils.ext('file.css'), 'css')
  t.is(utils.ext('file.scss'), 'scss')
  t.is(utils.ext('file.sass'), 'sass')
  t.is(utils.ext('file.styl'), 'styl')
})

test('type', (t) => {
  for (const type in utils.processors) {
    if (utils.processors.hasOwnProperty(type)) {
      utils.processors[type].forEach((item) => {
        t.is(utils.type(`file.${item}`), type)
      })
    }
  }

  t.is(utils.type('file.md'), 'none')
  t.is(utils.type('file.html'), 'template')
  t.is(utils.type('file.txt'), 'template')
})

test('shouldIgnore', (t) => {
  t.truthy(utils.shouldIgnore('some/path/_file.scss'))
  t.falsy(utils.shouldIgnore('some/path/site.scss'))
})


test.group('renameExt', (test) => {
  function run(group, expected) {
    group.forEach((ext) => {
      test(ext, (t) => {
        t.is(utils.renameExt(`file.${ext}`), `file.${expected || ext}`)
      })
    })
  }
  const { processors } = utils

  run(processors.style, 'css')
  run(processors.template, 'html')
  run(processors.javascript, 'js')
  run([ 'json', 'png', 'gif', 'psd', 'pdf' ])
})
