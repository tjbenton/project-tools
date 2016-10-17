import path from 'path'
import fs from 'fs-extra-promisify'
import { forEach, map } from 'async-array-methods'
import { version } from '../package.json'
import { exec, Logger } from './utils'
import to, { is } from 'to-js'
import globby from 'globby'
import chalk from 'chalk'
import compile from './compile'

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
  ///# @constructor
  ///# @arg {object}
  ///# defaults
  ///# ```js
  ///# // the base folder for the project
  ///# options.root = projcess.cwd()
  ///#
  ///# // determins if the config file is used or not
  ///# options.projectrc = true
  ///#
  ///# // path to the config file
  ///# options.config = '.projectrc.js'
  ///#
  ///# // this will check to make sure that the docker app is running
  ///# options.dockerCheck = true
  ///# ```
  constructor(options = {}) {
    super()
    this.options = Object.assign({
      root: process.cwd(),
      config: '.projectrc.js',
      create: [ 'index.scss', 'index.js', 'index.jade' ],
      log: true,
      dockerCheck: true,
      minify: false,
      pretty: true,
      sourcemaps: true,
    }, options)

    this.root = this.options.root = options.root || process.cwd()
    if (this.options.projectrc !== false) {
      const js_file = path.join(this.root, this.options.config)
      try {
        this.options = Object.assign(this.options, require(js_file) || {})
      } catch (a) {
        // do nothing
      }
    }

    this.current_path = path.join(this.root, 'PROJECT')

    try {
      this.current = fs.readFileSync(this.current_path) + ''
    } catch (e) {
      this.current = null
    }
  }

  ///# @name init
  ///# @description
  ///# Used to create a new repo of projects
  ///# @arg {string} project_name - The name of repo that will be created
  ///# @arg {string} location - The path to where the project will be created
  ///# @async
  async init(project_name, location) {
    const folder = path.resolve(`${__dirname}/../project-init`)
    const author_info = await Promise.all([
      exec('git config user.name'),
      exec('git config user.email')
    ])

    let [ author_name, author_email ] = await author_info

    await fs.copy(folder, location)

    // update the json file with the current authors information
    let file = await fs.readFile(`${location}/package.json`)
    file = file.toString().replace(/\${([a-z_]*)}/g, (match, variable) => {
      return { project_name, author_name, author_email, version }[variable]
    })

    await fs.outputFile(`${location}/package.json`, file, { spaces: 2 })
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
    if (!(await this.dockerCheck())) {
      return
    }

    let list = this.list()

    options = Object.assign({
      ports: [ '80:80' ],
      env: [ 'MYSITE=marketamerica.com' ],
      image: 'artifactory.marketamerica.com:8443/internalsystems/alpine-linux/nginx:latest',
      force: false
    }, options)

    if (options.force) {
      await this.stop(false)
    } else if (await this.status()) {
      return this.log('server is already running')
    }

    list = await list


    const cmd = [
      'docker run',
      '--detach',
      options.ports.map((port) => `--publish ${port}`).join(' '),
      '--name project',
      options.env.map((env) => `--env ${env}`).join(' '),
      `--volume "${path.join(this.root, 'projects')}:/usr/share/nginx/html"`,
      list.map((project) => {
        return `--volume "${path.join(this.root, 'projects', project, 'dist')}:/usr/share/nginx/html/${project}"`
      }).join(' '),
      `--volume "${path.join(this.root, 'logs')}:/var/log/nginx"`,
      options.image
    ].join(' ')

    try {
      await exec(cmd)
      this.log('server was started http://localhost')
    } catch (e) {
      this.log('error', e)
    }
  }

  ///# @name dockerCheck
  ///# @description checks to see if the docker app is running
  ///# @returns {boolean}
  ///# @async
  async dockerCheck() {
    let apps = await exec('ps aux | grep -Eo "/Applications/[^/.]*" | grep -Eo "[^/\[^]*$"')

    if (apps.split('\n').includes('Docker')) {
      return true
    }

    this.log('error', to.normalize(`
      The docker application needs to be running for this project to work.

      With brew you can install it via ${chalk.bold.green('brew install docker')}
      or you can install it from their application page
      https://docs.docker.com/engine/installation/
    `) + '\n')

    return false
  }

  ///# @name status
  ///# @description this is used to determin if the server is running or not
  ///# @returns {boolean}
  ///# @async
  async status() {
    let list = await exec('docker ps --all')
    list = list.split('\n').slice(1).map((item) => {
      return item.split(/\s{2,}/g).pop().trim()
    })
    return list.includes('project')
  }

  ///# @name stop
  ///# @description This is used to stop the server
  ///# @arg {boolean} log [true]
  ///# @async
  async stop(log = true) {
    let exists = await this.status()
    if (!exists) {
      if (log) {
        this.log('server isn\'t running')
      }
      return
    }

    await exec('docker rm --force project')

    if (log) {
      this.log('server was stopped')
    }
  }

  ///# @name build
  ///# @description
  ///# This will compile an entire folder of assets and output them into a dist directory
  ///# @arg {string} name [this.current] - the name of the project to be created
  ///# @returns {function} render
  ///# This function accepts a glob of files that are in the root of the project that was passed
  ///# @markup
  ///# const project = new Project()
  ///# project.build('project-1')
  ///#  .then((render) => {
  ///#    render('**/*')
  ///#  })
  ///# @async
  async build(name) {
    const root = path.join(this.root, 'projects', name || this.current, 'app')
    const render = await compile(root, this.options)

    return async (glob = '**/*') => {
      let files = await render(path.join(root, glob), this.options)
      return await map(files, async (file) => {
        file.dist = file.path.replace(file.root, file.root.slice(0, -3) + 'dist')
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
    }
  }

  async watch() {
    console.log('watch')
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

  async publish() {
    console.log('publish')
  }

  async translate() {
    console.log('translate')
  }
}
