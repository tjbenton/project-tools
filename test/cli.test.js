/* eslint-disable id-length, no-shadow */
import ava from 'ava-spec'
const test = ava.group('CLI:')
import nixt from 'nixt'
import path from 'path'
import fs from 'fs-extra-promisify'
const cli = nixt().base('../../../bin/project ')
const test_root = path.join(__dirname, 'cli-fixtures')

test.before(async () => {
  await fs.remove(test_root)
  await fs.ensureDir(test_root)
})

const enter = '\n'

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
  const file = path.join(root, 'projects', 'project-1', 'app', 'js', 'index.js')
  const expected = '(function() {\n  \'use strict\';\n\n  var foo = \'foo\';\n\n  console.log(foo);\n\n}());\n\n/*# sourceMappingURL=js/index.js.map */\n'
  const base = cli.clone().cwd(root)

  test.before(async () => {
    await fs.outputFile(file, [
      'var foo = \'foo\';',
      '',
      'console.log(foo);',
      ''
    ].join('\n'))
  })

  test.cb('with no arguments', (t) => {
    const name = 'project-1'
    base.clone()
      .run('build')
      .on(/Which project do you want to use\?/).respond(name + enter)
      .exist(path.join(root, 'projects', name))
      .match(file.replace('app', 'dist'), expected)
      .end(t.end)
    t.end()
  })

  test.after.always(() => fs.remove(root))
})

test.group('start', (test) => {
  test.todo('start')
})

test.group('stop', (test) => {
  test.todo('stop')
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
