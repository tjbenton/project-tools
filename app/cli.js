import path from 'path'
import commander from 'commander'
import to from 'to-js'
import pkg from '../package.json'
import Project from './project'
import { question, confirm } from './utils'
import chalk from 'chalk'

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
    .description('creates a new project for you and sets it up the way you want')
    .action(async (name) => {
      let count = 0
      const getName = async (str) => {
        if (count++ >= 10) {
          console.log('\n\n' + to.normalize(`
            try running ${chalk.green.bold('project list')} to see a list of the
            projects that have already been created
          `) + '\n')
          return
        }
        let result = str ? str : await question('What\'s the name of your project?')
        let list = await project.list(result)
        if (list.length) {
          console.log(`${chalk.blue.bold(result)} already exists`);
          return await getName()
        }
        return result
      }
      name = await getName(name)

      await project.create(name)
      console.log(`${chalk.green(name)} was successfully created`)
    })

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
    .command('use [name]')
    .alias('save')
    .description('This will store the current project you\'re working with so you don\'t have to pass a name to every other command')
    .action(async (name) => {
      let list = await project.list()
      if (name && list.indexOf(name) < 0) {
        console.log(`${chalk.bold(name)} doesn't match a project that exists`);
        name = ''
      }
      if (!name) {
        name = await question({
          type: 'autocomplete',
          message: 'Which project do you want to use?',
          source(listSoFar, input) {
            if (!input) {
              return Promise.resolve(list)
            }

            let result = list.map((item) => {
              const index = item.toLowerCase().indexOf(input.toLowerCase())
              if (index < 0) {
                return false
              }
              let stop = index + input.length

              return item.slice(0, index) +
                chalk.red(item.slice(index, stop)) +
                item.slice(stop)
            })
            .filter(Boolean)

            return Promise.resolve(result)
          }
        })
      }

      await project.use(name)
    })

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
