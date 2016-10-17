/* eslint-disable id-length, no-shadow */
import ava from 'ava-spec'
const test = ava.group('CLI:')
import child_process from 'child_process'
import nixt from 'nixt'
import path from 'path'
import fs from 'fs-extra-promisify'
const cli = nixt().base('../../../bin/project ')
const test_root = path.join(__dirname, 'cli-fixtures')

const exec = (command) => {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (err, stdout) => {
      if (err) {
        return reject(err)
      }
      resolve(stdout)
    })
  })
}

test.before(async () => {
  await fs.remove(test_root)
  await fs.ensureDir(test_root)
})

const enter = '\n'

const ci = process.env.CI !== 'true' ? test : test.skip

ci.serial.group('server', (test) => {
  const root = path.join(test_root, 'cli-server-test')
  const base = cli.clone().cwd(root)
  async function stop() {
    try {
      await exec('docker rm --force project')
    } catch (e) {
      // do nothing
    }
  }

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

test.serial.group('init -', (test) => {
  const base = nixt().cwd(test_root).base('../../bin/project ')
  const name = 'project-init-test'
  const project_path = path.join(test_root, name)

  test.beforeEach(() => fs.remove(project_path))

  test.cb('no initial arguments', (t) => {
    base.clone()
      .run('init')
      .on(/What's the name of your repo\?/).respond(name + enter)
      .on(/Where do you want this repo to be located\?/).respond(enter)
      .on(/\About to create project repo in/).respond(enter)
      .exist(project_path)
      .end(t.end)
  })

  test.cb('name was passed', (t) => {
    base.clone()
      .run(`init ${name}`)
      .on(/Where do you want this repo to be located\?/).respond(enter)
      .on(/\About to create project repo in/).respond(enter)
      .exist(project_path)
      .end(t.end)
  })

  test.afterEach.always(async () => fs.remove(project_path))
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
      .on(/What's the name of your project\?/).respond(name + enter)
      .exist(path.join(root, 'projects', name))
      .end(t.end)
  })

  test.cb('project already exists', (t) => {
    const name = 'already-exists'
    base.clone()
      .exec('ls ./**/*')
      .run('create one')
      .stdout(/one already exists\n/)
      .on(/What's the name of your project\?/).respond(name + enter)
      .exist(path.join(root, 'projects', name))
      .end(t.end)
  })

  test.afterEach.always('', async () => {
    await fs.remove(root)
  })
})

test.serial.group('build -', (test) => {
  const root = path.join(test_root, 'cli-build-test')
  const name = 'project-1'
  const file = {
    src: path.join(root, 'projects', name, 'app', 'js', 'index.js'),
    dist: path.join(root, 'projects', name, 'dist', 'js', 'index.js'),
    content: [
      'var foo = \'foo\';',
      '',
      'console.log(foo);',
      ''
    ].join('\n'),
    expected: '(function() {\n  \'use strict\';\n\n  var foo = \'foo\';\n\n  console.log(foo);\n\n}());\n\n/*# sourceMappingURL=js/index.js.map */\n'
  }
  const base = cli.clone().cwd(root)

  test.before(async () => {
    await fs.outputFile(file.src, file.content)
  })

  test.cb('with no arguments', (t) => {
    base.clone()
      .run('build')
      .on(/Which project do you want to use\?/).respond(name + enter)
      .stdout(/project-1 was successfully compile/)
      .exist(file.dist)
      .match(file.dist, file.expected)
      .end(t.end)
  })

  test.after.always(() => fs.remove(root))
})

test.group('watch', (test) => {
  test.todo('watch')
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
        .on(/Which project do you want to use?/).respond('th\n')
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

test.after.always(() => fs.remove(test_root))
