/* eslint max-lines: [ 2, { max: 350, skipBlankLines: true, skipComments: true, } ] */
import path from 'path'
import fs from 'fs-extra-promisify'
import { forEach, map } from 'async-array-methods'
import { version } from '../package.json'
import { exec, Logger } from './utils'
import to, { is } from 'to-js'
import globby from 'globby'
import chalk from 'chalk'
import compile from './compile'
import chokidar from 'chokidar'

////
/// @name Project
/// @author Tyler Benton
/// @page project
////

/// @name Project
/// @description
/// This class is the main functionality of the project cli
/// @class
export default class Project extends Logger {
  ///# @name constructor
  ///# @constructor
  ///# @arg {object} options
  ///# ```js
  ///# {
  ///#   // the base folder for the project
  ///#   root: projcess.cwd(),
  ///#
  ///#   // determins if the config file is used or not
  ///#   projectrc: true,
  ///#
  ///#   // path to the config file
  ///#   config: '.projectrc.js',
  ///#
  ///#   // this will check to make sure that the docker app is running
  ///#   dockerCheck: true,
  ///#
  ///#   // the files that will be created in `project/[name]/app`.
  ///#   This can be a string to a folder to copy from, or a function
  ///#   create: [ 'index.scss', 'index.js', 'index.pug' ],
  ///#
  ///#   // if false no logging messages will appear in the console
  ///#   log: true,
  ///#
  ///#   // this determines if checking for docker is necessary every
  ///#   // time `project.start()`, `project.status()`, or `project.stop()`
  ///#   // is run
  ///#   dockerCheck: true,
  ///#
  ///#   // if true files will be minified after they're compiled
  ///#   minify: false,
  ///#
  ///#   // if true files will be run through [js-beautify](https://www.npmjs.com/package/js-beautify)
  ///#   pretty: true,
  ///#
  ///#   // if `true` and `options.minify` is `false` then source maps will be added where possible
  ///#   sourcemaps: true,
  ///#
  ///#   style: {}, // options for postcss
  ///#   template: {}, // options for templates
  ///#   javascript: {}, // options for rollup
  ///#
  ///#   // this is used to determine which language should be used if the key for a language isn't specified.
  ///#   // note that locales don't have to be in a specific format, you can even have `cheesecake` as a locale.
  ///#   // It just has to match what's in your `_content.json` file for your project, and layout.
  ///#   fallback_locale: 'eng',
  ///#
  ///#   // this indicates the default locale that should be built. This option can be a string,
  ///#   // comma delimited list, or an array of values. You can also use the `all` keyword, this will
  ///#   // build all the locales that you've specified in your specific project.
  ///#   default_build_locales: 'all',
  ///#
  ///#   // this is the path to the layout.
  ///#   // Note that this must be inside at least one folder because the other files
  ///#   // that may be used in the layout. For example `layout/_layout.html`
  ///#   layout: '',
  ///#
  ///#   // this function is called to rename the file paths so the app knows where to put the compiled files
  ///#   rename(item, locale, project) {
  ///#     // the item that was passed in is from the layout root
  ///#     if (!item.path.includes(project)) {
  ///#       return path.join(this.root, 'projects', project, 'dist', item.file)
  ///#     }
  ///#
  ///#     const dist = item.path.replace(/\bapp\b/, 'dist')
  ///#
  ///#     if (item.processor === 'template' && locale) {
  ///#       return dist.replace(`${item.file}`, path.join(locale, item.file))
  ///#     }
  ///#     return dist
  ///#   },
  ///# }
  ///# ```
  ///#
  ///# @note {10} Most functions in `Project` also have `pre` and `post` functionality much like npm scripts.
  ///# For example if you wanted to do something after every time your files were compiled you can add an option of
  ///# something like the following
  ///#
  ///# ```js
  ///# options = {
  ///#   async postbuild(err, name, files) {
  ///#     // do something awesome here
  ///#   }
  ///# }
  ///# ```
  ///#
  ///# All `pre` and `post` will have `this` (aka the current instance of the project) applied to it,
  ///# and all of them will have different arguments passed to them depending on what the main function is.
  ///# All `post` functions have the first argument as an `err`, in the same way that all node api functions are.
  constructor(options = {}) {
    super()
    this.options = Object.assign({
      root: process.cwd(),
      config: '.projectrc.js',
      create: [ 'index.scss', 'index.js', 'index.pug' ],
      log: true,
      dockerCheck: true,
      minify: false,
      pretty: true,
      sourcemaps: true,
      style: {}, // options for postcss
      template: {}, // options for templates
      javascript: {}, // options for rollup
      fallback_locale: 'eng',
      default_build_locales: 'all',
      layout: '',
      rename(item, locale, project) {
        // the item that was passed in is from the layout root
        if (!item.path.includes(project)) {
          return path.join(this.root, 'projects', project, 'dist', item.file)
        }

        const dist = item.path.replace(/\bapp\b/, 'dist')

        if (item.processor === 'template' && locale) {
          return dist.replace(`${item.file}`, path.join(locale, item.file))
        }
        return dist
      },
    }, options)

    this.root = this.options.root = options.root || process.cwd()
    if (this.options.projectrc !== false) {
      const js_file = path.join(this.root, this.options.config)
      try {
        this.options = Object.assign(this.options, require(js_file) || {})
      } catch (err) {
        if (!err.message.includes('Cannot find module')) this.log('error', err)
        // do nothing
      }
    }

    // allow for layout to be set on the templates options and the base options
    let layout = this.options.template.layout || this.options.layout || ''
    // convert the layout path to be absolute
    layout = !layout || path.isAbsolute(layout) ? layout : path.resolve(this.options.root, layout)
    this.options.layout = this.options.template.layout = layout

    if (layout) {
      // find the base folder for the layouts location so we can add all the layout files to the app
      [ this.options.layout_folder ] = this.stripRoot(this.options.layout).split(path.sep)
      this.options.layout_folder = this.options.layout_folder ? `${this.options.root}/${this.options.layout_folder}` : ''
    }

    this.current_path = path.join(this.root, 'PROJECT')

    try {
      // this has to be sync because you can't make a constructor function async
      this.current = `${fs.readFileSync(this.current_path)}` // eslint-disable-line no-sync
    } catch (e) {
      this.current = null
    }
  }

