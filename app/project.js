import path from 'path'
import fs from 'fs-extra-promisify'
import { forEach } from 'async-array-methods'
import { version } from '../package.json'
import { exec } from './utils'
import to, { is } from 'to-js'
import globby from 'globby'
import chalk from 'chalk'

////
/// @name Project
/// @author Tyler Benton
/// @page project
////

/// @name Project
/// @description
/// This class is the main functionality of the project cli
/// @class
export default class Project {
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
  ///# ```
  constructor(options = {}) {
    this.options = Object.assign({
      root: process.cwd(),
      config: '.projectrc.js',
      create: [ 'index.scss', 'index.js', 'index.jade' ],
      log: true,
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

  async build() {
    console.log('build');
  }

  async start() {
    console.log('start');
  }

  async stop() {
    console.log('stop');
  }

  async watch() {
    console.log('watch');
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

  log(type, ...args) {
    if (this.options.log || type === 'error') {
      const types = {
        error: 'red',
        warning: 'yellow',
        info: 'blue',
        log: 'gray'
      }

      if (!to.keys(types).includes(type)) {
        args.unshift(type)
        type = 'log'
      }

      const now = new Date()
      const timestamp = [ now.getHours(), now.getMinutes(), now.getSeconds() ].join(':')

      // print the current time.
      let stamp = this.options.timestamp ? `[${chalk.magenta(timestamp)}] ` : ''
      if (type !== 'log') {
        stamp += `${chalk[types[type]](type)}: `
      }
      if (stamp) {
        process.stdout.write(stamp)
      }

      console[type](...args)

      if (type === 'error') {
        throw new Error(args.join('\n'))
      }
    }
  }

  async publish() {
    console.log('publish');
  }

  async translate() {
    console.log('translate');
  }
}
