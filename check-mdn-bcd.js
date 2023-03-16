const { writeFileSync } = require('fs')
const { get } = require('https')

const pkg = require('./package.json')

get('https://registry.npmjs.org/@mdn/browser-compat-data', res => {
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
    let currentMajorVersion =
      pkg.devDependencies['@mdn/browser-compat-data'].split('.')[0]
    let latestMajorVersion = lastVersion.split('.')[0]

    if (latestMajorVersion !== currentMajorVersion) {
      throw new Error(
        '@mdn/browser-compat-data has received a major version bump.'
      )
    } else if (
      pkg.devDependencies['@mdn/browser-compat-data'] !== lastVersion
    ) {
      pkg.devDependencies['@mdn/browser-compat-data'] = lastVersion
      writeFileSync('./package.json', `${JSON.stringify(pkg, null, 2)}\n`)
      writeFileSync(process.env.GITHUB_OUTPUT, 'newVersion=1\n')
      process.stdout.write('@mdn/browser-compat-data has new version\n')
    } else {
      process.stdout.write('Already up to date\n')
    }
  })
})
