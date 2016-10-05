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

  function multiple() {
    const saved = []
    return (args) => {
      args = args.split(/[\s,]+/).filter((arg) => !saved.includes(arg))
      saved.push(...args)
      return saved
    }
  }
  const multiple_message = '(multiple or space/comma seperated strings)'

  const setName = async (name, count = 0) => {
    if (count++ >= 10) {
      project.log(`\n\ntry running ${chalk.green.bold('project list')} to see a list of the available projects\n`)
      return true
    }

    name = name ? name : await question('What\'s the name of your project?')
    let list = await project.list(name)
    if (list.length) {
      project.log(`${chalk.blue.bold(name)} already exists`);
      return await setName(null, count)
    }
    return name
  }

  const getName = async (name, current = true, type = 'list') => {
    const list = await project[type]()
    const name_exists = list.includes(name)
    if (current && project.current) {
      if (!name || name && !name_exists) {
        project.log(`using the default project ${chalk.blue.bold(project.current)}`);
        return project.current
      }
    }

    if (name && !name_exists) {
      project.log(`${chalk.red.bold(name)} doesn't match a project that exists`);
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

    return name
  }

  function updateOptions() {
    project.options.log = commander.log
    project.options.timestamp = commander.timestamp
  }

  commander
    .usage('[command]')
    .option('-l, --no-log', 'removes all logging execept for errors')
    .option('-t, --no-timestamp', 'removes timestamps from the logs')
    .version(pkg.version)

  const project = new Project()

  commander
    .command('init [project-name] [location]')
    .description('this is used to start a new repo of projects')
    .action(async (name, location) => {
      updateOptions()
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
      updateOptions()
      name = await setName(name)

      await project.create(name)
      project.log(`${chalk.green(name)} was successfully created`)
    })


  commander
    .command('build [name]')
    // .option()
    // .description()
    .action(call(project.build))


  commander
    .command('start')
    .option('-p, --port <port ...>', `Add a port to use ${multiple_message}`, multiple(), [ '80:80', '443:443' ])
    .option('-e, --env <env ...>', `Add an docker enviromental variable ${multiple_message}`, multiple(), [ 'MYSITE=marketamerica.com' ])
    .option('-i, --image [image]', 'Sets the docker image to use', 'artifactory.marketamerica.com:8443/internalsystems/alpine-linux/nginx:latest')
    .option('-f, --force', 'force restarts the server if it already exists', false)
    .description('This will start the docker server for the project')
    .action(async ({ port: ports, env, image, force }) => {
      updateOptions()
      try {
        await project.start({ ports, env, image, force })
      } catch (e) {
        project.log('error', e);
      }
    })


  commander
    .command('stop')
    .action(async () => {
      updateOptions()
      await project.stop()
    })


  commander
    .command('status')
    .description('returns the current status of the server')
    .action(async () => {
      updateOptions()
      if (await project.status()) {
        project.log('server is running')
        return
      }
      project.log(`server is ${chalk.bold('not')} running`)
    })


  commander
    .command('watch [name]')
    // .option()
    // .description()
    .action(call(project.watch))


  commander
    .command('list [name]')
    .alias('ls')
    .description('list of the projects or if a name is passed it will return the name if it exists and nothing if it does')
    .action(async (name) => {
      updateOptions()
      const list = await project.list(name)
      if (list.length) {
        if (project.options.timestamp) {
          list.unshift('')
        }
        project.log(list.join('\n'))
      }
    })


  commander
    .command('use [name]')
    .alias('save')
    .description('This will store the current project you\'re working with so you don\'t have to pass a name to every other command')
    .action(async (name) => {
      updateOptions()
      name = await getName(name, false)

      await project.use(name)
    })


  commander
    .command('current')
    .description('This will output the current project being used')
    .action(() => {
      updateOptions()
      if (project.current) {
        project.log(project.current);
      } else {
        project.log(`No current project has been set please run ${chalk.green.bold('project use')} to set the current project`);
      }
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
    .action(() => {
      commander.help()
    })


  commander.parse(process.argv)

  if (commander.args.length < 1) {
    commander.help()
  }
}
