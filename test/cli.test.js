/* eslint-disable id-length, no-shadow */
/* eslint-disable */
import ava from 'ava-spec'
const test = ava.serial.group('CLI -')
import nixt from 'nixt'
import path from 'path'
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

test.serial.group('list', (test) => {
  test.todo('list') // ls
})

test.serial.group('use', (test) => {
  test.todo('use') // save
})

test.serial.group('publish', (test) => {
  test.todo('publish')
})

test.serial.group('translate', (test) => {
  test.todo('translate')
})
