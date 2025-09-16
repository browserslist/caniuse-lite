const { readFile } = require('node:fs/promises')

readFile('./publish.log').then(log => {
  let str = log.toString()
  if (str.includes('npm ERR!') || str.includes('npm error')) {
    process.stderr.write(log.toString())
    process.exit(1)
  } else {
    process.stdout.write(log.toString())
  }
})
