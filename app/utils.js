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

  let yesOrNo = (val) => {
    if (val === true) {
      val = 'y'
    } else if (val === false) {
      val = 'n'
    } else if (typeof val === 'string') {
      val = val[0].toLowerCase()
    } else {
      return -1
    }

    return [ 'y', 'n' ].indexOf(val)
  }


  let default_option = yesOrNo(yes_no)

  if (default_option < 0) {
    default_option = 2
  }

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

  command = command.split(' ')
  const args = command.slice(1)
  let output = ''
  command = command[0]


  function unquote(str) {
    var reg = /[\'\"]/
    if (!str) {
      return ''
    }
    if (reg.test(str.charAt(0))) {
      str = str.substr(1)
    }
    if (reg.test(str.charAt(str.length - 1))) {
      str = str.substr(0, str.length - 1)
    }
    return str
  }


  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio })

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        data = unquote((data + '').trim()) // .split('\n').filter(Boolean).join('\n')
        if (log) {
          output = data
        }
        resolve(data)
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
      let full_command = `${command} ${args.join(' ')}`
      if (code === 0) {
        resolve()
        full_command = chalk.green.bold(full_command)
      } else {
        reject(code)
        full_command = chalk.red.bold(full_command)
      }
      if (log) {
        process.stdout.write(to.normalize(`
          Finished: ${full_command}
          ${output}
        `) + '\n')
      }
    })
  })
}


module.exports.default = module.exports
