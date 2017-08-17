import ava from 'ava-spec'
import path from 'path'
import globby from 'globby'
import template from '../../../dist/compile/template'

const test = ava.group('compile/template:')
const fixtures = path.join(__dirname, '..', 'fixtures', 'template')

test('simple', async (t) => {
  const root = path.join(fixtures, 'simple')
  const render = await template(await globby(path.join(root, '**', '*')), { layout: '_layout' })

  const actual = await render(path.join(root, 'index.pug'))

  t.is(actual.language, 'pug')
  t.is(actual.map, '')
  t.snapshot(actual.code)
})


// ensure that <style> that doesn't break the rendering process of pug
test('css', async (t) => {
  const root = path.join(fixtures, 'css')
  const render = await template(await globby(path.join(root, '**', '*')), { layout: '_layout' })
  const actual = await render(path.join(root, 'index.pug'))

  t.is(actual.language, 'pug')
  t.is(actual.map, '')
  t.snapshot(actual.code)
})


// expect an error when a code like this is present at any point
// ```js
// <script>
//   console.log('adfasdfasdfs')
// </script>
// ```
test('js-error', async (t) => {
  const root = path.join(fixtures, 'js-error')
  const render = await template(await globby(path.join(root, '**', '*')), { layout: '_layout' })

  try {
    await render(path.join(root, 'index.pug'))
    t.fail('expected a failure')
  } catch (e) {
    t.is(e.message, 'Inline JS with multiple lines is not supported with `pug`, and `jade` files')
  }
})



test.group('data', (test) => {
  const root = path.join(fixtures, 'data')

  test('json', async (t) => {
    const render = await template(await globby(path.join(root, '**', '*')), { layout: '_layout' })

    const actual = await render(path.join(root, 'json-test.pug'))

    t.is(actual.code.match(/<h1>.*<\/h1>/g).length, 2)
    t.is(actual.language, 'pug')
    t.is(actual.map, '')
    t.snapshot(actual.code)
  })

  test('partial', async (t) => {
    const render = await template(await globby(path.join(root, '**', '*')), { layout: '_layout' })
    const actual = await render(path.join(root, 'partial-test.pug'))

    t.is(actual.code.match(/<h1>.*<\/h1>/g).length, 2)
    t.is(actual.language, 'pug')
    t.is(actual.map, '')
    t.snapshot(actual.code)
  })
})

