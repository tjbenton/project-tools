import path from 'path'
import fs from 'fs-extra-promisify'
import { version } from '../package.json'
import { exec } from './utils'
import to from 'to-js'
import globby from 'globby'

export default class Project {
  constructor(options = {}) {
    this.options = options
    this.root = this.options.root = options.root || process.cwd()
    this.current_path = path.join(__dirname, '..', 'PROJECT')
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

  async create() {
    console.log('create');
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
      return list.filter((item) => item.indexOf(name) === 0)
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
      console.error('you must pass a string to use')
      return
    }

    await fs.writeFile(this.current_path, name)
    this.current = name
    return name
  }

  async publish() {
    console.log('publish');
  }

  async translate() {
    console.log('translate');
  }
}
