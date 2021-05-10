const { readFile } = require('fs').promises
const { red } = require('colorette')

readFile('./publish.log').then(log => {
  if (log.toString().includes('npm ERR!')) {
    process.stderr.write(red(log.toString()))
    process.exit(1)
  }
})
