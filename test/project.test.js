/* eslint-disable id-length, no-shadow */

import ava from 'ava-spec'
import fs from 'fs-extra-promisify'
import globby from 'globby'
import path from 'path'
import Project from '../dist/project.js'
let test = ava.serial.group('project:')


fs.exists = async (str) => {
  try {
    await fs.stat(str)
    return true
  } catch (e) {
    return false
  }
}


const test_root = path.join(__dirname, 'project')

test.before(async () => {
  await fs.remove(test_root)
  await fs.ensureDir(test_root)
})

test('functions exist', (t) => {
  const methods = [ 'init', 'create', 'build', 'start', 'stop', 'watch', 'list', 'use', 'publish', 'translate' ]

  methods.forEach((method) => {
    t.truthy(typeof Project.prototype[method] === 'function', `${method} is defined`)
  })
})

test('init', async (t) => {
  const project = new Project({ log: false })
  const name = 'project-init-test'
  const dir = path.join(test_root, name)

  await project.init(name, dir)
  t.truthy(await fs.exists(dir), `${dir} was copied`)

  await fs.remove(dir)
})


test.group('create -', (test) => {
  const root = path.join(test_root, 'project-create-test')
  const files = [
    'styles.scss',
    'index.js',
    'index.jade'
  ].sort()

  test.before(async () => fs.remove(root))

  test('no arguments, no create option', async (t) => {
    const project = new Project({ log: false })
    try {
      await project.create()
      t.fail('expected failure')
    } catch (e) {
      t.pass('failed correctly')
    }
  })

  test('with name, no create option', async (t) => {
    const project = new Project({ root, log: false })
    const name = 'project-1'
    await project.create(name)
    t.truthy(await fs.exists(path.join(root, 'projects', name)), 'project was created')
  })

  test.group('create option as a string', (test) => {
    test.before(async () => {
      await Promise.all(files.map((file) => fs.ensureFile(path.join(root, 'base', file))))
    })

    test(async (t) => {
      const project = new Project({ root, create: 'base', log: false })
      const name = 'project-2'

      await project.create(name)
      t.deepEqual(await globby('*', { cwd: path.join(root, 'projects', name, 'app') }), files)
    })
  })

  test('create option as a array', async (t) => {
    const project = new Project({ root, create: files, log: false })
    const name = 'project-3'
    await project.create(name)
    t.deepEqual(await globby('*', { cwd: path.join(root, 'projects', name, 'app') }), files)
  })

  test.after(() => fs.remove(root))
  test.todo('create')
})

test.group('build', (test) => {
  test.todo('build')
})

const ci = process.env.CI !== 'true' ? test : test.skip

ci.serial.group('start/stop/status', (test) => {
  const root = path.join(test_root, 'project-start-test')
  const project = new Project({ root, log: false })

  test.before(async () => {
    await fs.remove(root)
    await fs.ensureDir(path.join(root, 'project-1'))
    await project.stop()
  })

  test(async (t) => {
    try {
      await project.start({ ports: [ '8000:80' ] })

      if (await project.status()) {
        t.pass('server started')
      } else {
        t.fail('server failed')
      }
    } catch (e) {
      t.fail('server failed')
    }
  })

  test.after(async () => {
    await fs.remove(root)
    await project.stop()
  })
})

test.group('watch', (test) => {
  test.todo('watch')
})


test.group('list', (test) => { // ls
  const root = path.join(test_root, 'project-list-test')
  const folders = [ 'one', 'two', 'three' ]

  test.before(async () => {
    // create fake folders
    await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))
  })

  test(async (t) => {
    const project = new Project({ root, log: false })
    t.deepEqual(await project.list(), folders.sort(), `should be ${folders}`)
    t.is((await project.list('o'))[0], 'one', 'should return `one`')
    t.is((await project.list('on'))[0], 'one', 'should return `one`')
    t.is((await project.list('one'))[0], 'one', 'should return `one`')
    t.deepEqual(await project.list('t'), folders.slice(1).sort(), 'should return `[ \'three\', \'two\' ]`')
  })

  test.after(() => fs.remove(root))
})

test.group('use', (test) => {
  const root = path.join(test_root, 'project-use-test')
  const file = path.join(root, 'PROJECT')

  test.before(() => fs.remove(root))

  test(async (t) => {
    const project = new Project({ root, log: false })
    const name = 'whoohoo'
    await project.use(name)
    let contents = await fs.readFile(file)
    t.is(contents + '', name)
  })

  test.after(() => fs.remove(file))
})

test.group('publish', (test) => {
  test.todo('publish')
})

test.group('translate', (test) => {
  test.todo('translate')
})


test.after.always(() => fs.remove(test_root))
