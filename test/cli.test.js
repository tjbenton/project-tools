/* eslint-disable id-length, no-shadow */
/* eslint-disable */
import ava from 'ava-spec'
const test = ava.serial.group('CLI -')
import nixt from 'nixt'
import path from 'path'
import fs from 'fs-extra-promisify'
const project = (args) => `../bin/project ${args}`

const enter = '\n'

test.serial.group('init', (test) => {
  test.todo('init')
//   test.cb('no initial arguments', (t) => {
//     const name = 'project-init-test'
//     nixt()
//       .cwd(__dirname)
//       .run(project('init'))
//       .respond(enter)
//       .on('? What\'s the name of your repo?')
//         .respond(name + enter)
//       // .stdout(`? Where do you want this repo to be located? (${name})`)
//       .on(`? Where do you want this repo to be located? (${name})`)
//         .respond(enter)
//       .on(`? About to create project repo in ${path.join(process.cwd(), name)}:
// Is this ok? (Ynh)`)
//         .respond(enter)
//       .end((...args) => {
//         console.log('args');
//         console.log(args);
//         t.end()
//       })
//   })
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

test.group('list/ls', (test) => {
  const root = path.join(__dirname, 'cli-list-test')
  const folders = [ 'one', 'two', 'three' ].sort()
  const base = nixt().cwd(root).base('../../bin/project ')

  test.beforeEach('', async () => {
    // create fake folders
    await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))
  })

  test.cb('list', (t) => {
    base.clone()
      .run('list')
      .stdout(folders.join('\n'))
      .end(t.end)
  })

  test.cb('ls', (t) => {
    base.clone()
      .run('ls')
      .stdout(folders.join('\n'))
      .end(t.end)
  })

  test.afterEach('', async () => {
    await fs.remove(root)
  })
})

test.group('use/save', (test) => {
  const root = path.join(__dirname, 'cli-use-test')
  const project_file = path.join(__dirname, '..', 'PROJECT')
  const folders = [ 'one', 'two', 'three' ].sort()
  const base = nixt().cwd(root).base('../../bin/project ')

  test.beforeEach('', async () => {
    // create fake folders
    await Promise.all(folders.map((folder) => fs.ensureDir(path.join(root, 'projects', folder))))
    await fs.remove(project_file)
  })

  test.cb('no args', (t) => {
    base.clone()
      .run('use')
      .on(/Which project do you want to use?/).respond('th\n')
      .exist(project_file)
      .match(project_file, 'three')
      .end(t.end)
  })

  test.cb('the passed project is a project', (t) => {
    base.clone()
      .run('use one')
      .exist(project_file)
      .match(project_file, 'one')
      .end(t.end)
  })

  test.afterEach('', async () => {
    await fs.remove(root)
    await fs.remove(project_file)
  })
})

test.serial.group('publish', (test) => {
  test.todo('publish')
})

test.serial.group('translate', (test) => {
  test.todo('translate')
})
