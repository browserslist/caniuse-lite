const { writeFileSync } = require('fs')
const { get } = require('https')

const pkg = require('./package.json')

get('https://registry.npmjs.org/caniuse-db', res => {
  if (res.statusCode < 200 || res.statusCode >= 299) {
    process.stderr.write(`${res.statusCode} response from npm\n`)
    process.exit(1)
  }

  let data = ''
  res.on('data', chunk => {
    data += chunk
  })
  res.on('end', () => {
    let body = JSON.parse(data)
    let lastVersion = body['dist-tags'].latest
    if (pkg.devDependencies['caniuse-db'] !== lastVersion) {
      pkg.version = lastVersion
      pkg.devDependencies['caniuse-db'] = lastVersion
      writeFileSync('./package.json', `${JSON.stringify(pkg, null, 2)}\n`)
      writeFileSync(process.env.GITHUB_OUTPUT, 'newVersion=1\n')
      process.stdout.write('caniuse-db has new version\n')
    } else {
      process.stdout.write('Already up to date\n')
    }
  })
})
