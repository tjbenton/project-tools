import ava from 'ava-spec'
const test = ava.group('CLI:')
import child_process from 'child_process'
import nixt from 'nixt'
import path from 'path'
import fs from 'fs-extra-promisify'
const cli = nixt().base('../../../bin/project ')
const test_root = path.join(__dirname, 'cli-fixtures')
async function stop() {
  try {
    await exec('docker rm --force project')
  } catch (e) {
    // do nothing
  }
}
const exec = (command) => {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (err, stdout) => {
      if (err) return reject(err)
      resolve(stdout)
    })
  })
}

test.before(async () => {
  await fs.remove(test_root)
  await fs.ensureDir(test_root)
  await stop()
})

const enter = '\n'

const ci = process.env.CI !== 'true' ? test : test.skip

ci.serial.group('server', (test) => {
  const root = path.join(test_root, 'cli-server-test')
  const base = cli.clone().cwd(root)

  test.before(async () => {
    await fs.remove(root)
    await fs.ensureDir(path.join(root, 'projects', 'project-1'))
    await stop()
  })

  test.cb('status - not running', (t) => {
    base.clone()
      .run('status')
      .stdout(/server is not running/)
      .end(t.end)
  })

  test.cb('stop - isn\'t running', (t) => {
    base.clone()
      .run('stop')
      .stdout(/server isn't running/)
      .end(t.end)
  })

  test.cb('start - was started', (t) => {
    base.clone()
      .run('start')
      .stdout(/server was started http:\/\/localhost/)
      .end(t.end)
  })

  test.cb('start - is already running', (t) => {
    base.clone()
      .run('start')
      .stdout(/server is already running/)
      .end(t.end)
  })

  test.cb('status - is running', (t) => {
    base.clone()
      .run('status')
      .stdout(/server is running/)
      .end(t.end)
  })

  test.cb('stop - was stopped', (t) => {
    base.clone()
      .exec('../../../bin/project start')
      .run('stop')
      .stdout(/server was stopped/)
      .end(t.end)
  })

  test.after.always(async () => {
    await fs.remove(root)
    await stop()
  })
})

ci.serial.group('init -', (test) => {
  const root = path.join(test_root, 'cli-init-test')
  const base = cli.clone().cwd(root)

  test.before(async () => {
    await fs.remove(root)
    await fs.ensureDir(root)
  })

  test.cb('no initial arguments', (t) => {
    base.clone()
      .run('init')
      .on(/What's the name of your repo\?/)
      .respond(`one${enter}`)
      .on(/Where do you want this repo to be located\?/)
      .respond(enter)
      .on(/About to create project repo in/)
      .respond(enter)
      .exist(path.join(root, 'one'))
      .end(t.end)
  })

  test.cb('name was passed', (t) => {
    base.clone()
      .run('init two')
      .on(/Where do you want this repo to be located\?/)
      .respond(enter)
      .on(/About to create project repo in/)
      .respond(enter)
      .exist(path.join(root, 'two'))
      .end(t.end)
  })

  test.after.always(() => fs.remove(root))
})

test.serial.group('create -', (test) => {
  const root = path.join(test_root, 'cli-create-test')
  const folders = [ 'one', 'two', 'three' ].sort()
  const base = cli.clone().cwd(root)

  test.beforeEach(async () => {
    // create fake folders
    await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))
  })

  test.cb('with no arguments', (t) => {
    const name = 'no-arguments'
    base.clone()
      .run('create')
      .on(/What's the name of your project\?/)
      .respond(name + enter)
      .exist(path.join(root, 'projects', name))
      .end(t.end)
  })

  test.cb('project already exists', (t) => {
    const name = 'already-exists'
    base.clone()
      .exec('ls ./**/*')
      .run('create one')
      .stdout(/one already exists\n/)
      .on(/What's the name of your project\?/)
      .respond(name + enter)
      .exist(path.join(root, 'projects', name))
      .end(t.end)
  })

  test.cb('create multiple projects', (t) => {
    base.clone()
      .exec('ls ./**/*')
      .run('create three four five')
      .stdout(/three already exists\n/)
      .on(/What's the name of your project\?/)
      .respond(`six${enter}`)
      .exist(path.join(root, 'projects', 'four'))
      .exist(path.join(root, 'projects', 'five'))
      .exist(path.join(root, 'projects', 'six'))
      .end(t.end)
  })

  test.afterEach.always('', async () => {
    await fs.remove(root)
  })
})

test.serial.group('build -', (test) => {
  const root = path.join(test_root, 'cli-build-test')
  const files = [ 'one', 'two', 'three' ]
    .map((name) => {
      return {
        src: path.join(root, 'projects', name, 'app', 'js', 'index.js'),
        dist: path.join(root, 'projects', name, 'dist', 'js', 'index.js'),
        content: [
          'var foo = \'foo\';',
          '',
          'console.log(foo);',
          '',
        ].join('\n'),
        expected: '(function() {\n  \'use strict\';\n\n  var foo = \'foo\';\n\n  console.log(foo);\n\n}());\n\n/*# sourceMappingURL=js/index.js.map */\n' // eslint-disable-line
      }
    })

  const base = cli.clone().cwd(root)

  test.beforeEach(async () => {
    await Promise.all(files.map((file) => fs.outputFile(file.src, file.content)))
  })

  test.cb('with no arguments', (t) => {
    base.clone()
      .run('build')
      .on(/Which project do you want to use\?/)
      .respond(`one${enter}`)
      .stdout(/one was successfully compiled/)
      .exist(files[0].dist)
      .match(files[0].dist, files[0].expected)
      .end(t.end)
  })

  test.cb('build multiple projects', (t) => {
    base.clone()
      .run('build one two three')
      .stdout(/(?:.*|\n)one was successfully compiled\n.*two was successfully compiled\n.*three was successfully compiled/)
      .exist(files[0].dist)
      .exist(files[1].dist)
      .exist(files[2].dist)
      .match(files[0].dist, files[0].expected)
      .match(files[1].dist, files[1].expected)
      .match(files[2].dist, files[2].expected)
      .end(t.end)
  })

  test.cb('build "one" by passing in "on"', (t) => {
    base.clone()
      .run('build on; \n')
      .on(/(?:.*|\n)on\n.*one/)
      .respond(`${enter}`)
      .stdout(/(?:.*|\n)one was successfully compiled/)
      .exist(files[0].dist)
      .match(files[0].dist, files[0].expected)
      .end(t.end)
  })

  test.cb('build all by passing in "all"', (t) => {
    base.clone()
      .run('build all')
      .stdout(/one was successfully compiled\n.*three was successfully compiled\n.*two was successfully compiled/)
      .exist(files[0].dist)
      .exist(files[1].dist)
      .exist(files[2].dist)
      .match(files[0].dist, files[0].expected)
      .match(files[1].dist, files[1].expected)
      .match(files[2].dist, files[2].expected)
      .end(t.end)
  })

  test.cb('build two and three by passing in "t*"', (t) => {
    base.clone()
      .run('build "t*"')
      .stdout(/three was successfully compiled\n.*two was successfully compiled/)
      .exist(files[1].dist)
      .exist(files[2].dist)
      .match(files[1].dist, files[1].expected)
      .match(files[2].dist, files[2].expected)
      .end(t.end)
  })

  test.afterEach.always(() => fs.remove(root))
})

// can't test this cli command but the watch command has been
// tested in `project.test.js`
test.skip.serial.group('watch -', (test) => {
  const root = path.join(test_root, 'cli-watch-test')
  const base = cli.clone().cwd(root)
  const name = 'project-1'
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
  const exit = '\u0003'

  test.before(async () => {
    await fs.remove(root)
    await fs.outputFile(file.src, file.content)
  })


  test.cb('with no arguments', (t) => {
    base.clone()
      .run('watch')
      .on(/Which project do you want to use\?/g)
      .respond(`${name}${enter}`)
      .exec(`sleep 30s && ${exit}`)
      // .exist(file.dist)
      // .match(file.dist, file.expected)
      .end(t.end)
  })

  test.skip.cb('changed file', (t) => {
    base.clone()
      .run(`watch ${name}`)
      .exist(file.dist)
      .match(file.dist, file.expected)
      .writeFile(file.src, `${file.content}.woohoo { background: #000; }`)
      .match(file.dist, /\.woohoo {/g)
      .end(t.end)
  })

  test.afterEach.always(() => fs.remove(root))
})

test.group('list/ls -', (test) => {
  const root = path.join(test_root, 'cli-list-test')
  const folders = [ 'one', 'two', 'three' ].sort()
  const base = cli.clone().cwd(root)

  test.before(async () => {
    // create fake folders
    await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))
  })

  test.cb('list', (t) => {
    base.clone()
      .run('list')
      .stdout(/one|two|three/gm)
      .end(t.end)
  })

  test.cb('ls', (t) => {
    base.clone()
      .run('ls')
      .stdout(/one|two|three/gm)
      .end(t.end)
  })

  test.after.always(() => fs.remove(root))
})

test.group('use/save -', (test) => {
  const folders = [ 'one', 'two', 'three' ].sort()
  const createFolders = (root) => {
    return async () => {
      await fs.remove(root)
      await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))
    }
  }

  test.group('no-args', (test) => {
    const root = path.join(test_root, 'cli-use-1-test')
    const project_file = path.join(root, 'PROJECT')

    test.before(createFolders(root))

    test.cb((t) => {
      cli.clone()
        .cwd(root)
        .run('use')
        .on(/Which project do you want to use?/)
        .respond('th\n')
        .exist(project_file)
        .match(project_file, 'three')
        .end(t.end)
    })

    test.after.always(() => fs.remove(root))
  })

  test.group('the passed project is a project', (test) => {
    const root = path.join(test_root, 'cli-use-2-test')
    const project_file = path.join(root, 'PROJECT')

    test.before(createFolders(root))

    test.cb((t) => {
      cli.clone()
        .cwd(root)
        .run('use one')
        .exist(project_file)
        .match(project_file, 'one')
        .end(t.end)
    })

    test.after.always(() => fs.remove(root))
  })
})

test.group('current -', (test) => {
  test.group('no current', (test) => {
    const root = path.join(test_root, 'cli-current-no-current-test')

    test.before(() => fs.ensureDir(root))

    test.cb((t) => {
      cli.clone()
        .cwd(root)
        .run('current')
        .stdout(/No current project/)
        .end(t.end)
    })

    test.after.always(() => fs.remove(root))
  })

  test.group('has current', (test) => {
    const root = path.join(test_root, 'cli-current-test')

    test.before(() => fs.outputFile(path.join(root, 'PROJECT'), 'current-test'))

    test.cb((t) => {
      cli.clone()
        .cwd(root)
        .run('current')
        .stdout(/current-test/)
        .end(t.end)
    })

    test.after.always(() => fs.remove(root))
  })
})

test.group('publish', (test) => {
  test.todo('publish')
})

test.group('translate', (test) => {
  test.todo('translate')
})

test.after.always(async () => {
  await fs.remove(test_root)
  await stop()
})
