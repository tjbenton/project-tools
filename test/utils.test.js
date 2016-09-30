/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
const test = ava.serial.group('utils -')
import { question, confirm, exec } from '../dist/utils.js'
import stdin from 'bdd-stdin'
const keys = Object.assign({ enter: '\n', space: ' ' }, stdin.keys)

test.group('question', (test) => {
  test('no input', async (t) => {
    try {
      await question()
      t.fail('should fail')
    } catch (e) {
      t.pass('should fail')
    }
  })

  test('input', async (t) => {
    try {
      stdin('4', keys.enter)
      const answer = await question('What is 2 + 2?')
      t.is(answer, '4')
      t.is(typeof answer, 'string')
    } catch (e) {
      t.fail('should be 4')
    }
  })
})

test.serial.group('confirm', (test) => {
  test('no input', async (t) => {
    try {
      await confirm()
    } catch (e) {
      t.pass('should fail')
    }
  })

  test('no default', async (t) => {
    try {
      stdin(keys.enter, 'y', keys.enter)
      await confirm('should I continue?')
      t.pass('should open up help menu')
    } catch (e) {
      t.fail('should fail')
    }
  })

  test('default true', async (t) => {
    try {
      stdin(keys.enter)
      const answer = await confirm('should I continue?', true)
      t.truthy(answer === true, 'should be true')
    } catch (e) {
      t.fail('should be true')
    }
  })

  test('default yes', async (t) => {
    try {
      stdin(keys.enter)
      const answer = await confirm('should I continue?', 'yes')
      t.truthy(answer === true, 'should be true')
    } catch (e) {
      t.fail('should be true')
    }
  })

  test('default y', async (t) => {
    try {
      stdin(keys.enter)
      const answer = await confirm('should I continue?', 'y')
      t.truthy(answer === true, 'should be true')
    } catch (e) {
      t.fail('should be true')
    }
  })
})

test.group('exec', (test) => {
  test('echo', async (t) => {
    try {
      let result = await exec('echo \'10\'')
      t.is(result, '10', 'result should be 10')
    } catch (e) {
      t.fail('exec should be 10')
    }
  })
})
