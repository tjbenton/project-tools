/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import fs from 'fs-extra-promisify'
import path from 'path'
import Project from '../dist/project.js'
let test = ava.serial.group('Project -')



test('functions exist', (t) => {
  const methods = [ 'init', 'dirs', 'create', 'build', 'start', 'stop', 'watch', 'list', 'use', 'publish', 'translate' ]

  methods.forEach((method) => {
    t.truthy(typeof Project.prototype[method] === 'function', `${method} is defined`)
  })
})

test('init', async (t) => {
  const project = new Project()
  const name = 'project-init-test'
  const dir = path.join(__dirname, name)

  await project.init(name, dir)

  try {
    await fs.stat(dir)
    t.pass(`${dir} was copied`)
  } catch (e) {
    t.fail(`${dir} wasn't copied`)
  }

  await fs.remove(dir)
})


test.serial.group('create', (test) => {
  test.todo('create')
})

test.serial.group('build', (test) => {
  test.todo('build')
})

test.serial.group('start', (test) => {
  test.todo('start')
})

test.serial.group('stop', (test) => {
  test.todo('stop')
})

test.serial.group('watch', (test) => {
  test.todo('watch')
})

test.serial.group('list', (test) => { // ls
  test.todo('list')
})

test.serial.group('use', (test) => { // save
  test.todo('use')
})

test.serial.group('publish', (test) => {
  test.todo('publish')
})

test.serial.group('translate', (test) => {
  test.todo('translate')
})
