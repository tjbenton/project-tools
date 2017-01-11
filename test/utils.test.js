/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
const test = ava.serial.group('utils:')
import to from 'to-js'
import {
  question,
  confirm,
  exec,
  unquote,
  beautify
} from '../dist/utils.js'
import { stdout } from 'test-console'
import stdin from 'bdd-stdin'
const keys = Object.assign({ enter: '\n', space: ' ' }, stdin.keys)

test.group('question -', (test) => {
  test('no input', async (t) => {
    const inspect = stdout.inspect()
    try {
      await question()
      t.fail('should fail')
    } catch (e) {
      t.pass('should fail')
    }
    inspect.restore()
  })

  test('input', async (t) => {
    const inspect = stdout.inspect()
    try {
      stdin('4', keys.enter)
      const answer = await question('What is 2 + 2?')
      t.is(answer, '4')
      t.is(typeof answer, 'string')
    } catch (e) {
      t.fail('should be 4')
    }
    inspect.restore()
  })
})

test.group('confirm -', (test) => {
  test('no input', async (t) => {
    const inspect = stdout.inspect()
    try {
      await confirm()
    } catch (e) {
      t.pass('should fail')
    }
    inspect.restore()
  })

  test('no default', async (t) => {
    const inspect = stdout.inspect()
    try {
      stdin(keys.enter, 'y', keys.enter)
      await confirm('should I continue?')
      t.pass('should open up help menu')
    } catch (e) {
      t.fail('should fail')
    }
    inspect.restore()
  })

  test('default true', async (t) => {
    const inspect = stdout.inspect()
    try {
      stdin(keys.enter)
      const answer = await confirm('should I continue?', true)
      t.truthy(answer === true, 'should be true')
    } catch (e) {
      t.fail('should be true')
    }
    inspect.restore()
  })

  test('default yes', async (t) => {
    const inspect = stdout.inspect()
    try {
      stdin(keys.enter)
      const answer = await confirm('should I continue?', 'yes')
      t.truthy(answer === true, 'should be true')
    } catch (e) {
      t.fail('should be true')
    }
    inspect.restore()
  })

  test('default y', async (t) => {
    const inspect = stdout.inspect()
    try {
      stdin(keys.enter)
      const answer = await confirm('should I continue?', 'y')
      t.truthy(answer === true, 'should be true')
    } catch (e) {
      t.fail('should be true')
    }
    inspect.restore()
  })
})

test.group('exec -', (test) => {
  test('echo', async (t) => {
    try {
      let result = await exec('echo \'10\'')
      t.is(result, '10', 'result should be 10')
    } catch (e) {
      t.fail('exec should be 10')
    }
  })
})

test.group('unquote -', (test) => {
  test('none', (t) => {
    const str = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Enim, aut.'
    t.is(unquote(str), str)
  })

  test('ends not quoted', (t) => {
    const str = 'Lorem ipsum dolor\' sit amet, consectetur adipisicing elit. Enim, aut.'
    t.is(unquote(str), str)
  })

  test('single', (t) => {
    const str = '\'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Enim, aut.\''
    t.is(unquote(str), str.slice(1, str.length - 1))
  })

  test('double', (t) => {
    const str = '"Lorem ipsum dolor sit amet, consectetur adipisicing elit. Enim, aut."'
    t.is(unquote(str), str.slice(1, str.length - 1))
  })

  test('mixed_double', (t) => {
    const str = '"Lorem ipsum dolor sit amet", consectetur adipisicing elit. Enim, aut."'
    t.is(unquote(str), str.slice(1, str.length - 1))
  })

  test('mixed with single', (t) => {
    const str = '\'Lorem ipsum dolor sit amet\', consectetur adipisicing elit. Enim, aut.\''
    t.is(unquote(str), str.slice(1, str.length - 1))
  })
})


test.group('beautify -', (test) => {
  const tests = {
    js: {
      actual: [
        'function test   (    ){',
        '  return null',
        '  }',
        '',
        ''
      ],
      expected: [
        'function test() {',
        '  return null',
        '}',
      ]
    },
    css: {
      actual: [
        '.foo{',
        '    background : blue;',
        '  color : black;',
        '}',
      ],
      expected: [
        '.foo {',
        '  background: blue;',
        '  color: black;',
        '}',
      ]
    },
    html: {
      actual: [
        '<html><body>',
        '    <p>Lorem</p>',
        '</body></html>',
      ],
      expected: [
        '<html>',
        '<body>',
        '  <p>Lorem</p>',
        '</body>',
        '</html>',
      ]
    },
  }

  for (let [ type, { actual, expected } ] of to.entries(tests)) {
    expected.push('')
    expected = expected.join('\n')
    actual.push('')
    actual = actual.join('\n')
    test(type, (t) => {
      t.is(beautify(actual, type), expected)
    })
  }
})
