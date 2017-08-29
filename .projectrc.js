/* eslint-env node */

var path = require('path')
var root = path.join(process.cwd(), 'project-init')
module.exports = {
  layout: path.join(root, 'layout', 'index.html'),
  create: path.join(root, 'project-base'),
  fallback_locale: 'eng',
}
