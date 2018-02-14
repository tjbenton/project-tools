import path from 'path'
import commander from 'commander'
import to from 'to-js'
import pkg from '../package.json'
import Project from './project'
import { question, confirm, exec } from './utils'
import { series, forEach } from 'async-array-methods'
import chalk from 'chalk'
import stripColor from 'strip-ansi'
import matcher from 'matcher'
import isGlob from 'is-glob'

export default function cli() {
  const root = process.cwd()

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
    if (count++ >= 20) {
      project.log(`\n\ntry running ${chalk.green.bold('project list')} to see a list of the available projects\n`)
      return true
    }

    name = name ? name : await question('What\'s the name of your project?')
    const list = await project.list(name)
    if (list.length) {
      project.log(`${chalk.blue.bold(name)} already exists`)
      return setName(null, count)
    }
    return name
  }

  const getName = async (name, current = true, type = 'list') => {
    const list = await project[type]()

    if (
      current &&
      !name &&
      project.current
    ) {
      project.log(`using the default project ${chalk.blue.bold(project.current)}`)
      return project.current
    }

    if (!list.length) {
      throw new Error('you haven\'t created any projects yet. To do so just run `project create`')
    }

    if (!list.includes(name) || !name) {
      name = await question({
        type: 'autocomplete',
        message: 'Which project do you want to use?',
        source(list_so_far, input) {
          if (!input) {
            return Promise.resolve(list)
          }

          const result = list
            .map((item) => {
              const index = item.toLowerCase().indexOf(input.toLowerCase())
              if (index < 0) {
                return false
              }
              const stop = index + input.length

              return item.slice(0, index) +
                chalk.red(item.slice(index, stop)) +
                item.slice(stop)
            })
            .filter(Boolean)

          return Promise.resolve(result)
        },
        initial: name,
      })
    }

    return stripColor(name)
  }

  function updateOptions() {
    project.options.log = commander.log
    project.options.timestamp = commander.timestamp
    project.options.minify = commander.minify
    project.options.sourcemaps = commander.sourcemaps
    project.options.fallback_locale = commander.fallbackLocale

    if (commander.production) {
      project.options.minify = true
      project.options.sourcemaps = project.options.pretty = false
      // removes the layout from the templates
      project.options.template = project.options.template || {}
      project.options.template.layout = ''
    }
  }

  commander
    .usage('[command]')
    .option('-p, --production', 'removes sourcemaps, minifies files, and removes the layout')
    .option('-m, --minify', 'minifies all the files')
    .option('--locale [locales...]', `Determins which languages will be compiled ${multiple_message}`, multiple())
    .option('--fallback-locale [locale]', 'the locale to fallback to', 'en-US')
    .option('--no-log', 'removes all logging execept for errors')
    .option('--no-timestamp', 'removes timestamps from the logs')
    .option('--no-sourcemaps', 'doesn\'t output sourcemaps')
    .option('--no-pretty', 'doesn\'t format the code')
    .version(pkg.version)

  const project = new Project()

  commander
    .command('init [project-name] [location]')
    .description('this is used to start a new repo of projects')
    .option('-y, --yes', 'skips confirmations')
    .action(async (name, location, { yes }) => {
      updateOptions()
      if (!name) {
        name = await question('What\'s the name of your repo?')
      }

      if (!location) {
        location = yes ? to.param(name) : await question({
          message: 'Where do you want this repo to be located?',
          default: to.param(name),
        })
      }

      if (!path.isAbsolute(location)) {
        location = path.join(root, location)
      }

      const should_continue = yes || await confirm(`
        About to create project repo in ${location}:
        Is this ok?
      `, 'Yes')

      if (should_continue) {
        await project.init(name, location)
      }

      try {
        location = path.relative(root, location)
        process.chdir(location)
        await exec('git init; git add --force .; git commit -m "Initial commit"', true, true)
        project.log('')
        project.log(`just run ${chalk.bold(`cd ${location}`)}; ${chalk.bold('make install')} to get started`)
        project.log('')
      } catch (e) {
        project.log('error', e)
      }
    })


  commander
    .command('create [names...]')
    .description('creates a new project for you and sets it up the way you want')
    .action(async (names) => {
      updateOptions()
      if (!names.length) {
        names.push('')
      }

      names = await series(names, (name) => setName(name))
      await forEach(names, async (name) => {
        await project.create(name)
        project.log(`${chalk.green(name)} was successfully created`)
      })
    })


  commander
    .command('start')
    .description('This will start the docker server for the project')
    .option('-p, --port <port ...>', `Add a port to use ${multiple_message}`, multiple(), [ '80:80', '443:443' ])
    .option(
      '-e, --env <env ...>',
      `Add an docker enviromental variable ${multiple_message}`,
      multiple(),
      [ 'MYSITE=marketamerica.com' ],
    )
    .option(
      '-i, --image [image]',
      'Sets the docker image to use',
      'nginx:alpine',
    )
    .option('-f, --force', 'force restarts the server if it already exists', false)
    .action(async ({ port: ports, env, image, force }) => {
      updateOptions()
      try {
        await project.start({ ports, env, image, force })
      } catch (e) {
        project.log('error', e)
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
    .command('build [names...]')
    .alias('compile')
    .description('This will build/compile the assets for the given project')
    .action(async (names) => {
      updateOptions()
      const list = await project.list()

      // build all the projects
      if (names[0] === 'all' || names[0] === '*') {
        names = list
      }

      if (!names.length) {
        names.push('')
      }

      names = await series(names, (name) => {
        if (isGlob(name)) {
          return Promise.resolve(matcher(list, [ name ]))
        }
        return getName(name)
      })

      names = to.unique(to.flatten(names))

      await forEach(names, async (name) => {
        name = await getName(name)
        try {
          const render = await project.build(name, commander.locale)
          const files = await render()

          let locales = files.reduce((prev, file) => {
            if (file.type === 'template' && !prev.includes(file.locale)) {
              prev.push(file.locale)
            }
            return prev
          }, [])

          locales = locales.length ? ` in ${chalk.blue(locales.join(', '))}` : ''

          project.log(`${chalk.green(name)} was successfully compiled${locales}`)
        } catch (e) {
          project.log(`${chalk.red(name)} failed to compile\n`, e)
        }
      })
    })

  commander
    .command('watch [name]')
    .description('This will watch your files for changes and build/compile them when they change')
    .action(async (name) => {
      updateOptions()
      name = await getName(name)

      const watcher = project.watch(name, commander.locale)
        .on('change', (file) => project.log(`${chalk.yellow('Changed:')}  ${file}`))
        .on('started', (glob) => project.log(`${chalk.green('Started:')}  ${glob}`))
        .on('success', (glob, files) => {
          const length = files.length > 1 ? `(${files.length} files)` : ''

          project.log(`${chalk.green('Finished:')} ${glob} ${length}`.trim())
        })
        .on('error', (err, file) => {
          project.log(`${chalk.red(file)} failed to updated`)
          project.log('error', err)
        })

      await watcher.ready()
    })


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
      } else {
        project.log(`No projects have been created. To create a new project run ${chalk.red('project create')}`)
      }
    })


  commander
    .command('use [name]')
    .alias('save')
    .description('Stores the current project you\'re working with so you don\'t have to pass a name to every other command')
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
        project.log(project.current)
      } else {
        project.log(`No current project has been set please run ${chalk.green.bold('project use')} to set the current project`)
      }
    })

  commander
    .command('publish [name]')
    .description('Coming soon')
    .action(() => {
      updateOptions()
      project.options.log = true
      project.log(`${chalk.red.bold('project publish [name]')} is not yet supported but it will be coming soon`)
    })

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
