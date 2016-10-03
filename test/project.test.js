/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import fs from 'fs-extra-promisify'
import globby from 'globby'
import path from 'path'
import Project from '../dist/project.js'
let test = ava.serial.group('Project -')


fs.exists = async (str) => {
  try {
    await fs.stat(str)
    return true
  } catch (e) {
    return false
  }
}


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
  t.truthy(await fs.exists(dir), `${dir} was copied`)

  await fs.remove(dir)
})


test.group('create', (test) => {
  const root = path.join(__dirname, 'project-create-test')
  const files = [
    'styles.scss',
    'index.js',
    'index.jade'
  ].sort()
  test.before(async () => {
    await fs.remove(root)
  })
  test('no arguments, no create option', async (t) => {
    const project = new Project()
    try {
      await project.create()
      t.fail('expected failure')
    } catch (e) {
      t.pass('failed correctly')
    }
  })

  test('with name, no create option', async (t) => {
    const project = new Project({ root })
    const name = 'project-1'
    await project.create(name)
    t.truthy(await fs.exists(path.join(root, 'projects', name)), 'project was created')
  })

  test.group('create option as a string', (test) => {
    test.before(async () => {
      await Promise.all(files.map((file) => fs.ensureFile(path.join(root, 'base', file))))
    })

    test(async (t) => {
      const project = new Project({ root, create: 'base' })
      const name = 'project-2'

      await project.create(name)
      t.deepEqual(await globby('*', { cwd: path.join(root, 'projects', name) }), files)
    })
  })

  test('create option as a array', async (t) => {
    const project = new Project({ root, create: files })
    const name = 'project-3'
    await project.create(name)
    t.deepEqual(await globby('*', { cwd: path.join(root, 'projects', name) }), files)
  })

  test.after(async () => {
    await fs.remove(root)
  })
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

test('use', async (t) => { // save
  const file = path.join(__dirname, '..', 'PROJECT')
  await fs.remove(file)
  const project = new Project()
  const name = 'whoohoo'

  await project.use(name)

  try {
    let contents = await fs.readFile(file)
    t.is(contents + '', name)
  } catch (e) {
    t.fail('project file doesn\'t exist')
  }
})

test.serial.group('publish', (test) => {
  test.todo('publish')
})

test.serial.group('translate', (test) => {
  test.todo('translate')
})
