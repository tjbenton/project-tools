const path = require('path')
const root = process.cwd() + path.sep

module.exports.stripRoot = function stripRoot(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stripRoot)
  }

  const keys = [ 'path', 'src', 'root', 'dist' ]
  for (const key of keys) {
    obj[key] = obj[key].replace(root, '')
  }

  obj.map = obj.map.replace(root, '')
  return obj
}
