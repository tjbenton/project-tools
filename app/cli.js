import path from 'path'
import commander from 'commander'
import to from 'to-js'
import pkg from '../package.json'
import Project from './project'
import { question, confirm } from './utils'

export default function cli() {
  const root = process.cwd()

  function call(fn) {
    return async (...args) => fn.call(project, ...args)
  }

  const project = new Project()

  commander
    .usage('[command]')
    .version(pkg.version)

  commander
    .command('init [project-name] [location]')
    .description('this is used to start a new repo of projects')
    .action(async (name, location) => {
      if (!name) {
        name = await question('What\'s the name of your repo?')
      }

      if (!location) {
        location = await question({
          message: 'Where do you want this repo to be located?',
          default: to.param(name)
        })
      }

      if (!path.isAbsolute(location)) {
        location = path.join(root, location)
      }

      let should_continue = await confirm(`
        About to create project repo in ${location}:
        Is this ok?
      `, 'Yes')

      if (should_continue) {
        await project.init(name, location)
      }
    })

  commander
    .command('create [name]')
    // .option()
    // .description()
    .action(call(project.create))

  commander
    .command('build [name]')
    // .option()
    // .description()
    .action(call(project.build))

  commander
    .command('start [name]')
    // .option()
    // .description()
    .action(call(project.start))

  commander
    .command('stop [name]')
    // .option()
    // .description()
    .action(call(project.stop))

  commander
    .command('watch [name]')
    // .option()
    // .description()
    .action(call(project.watch))

  commander
    .command('list [name]')
    .alias('ls')
    .description('this will output a list of the projects or if a name is passed it will return the name if it exists and nothing if it does')
    .action(async (name) => {
      const list = await project.list(name)
      if (list.length) {
        console.log(list.join('\n'))
      }
    })


  commander
    .command('use') // sa [name]ve
    // .option()
    // .description()
    .action(call(project.use))

  commander
    .command('publish [name]')
    // .option()
    // .description()
    .action(call(project.publish))


  commander
    .command('translate [name]')
    // .option()
    // .description()
    .action(call(project.translate))

  commander
    .command('help')
    // .description()
    .action(() => {
      commander.help()
    })

  commander.parse(process.argv)

  if (commander.args.length < 1) {
    commander.help()
  }
}