  ///# @name stripRoot
  ///# @description This will remove the root from a file path
  ///# @arg {string} file_path - The file path to remove the root from
  ///# @returns {string} The file path without the root
  stripRoot(file_path) {
    return file_path.replace(this.options.root + path.sep, '')
  }

  ///# @name init
  ///# @description
  ///# Used to create a new repo of projects
  ///# @arg {string} project_name - The name of repo that will be created
  ///# @arg {string} location [project_name] - The path to where the project will be created
  ///# @async
  async init(project_name, location = project_name) {
    await this.runOption('preinit', project_name, location)
    const folder = path.resolve(`${__dirname}/../project-init`)
    const [ author_name, author_email ] = await Promise.all([
      exec('git config user.name'),
      exec('git config user.email'),
    ])


    if (!path.isAbsolute(location)) {
      location = path.join(this.options.root, location)
    }
    await fs.copy(folder, location)

    // update the json file with the current authors information
    let file = await fs.readFile(`${location}/package.json`)
    file = file.toString().replace(/\${([a-z_]*)}/g, (match, variable) => {
      return { project_name, author_name, author_email, version }[variable]
    })

    await fs.outputJson(`${location}/package.json`, to.object(file), { spaces: 2 })

    await this.runOption('postinit', null)
  }

  ///# @name create
  ///# @description
  ///# Used to create a new project
  ///# @arg {string} name - the name of the project to be created
  ///# @async
  async create(name) {
    let { create } = this.options

    if (!is.string(name)) {
      return this.log('error', 'name must be a string')
    }

    const dir = path.join(this.root, 'projects', name)
    await fs.ensureDir(path.join(dir, 'dist'))

    if (is.function(create)) {
      await create(name, dir)
    } else if (is.array(create)) {
      await forEach(create, async (str) => {
        str = path.join(this.root, 'projects', name, 'app', str)
        if (str.slice(-1) === '/') {
          await fs.ensureDir(str)
        }
        await fs.ensureFile(str)
      })
    } else if (is.string(create)) {
      create = path.isAbsolute(create) ? create : path.join(this.root, create)
      await fs.copy(create, path.join(this.root, 'projects', name, 'app'))
    }
  }

