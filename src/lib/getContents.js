const path = require('path')
const fs = require('fs').promises

module.exports = base => files =>
  Promise.all(
    files.map(file =>
      fs.readFile(path.join(base, file), 'utf8').then(data => ({
        name: path.basename(file, '.json'),
        contents: JSON.parse(data)
      }))
    )
  )
