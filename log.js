const { readFile } = require('fs').promises

readFile('./publish.log').then(log => {
  if (log.toString().includes('npm ERR!')) {
    process.stderr.write(log.toString())
    process.exit(1)
  }
})
