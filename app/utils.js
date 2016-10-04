////
/// @name Utils
/// @author Tyler Benton
/// @page utils
////

import inquirer from 'inquirer'
import autocomplete from 'inquirer-autocomplete-prompt'
inquirer.registerPrompt('autocomplete', autocomplete)
import to from 'to-js'


/// @name question
/// @arg {string, object} options [{}]
/// If a `string` is passed it's used as the message for the question
/// if a `object` is passed it takes the same options as [inquirer](https://www.npmjs.com/package/inquirer#question)
/// @throws {error} when a message isn't passed
/// @returns {string} the answer to the question
export async function question(options = {}) {
  if (to.type(options) === 'string') {
    options = { message: options }
  }
  options.type = options.type || 'input'
  options.name = 'result'
  if (!options.validate) {
    options.validate = (input) => !!input
  }
  if (!options.message) {
    throw new Error('you have to pass in a message')
    return
  }

  options.message = to.normalize(options.message)

  const { result } = await inquirer.prompt(options)
  return result
}

/// @name confirm
/// @arg {string} message - message to ask
/// @arg {string, boolean} yes_no
/// This is to set the default of the confirm
/// `yes`, `Yes`, `y`, `Y`, `true` will all set the default answer to `Yes`
/// `no`, `No`, `n`, `N`, `false` will all set the default answer to `No`
/// @throws {error} when a message isn't passed
/// @returns {boolean}
export function confirm(message, yes_no) {
  if (!message) {
    throw new Error('you have to pass in a message')
    return
  }

  message = to.normalize(message)

  const default_option = ((val) => {
    let char = typeof val === 'string' && val[0].toLowerCase()
    if (yes_no === true || char === 'y') {
      return 0
    } else if (yes_no === false || char === 'n') {
      return 1
    }
    return 2
  })(yes_no)

  return question({
    type: 'expand',
    message,
    default: default_option,
    choices: [
      { key: 'y', name: 'yes', value: true },
      { key: 'n', name: 'no', value: false }
    ]
  })
}


import chalk from 'chalk'
import { spawn } from 'child_process'

/// @name exec
/// @description Helper function to command line commands from node in an async way
/// @arg {string} command - The command you're wanting to run
/// @arg {string, array, boolean} stdio ['inherit'] -
///  - 'inherit' will let the command that you run to have control over what's output
///  - 'pipe' will take over the `process.stdout`. This can cause issues if the commands you're running have questions or action items.
/// @arg {boolean} log [false] - Determins if you want output the stdout or not. Only applies if `stdio` is set to 'pipe'
export function exec(command, stdio = false, log) {
  // enviroment to use where the commands that are run
  // will output in full color
  const env = process.env
  env.NPM_CONFIG_COLOR = 'always'

  // this lets the command that was run to determin
  // how the information is output
  // http://derpturkey.com/retain-tty-when-using-child_proces-spawn/
  if (stdio === false) {
    stdio = 'pipe'
  } else if (stdio === true) {
    stdio = 'inherit'
  }

  log && console.log('Started:', chalk.yellow.bold(command))
  const setRawMode = process.stdin.setRawMode
  if (setRawMode && typeof setRawMode === 'function') {
    process.stdin.setRawMode(true)
  }
  process.stdin.setEncoding('utf8')

  let output = ''

  return new Promise((resolve, reject) => {
    const child = spawn('/bin/sh', [ '-c', command ], { env, stdio })

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        data = unquote((data + '').trim()) // .split('\n').filter(Boolean).join('\n')
        output += data
      })
    }

    if (child.stderr) {
      child.stderr.on('data', (err) => {
        err = unquote((err + '').trim()) // .split('\n').filter(Boolean).join('\n')
        console.error(chalk.red('[Error]:'), err)
        reject(err)
      })
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output)
        command = chalk.green.bold(command)
      } else {
        reject(code)
        command = chalk.red.bold(command)
      }
      if (log) {
        process.stdout.write(to.normalize(`
          Finished: ${command}
          ${output}
        `) + '\n')
      }
    })
  })
}

export function unquote(str) {
  var reg = /[\'\"]/
  if (!str) {
    return ''
  }
  const length = str.length
  return str.slice(
    reg.test(str.charAt(0)) ? 1 : 0,
    reg.test(str.charAt(length - 1)) ? length - 1 : length
  )
}


module.exports.default = module.exports
