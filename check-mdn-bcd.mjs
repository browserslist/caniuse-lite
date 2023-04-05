import { writeFileSync } from 'node:fs'
import process from 'node:process'
import pkg from './package.json' assert { type: 'json' }

const res = await fetch('https://registry.npmjs.org/@mdn/browser-compat-data')
if (!res.ok) {
  process.stderr.write(`${res.status} response from npm\n`)
  process.exit(1)
}

const body = await res.json()
const lastVersion = body['dist-tags'].latest
const latestMajorVersion = lastVersion.split('.')[0]
const currentMajorVersion = pkg.devDependencies['@mdn/browser-compat-data']
  .split('.')[0]

if (latestMajorVersion !== currentMajorVersion) {
  throw new Error('@mdn/browser-compat-data has received a major version bump.')
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
