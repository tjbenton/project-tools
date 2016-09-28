import pkg from '../package.json'
import commander from 'commander'
import Project from './project'

console.log(pkg);
export default async function cli() {
  const project = new Project()

  // commander
  //   .version(pkg.version)

  commander
    .command('init')
    .option()
    .usage('[name]')
    .description()
    .action(project.init)

  commander
    .command('create')
    .option()
    .usage('[name]')
    .description()
    .action(project.create)

  commander
    .command('build')
    .option()
    .usage('[name]')
    .description()
    .action(project.build)

  commander
    .command('start')
    .option()
    .usage('[name]')
    .description()
    .action(project.start)

  commander
    .command('stop')
    .option()
    .usage('[name]')
    .description()
    .action(project.stop)

  commander
    .command('watch')
    .option()
    .usage('[name]')
    .description()
    .action(project.watch)

  commander
    .command('list') // ls
    .option()
    .usage('[name]')
    .description()
    .action(project.list)


  commander
    .command('use') // save
    .option()
    .usage('[name]')
    .description()
    .action(project.use)

  commander
    .command('publish')
    .option()
    .usage('[name]')
    .description()
    .action(project.publish)


  commander
    .command('translate')
    .option()
    .usage('[name]')
    .description()
    .action(project.translate)

  commander
    .command('help')
    .description()
    .action(commander.help)

  commander.parse(process.argv)

  if (commander.args.length < 1) {
    commander.help()
  }
}