  ///# @name start
  ///# @description Used to start a docker container
  ///# @arg {object} options
  ///# ```js
  ///# {
  ///#   ports: [ '80:80' ],
  ///#   env: [ 'MYSITE=marketamerica.com' ],
  ///#   image: 'artifactory.marketamerica.com:8443/internalsystems/alpine-linux/nginx:latest',
  ///#   force: false
  ///# }
  ///# ```
  ///# @async
  async start(options = {}) {
    options = Object.assign({
      ports: [ '80:80' ],
      env: [ 'MYSITE=marketamerica.com' ],
      image: 'artifactory.marketamerica.com:8443/internalsystems/alpine-linux/nginx:latest',
      force: false,
    }, options)

    await this.runOption('prestart', options)

    if (!await this.dockerCheck()) {
      await this.runOption('poststart', {}, 'docker-app-not-open')
      return
    }

    let list = this.list()

    if (options.force) {
      await this.stop(false)
    } else if (await this.status()) {
      this.log('server is already running')
      await this.runOption('poststart', null, 'already-running')
      return
    }

    list = await list

    const cmd = [
      'docker run',
      '--detach',
      options.ports.map((port) => `--publish ${port}`).join(' '),
      '--name project',
      options.env.map((env) => `--env ${env}`).join(' '),
      `--volume "${path.join(this.root, 'projects')}:/usr/share/nginx/html"`,
      list
        .map((project) => `--volume "${path.join(this.root, 'projects', project, 'dist')}:/usr/share/nginx/html/${project}"`)
        .join(' '),
      `--volume "${path.join(this.root, 'logs')}:/var/log/nginx"`,
      options.image,
    ].join(' ')

    try {
      await exec(cmd)
      this.log('server was started http://localhost')
      await this.runOption('poststart', null, 'started')
    } catch (e) {
      this.log('error', e)
      await this.runOption('poststart', e, 'failed')
    }
  }

  ///# @name dockerCheck
  ///# @description checks to see if the docker app is running
  ///# @returns {boolean}
  ///# @async
  async dockerCheck() {
    const apps = await exec('ps aux | grep -Eo "/Applications/[^/.]*" | grep -Eo "[^/[^]*$"')

    if (apps.split('\n').includes('Docker')) {
      return true
    }

    this.log('error', `${to.normalize(`
      The docker application needs to be running for this project to work.

      With brew you can install it via ${chalk.bold.green('brew install docker')}
      or you can install it from their application page
      https://docs.docker.com/engine/installation/
    `)}\n`)

    return false
  }

  ///# @name status
  ///# @description this is used to determin if the server is running or not
  ///# @returns {boolean}
  ///# @async
  async status() { // eslint-disable-line
    let list = await exec('docker ps --all')
    list = list.split('\n').slice(1).map((item) => item.split(/\s{2,}/g).pop().trim())
    return list.includes('project')
  }

  ///# @name stop
  ///# @description This is used to stop the server
  ///# @arg {boolean} log [true]
  ///# @async
  async stop(log = true) {
    await this.runOption('prestop', log)
    const exists = await this.status()
    if (!exists) {
      if (log) {
        this.log('server isn\'t running')
      }
      await this.runOption('poststop', null, 'not-running')
      return
    }

    try {
      await exec('docker rm --force project')
      if (log) {
        this.log('server was stopped')
      }
      if (await this.status()) {
        throw new Error('failed to stop server')
      } else {
        await this.runOption('poststop', null, 'not-running')
      }
    } catch (e) {
      if (log) {
        this.log('failed to stop server')
      }
      await this.runOption('poststop', e, 'running')
    }
  }

  ///# @name build
  ///# @description
  ///# This will compile an entire folder of assets and output them into a dist directory
  ///# @arg {string} name [this.current] - the name of the project to be created
  ///# @arg {array, string} locales [all] - the locales to build
  ///# @returns {function} render
  ///# This function accepts a glob of files that are in the root of the project that was passed
  ///# @markup
  ///# import Project from 'project-tools'
  ///# const project = new Project()
  ///# const render = await project.build('project-1')
  ///#
  ///# render('**/*')
  ///#  .then((render) => {
  ///#    render('**/*')
  ///#  })
  ///# @async
  async build(name, locales = this.options.default_build_locales) {
    const root = path.join(this.root, 'projects', name || this.current, 'app')
    const render = await compile(root, this.options)

    return async (glob = '**/*') => {
      if (!path.isAbsolute(glob)) {
        glob = path.join(root, glob)
      }

      await this.runOption('prebuild', name, glob)

      const files = await render(glob, locales)
      const result = await map(files, async (file) => {
        let sourcemap = Promise.resolve()
        if (file.map) {
          const map_file = `${file.dist}.map`
          file.code += `\n/*# sourceMappingURL=${map_file.split('dist')[1].slice(1)} */\n`
          sourcemap = fs.outputFile(map_file, file.map)
        }

        await Promise.all([
          fs.outputFile(file.dist, file.code),
          sourcemap,
        ])

        return file
      })

      await this.runOption('postbuild', null, name, result)

      return result
    }
  }


