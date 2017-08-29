import ava from 'ava-spec'
import fs from 'fs-extra-promisify'
import globby from 'globby'
import path from 'path'
import to from 'to-js'
import { forEach } from 'async-array-methods'
import Project from '../dist/project.js'
import touch from 'touch'
import { stdout } from 'test-console'
import stripColor from 'strip-ansi'

const modify = async (src, contents) => {
  if (contents) {
    await fs.writeFile(src, contents)
  }
  return new Promise((resolve) => {
    touch(src, {}, resolve)
  })
}
const test = ava.group('project:')


fs.exists = async (str) => {
  try {
    await fs.stat(str)
    return true
  } catch (e) {
    return false
  }
}


const temp_root = path.join(__dirname, 'fixtures', 'temp-project-fixtures') // this folder gets removed after all the tests have run in the file
const fixtures = path.join(__dirname, 'fixtures', 'build')
const ci = process.env.CI !== 'true' ? test : test.skip

test.before(async () => {
  await fs.remove(temp_root)
  await fs.ensureDir(temp_root)
})

test('functions exist', (t) => {
  const methods = [ 'init', 'create', 'build', 'start', 'stop', 'watch', 'list', 'use', 'publish', 'translate' ]

  methods.forEach((method) => {
    t.truthy(typeof Project.prototype[method] === 'function', `${method} is defined`)
  })
})

ci.group('init', (test) => {
  const root = path.join(temp_root, 'project-init-test')
  test.before(async () => {
    await fs.remove(root)
    await fs.ensureDir(root)
  })

  test(async (t) => {
    const project = new Project({ log: false, root })
    await project.init('one')
    t.truthy(await fs.exists(path.join(root, 'one')))
  })

  test.after.always(() => fs.remove(root))
})


test.group('create -', (test) => {
  const root = path.join(temp_root, 'project-create-test')
  const files = [
    'styles.scss',
    'index.js',
    'index.jade',
  ].sort()

  test.before(() => fs.remove(root))

  test('no arguments, no create option', async (t) => {
    const project = new Project({ log: false })
    const inspect = stdout.inspect()
    try {
      await project.create()
      t.fail('expected failure')
    } catch (e) {
      t.pass('failed correctly')
    }
    inspect.restore()
    t.is(stripColor(inspect.output.join('')).trim(), 'error: name must be a string')
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

  test.after.always(() => fs.remove(root))
  test.todo('create')
})

ci.serial.group('start/stop/status', (test) => {
  const root = path.join(temp_root, 'project-start-test')
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

  test.after.always(async () => {
    await fs.remove(root)
    await project.stop()
  })
})

test.only.group('build', (test) => {
  const types = [ 'javascript', 'style', 'template' ]

  types.forEach((type) => {
    test(type, async (t) => {
      const root = path.join(fixtures, type)
      const project = new Project({
        root,
        log: false,
        javascript: {
          onwarn() {},
        },
      })
      const render = await project.build('project-1')
      t.snapshot(await render())
    })
  })


  test.group('locales -', (test) => {
    const root = path.join(fixtures, 'locales')
    test('project-1', async (t) => {
      const project = new Project({
        root,
        log: false,
        fallback_locale: 'eng',
        layout: 'layout/_layout.html',
      })

      const render = await project.build('project-1')
      t.snapshot(await render())
    })
  })
})


test.group('watch', (test) => {
  const root = path.join(temp_root, 'project-watch-test')
  const name = 'style-project'
  const file = {
    project: name,
    src: path.join(root, 'projects', name, 'app', 'style', 'index.styl'),
    dist: path.join(root, 'projects', name, 'dist', 'style', 'index.css'),
    content: [
      '$background = #00f;',
      '',
      '.level-1 {',
      '  &__level-2 {',
      '    background: $background unless @background;',
      '  }',
      '}',
      '',
    ].join('\n'),
    expected: '.level-1__level-2 {\n  background: #00f;\n}\n\n/*# sourceMappingURL=style/index.css.map */\n',
  }
  test.before(async () => {
    await fs.remove(root)
    await fs.outputFile(file.src, file.content)
  })

  test(async (t) => {
    const project = new Project({ root, log: false })
    t.plan(11)
    t.falsy(await fs.exists(file.dist))
    const watcher = await project.watch(name)
    const files = await globby(path.join('**', '*'), { cwd: root, nodir: true })

    t.is(files.length, 3)
    t.is(path.basename(files[1]), 'index.css')
    t.is(path.basename(files[2]), 'index.css.map')
    t.is(typeof watcher.on, 'function')
    t.is(typeof watcher.emit, 'function')
    t.truthy(await fs.exists(file.dist))
    t.is(to.string(await fs.readFile(file.dist)), file.expected)
    const rest = () => {
      return new Promise((resolve) => {
        watcher.on('success', async (file_path) => {
          t.is(file_path, 'style-project/app/style/index.styl')
          const content = to.string(await fs.readFile(file.dist))
          t.not(content, file.expected)
          t.truthy(/\.woohoo {/g.test(content))
          resolve()
        })
      })
    }
    await modify(file.src, `${file.content}.woohoo { background: #000; }`)
    await rest()
  })

  test.after.always(() => fs.remove(root))
})


test.group('list', (test) => { // ls
  const root = path.join(temp_root, 'project-list-test')
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

  test.after.always(() => fs.remove(root))
})

test.group('use', (test) => {
  const root = path.join(temp_root, 'project-use-test')
  const file = path.join(root, 'PROJECT')

  test.before(() => fs.remove(root))

  test(async (t) => {
    const project = new Project({ root, log: false })
    const name = 'whoohoo'
    await project.use(name)
    const contents = await fs.readFile(file)
    t.is(`${contents}`, name)
  })

  test.after.always(() => fs.remove(file))
})

test.group('publish', (test) => {
  test.todo('publish')
})

test.group('translate', (test) => {
  test.todo('translate')
})


test.after.always(() => fs.remove(temp_root))
