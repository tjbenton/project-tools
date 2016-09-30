/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import fs from 'fs-extra-promisify'
import path from 'path'
import Project from '../dist/project.js'
let test = ava.serial.group('Project -')



test('functions exist', (t) => {
  const methods = [ 'init', 'create', 'build', 'start', 'stop', 'watch', 'list', 'use', 'publish', 'translate' ]

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


test('list', async (t) => { // ls
  const root = path.join(__dirname, 'project-list-test')
  const project = new Project({ root })

  const folders = [ 'one', 'two', 'three' ]
  // create fake folders
  await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))

  t.deepEqual(await project.list(), folders.sort(), `should be ${folders}`)
  t.is((await project.list('o'))[0], 'one', 'should return `one`')
  t.is((await project.list('on'))[0], 'one', 'should return `one`')
  t.is((await project.list('one'))[0], 'one', 'should return `one`')
  t.deepEqual(await project.list('t'), folders.slice(1).sort(), 'should return `[ \'three\', \'two\' ]`')

  await fs.remove(root)
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
