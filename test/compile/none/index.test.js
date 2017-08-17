import ava from 'ava-spec'
import { join as p } from 'path'
import none from '../../../dist/compile/none'

const test = ava.group('compile/none:')
const test_root = p(__dirname, '..', 'fixtures', 'none')

test.group('expanded', (test) => {
  test(async (t) => {
    const result = await none(p(test_root, 'image.jpg'))
    t.is(typeof result.code, 'string')
    t.falsy(result.map)
    t.is(result.language, 'jpg')
  })
})