  ///# @name watch
  ///# @description
  ///# This will watch assest for changes and build/compile the files that change
  ///# @arg {string} name [this.current] - the name of the project to be created
  ///# @returns {object} watcher
  ///# For mor information on what you can do with it see [chokidar](https://github.com/paulmillr/chokidar).
  ///# There is one extra event that you can listen for on top of what [chokidar](https://github.com/paulmillr/chokidar)
  ///# already offers and that's `success`
  ///# @markup
  ///# import Project from 'project-tools'
  ///# const project = new Project()
  ///#
  ///# async function watch(project_name) {
  ///#   const watcher = await project.watch('project-1')
  ///#      .on('change', (file) => project.log(`${chalk.green('Started:')}  ${file}`))
  ///#      .on('success', (file) => project.log(`${chalk.green('Finished:')} ${file}`))
  ///#      .on('error', (err, file) => {
  ///#        project.log(`${chalk.red(file)} failed to updated`)
  ///#        project.log('error', err)
  ///#      })
  ///#   // this will wait for the initial build to run
  ///#   await watcher.ready()
  ///# }
  watch(name, locales = this.options.default_build_locales) {
    name = name || this.current

    const globs_to_watch = [ path.join('projects', name, 'app'), this.options.layout_folder ].filter(Boolean)

    const watcher = chokidar.watch(globs_to_watch, {
      persistent: true,
      cwd: this.root,
      ignoreInitial: true,
    })

    let renderer
    const initial_glob = path.join('projects', name, 'app', '**', '*')
    const render = async (glob) => {
      try {
        if (!renderer) {
          renderer = await this.build(name, locales)
        }

        if (
          glob.includes(this.options.layout_folder) ||
          glob.includes('.json')
        ) {
          glob = initial_glob
        }
        const result = renderer(glob.split(/app(?:\/|\\\\)/)[1])

        // add the layout files the
        if (this.options.layout_folder && glob.includes('**/*')) {
          glob += `, ${path.join(this.stripRoot(this.options.layout_folder), '**', '*')}`
        }

        watcher.emit('started', glob)
        watcher.emit('success', glob, await result)
      } catch (err) {
        watcher.emit('error', err, glob)
      }
    }

    watcher.ready = () => {
      // wait for the watcher to be ready before returning
      return new Promise((resolve) => {
        watcher.on('ready', () => resolve(render(initial_glob)))
      })
    }


    process.nextTick(() => {
      // add these events on after the next tick so that any events that
      // the user adds will be run first
      watcher.on('add', render).on('change', render)
    })

    return watcher
  }

  ///# @name list
  ///# @description This will return all the projects that currently exist in the repo
  ///# @arg {string} name - all or part of the project name
  ///# @async
  ///# @return {array} - projects
  async list(name) {
    const list = await globby('*', { cwd: path.join(this.root, 'projects') })
    if (name) {
      return list.filter((item) => item.includes(name))
    }
    return list
  }

  ///# @name use
  ///# @description
  ///# This will create a file called `PROJECT` in the root directory of
  ///# this project it's used if a `name` isn't passed to other commands
  ///# @arg {string} name - The name to use
  ///# @throws {error} - If a name isn't passed
  ///# @async
  ///# @returns {string, undefined} - the argument that was passed
  async use(name) {
    if (!name || typeof name !== 'string') {
      return this.log('error', 'you must pass a string to use')
    }

    await fs.outputFile(this.current_path, name)
    this.current = name
    return name
  }


  ///# @name runOption
  ///# @description This function is used to run `pre` and `post` options if they exist.
  ///# @arg {string} name - The the name of the option to run
  ///# @arg {*} ...args - The arguments to pass to the function
  ///# @note {5} The function called will always bind to `this`
  ///# @returns {Promise}
  ///# @async
  ///#
  ///# @markup ###### Example:
  ///# options = {
  ///#   async prebuild(name, glob) {
  ///#     // do something awesome here
  ///#   }
  ///# }
  runOption(name, ...args) {
    const fn = this.options[name]
    let called

    try {
      if (typeof fn === 'function') {
        called = this::fn(...args)
        if (!called.then) {
          called = Promise.resolve(called)
        }
      } else {
        called = Promise.resolve()
      }

      return called
    } catch (e) {
      this.log('error', `${name} failed to run without errors\n`, e, '\n')
    }
  }


  ///# @name publish
  ///# @todo {4} figure out a good way to publish items
  publish(name) {
    if (!this.options.publish) {
      this.log('error', 'You must add a publish function to the `.projectrc.js` file')
      return
    }

    this.runOption('publish', name)
  }
}
