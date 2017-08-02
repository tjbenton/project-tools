////
/// @name Utils
/// @author Tyler Benton
/// @page utils
////

import inquirer from 'inquirer'
import autocomplete from 'inquirer-autocomplete-prompt'
const originalRun = autocomplete.prototype._run // eslint-disable-line no-underscore-dangle
autocomplete.prototype._run = function Run(cb) { // eslint-disable-line no-underscore-dangle
  originalRun.call(this, cb)
  if (!!this.opt.initial) {
    // emit a keypress event to pass in the initial option
    this.rl.input.emit('keypress', this.opt.initial) // trigger the search
  }
}
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
    const char = typeof val === 'string' && val[0].toLowerCase()
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
/// @arg {string, array, boolean} stdio [false] -
///  - if `'inherit'`, or `true` will let the command that you run to have control over what's output
///  - if `'pipe'`, or `false` will take over the `process.stdout`. This can cause issues if the
///    commands you're running have questions or action items.
/// @arg {boolean} log [false]
/// Determins if you want output the stdout or not. Only applies if `stdio` is set to 'pipe'
export function exec(command, stdio = false, log = false) {
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
        data = unquote(`${data}`.trim())
        output += data
      })
    }

    if (child.stderr) {
      child.stderr.on('data', (err) => {
        err = unquote(`${err}`.trim())
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
        console.log(`${to.normalize(`
          Finished: ${command}
          ${output}
        `)}\n`)
      }
    })
  })
}


/// @name unquote
/// @description
/// This will unquote a string that's wrapped in quotes
/// @arg {string} str
/// @returns {string} the quoteless string
export function unquote(str) {
  const reg = /[\'\"]/
  if (!str) {
    return ''
  }
  const length = str.length
  return str.slice(
    reg.test(str.charAt(0)) ? 1 : 0,
    reg.test(str.charAt(length - 1)) ? length - 1 : length
  )
}


/// @name Logger
/// @description
/// This is the main logger for the project app
/// @arg {object} options [{ log: true, timestamp: true }]
export class Logger {
  constructor(options = {}) {
    this.options = Object.assign({
      log: true,
      timestamp: true
    }, options)
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

      console.log(...args)

      if (type === 'error') {
        throw new Error(args.join('\n'))
      }
    }
  }
}

import beautifiers from 'js-beautify'
/// @name beautify
/// @description
/// This is used to format files
/// @arg {string} str - the string to format
/// @arg {string} type - the type to format the string, accepts `'html', 'css', and 'js'`
/// @arg {object} options - the options to use for the beautifier
/// @returns {string} the beautfied string
export function beautify(str, type, options = {}) {
  if (type === 'json') {
    type = 'js'
  }

  if (![ 'html', 'css', 'js' ].includes(type)) {
    throw new Error(`You passed in ${type} to beautify and you must pass in js, html, css, json`)
    return
  }

  let base_options = {
    indent_size: 2,
    indent_char: ' ',
    eol: '\n',
    indent_with_tabs: false,
    end_with_newline: true,
    editorconfig: true,
    preserve_newlines: true,
    max_preserve_newlines: 10,
    brace_style: 'collapse',
  }

  if (type === 'js') {
    base_options = Object.assign(base_options, {
      indent_level: 0,
      space_after_anon_function: false,
      jslint_happy: false,
      space_after_anon_function: false,
      keep_array_indentation: false,
      keep_function_indentation: false,
      space_before_conditional: true,
      break_chained_methods: false,
      eval_code: false,
      unescape_strings: true,
      wrap_line_length: 0,
      wrap_attributes: 'auto',
      wrap_attributes_indent_size: 4,
    })
  } else if (type === 'css') {
    base_options = Object.assign(base_options, {
      newline_between_rules: true,
      selector_separator_newline: true,
    })
  } else {
    // html
    base_options = Object.assign(base_options, {
      wrap_attributes_indent_size: 2,
      wrap_line_length: 0,
      wrap_attributes: 'auto',
      indent_inner_html: true,
    })
  }

  str = beautifiers[type](str, Object.assign(base_options, options))


  // thanks to https://github.com/jonschlinkert/pretty/blob/master/index.js#L23
  if (type === 'html') {
    return str
      // Remove any empty lines at the top of a file.
      .replace(/^\s*/g, '')
      // Normalize and condense all newlines
      .replace(/(\r\n|\n){2,}/g, '\n')
      // fix multiline, Bootstrap-style comments
      .replace(/(\s*)(<!--.+)\s*(===.+)/g, '$1$2$1$3')
      // make <a><span></a> on one line, but only when a > span
      .replace(/(<a.+)(?:\s*)(<(?:span|b|s|i|strong|em|small|big) .+)(?:\s*)(<\/a>)/g, '$1 $2 $3')
      // make `<li><a>.*</a></li> `on one line, but only when `li > a`
      .replace(/(<li[^>]*>)(?:\s*)([a-z]*)(?:\s*)(<a .+)(?:\s*)(<\/li>)/g, '$1 $2 $3 $4')
      // Adjust spacing for button > span
      .replace(/(<button.+)(<span.+)(\s*)(<\/button>)/g, '$1$3  $2$3$4')
      // Adjust spacing for span > input
      .replace(/(\s*)(<span.+)(\s*)(<input.+)(\s*)(<\/span>)/g, '$1$2$1 $4$1$6')
      // Add a newline for tags nested inside <h1-6>
      .replace(/(\s*)(<h[0-6](?:.+)?>)(.*)(<(?:small|span|strong|em)(?:.+)?)(\s*)(<\/h[0-6]>)/g, '$1$2$3$1 $4$1$6')
      // Add a space above each comment
      .replace(/(\s*<!--)/g, '\n$1')
      // Fix conditional comments
      .replace(/( *)(<!--\[.+)(\s*)(.+\s*)?(.+\s*)?(<!\[endif\]-->)/g, '$1$2\n  $1$4$1$5$1$6')
      // Bring closing comments up to the same line as closing tag.
      .replace(/\s*(<!--\s*\/.+)/g, '$1')
      // bring some tags to be inline
      .replace(/\s*(<(?:b|s|i|em|strong|span)>)|\s*(<\/(?:b|s|i|em|strong|span)>)\s*(<\/(?:a|li|b|s|i|em|strong|span))?/gi, ' $1$2$3')
      .replace(/([a-z0-9]) +<\//g, '$1</')
      // remove space between `> a`, or `> <`
      .replace(/> +(<|[^\s])/g, '>$1')
      // Add a space after some inline elements, since prettifying strips them sometimes
      // .replace(/(<\/(a|small|span|strong|em|b|s|i)>(?:(?!,)))/g, '$1 ')
      // remove trailing whitespace from each line
      .replace(/[ \t]+$/g, '')
      // add space before !important in <style>
      .replace(/\s*(!important)/g, ' $1')
      // add space for media queries arguments
      .replace(/\(([A-z-]+):\s*([0-9A-z]+)\)(?=[^<]+{)/g, '($1: $2)')
  }

  if (type === 'css') {
    return str
      // add space before !important
      .replace(/\s*(!important)/g, ' $1')
      // add space for media queries arguments
      .replace(/\(([A-z-]+):\s*([0-9A-z]+)\)(?=[^<]+{)/g, '($1: $2)')
  }

  return str
}


module.exports.default = module.exports
