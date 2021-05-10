const git = require('gift')
const execa = require('execa')
const split = require('split')
const fs = require('fs').promises
require('any-observable/register/rxjs-all')
const { merge } = require('rxjs')
const { filter } = require('rxjs/operators')
const streamToObservable = require('@samverschueren/stream-to-observable')

const runTasks = require('./src/lib/runTasks')
const pkg = require('./package.json')

const repo = git(__dirname)

// With thanks: https://github.com/sindresorhus/np
const exec = (cmd, args) => {
  let cp = execa(cmd, args)

  return merge(
    streamToObservable(cp.stdout.pipe(split())),
    streamToObservable(cp.stderr.pipe(split())),
    cp
  ).pipe(filter(Boolean))
}

runTasks([
  {
    title: 'Updating local caniuse-db version',
    task: ctx => {
      pkg.devDependencies['caniuse-db'] = ctx.version
      return fs.writeFile('./package.json', `${JSON.stringify(pkg, null, 2)}\n`)
    }
  },
  {
    title: 'Retrieving dependencies from npm',
    task: () => exec('yarn', ['install'])
  },
  {
    title: 'Packing caniuse data',
    task: () => exec('node', ['src/packer/index.js'])
  },
  {
    title: 'Running tests',
    task: () => exec('yarn', ['test'])
  },
  {
    title: 'Staging files for commit',
    task: () =>
      new Promise((resolve, reject) => {
        repo.add(['./data', './package.json', './yarn.lock'], err => {
          if (err) {
            return reject(err)
          }
          return resolve()
        })
      })
  },
  {
    title: 'Committing changes',
    task: ctx =>
      new Promise((resolve, reject) => {
        repo.commit(`Update caniuse-db to ${ctx.version}`, err => {
          if (err) {
            return reject(err)
          }
          return resolve()
        })
      })
  },
  {
    title: 'Updating version',
    task: ctx => exec('npm', ['version', ctx.version])
  },
  {
    title: 'Publishing to npm',
    task: () => exec('npx', ['clean-publish'])
  },
  {
    title: 'Syncing repo & tags to GitHub',
    task: () => exec('git', ['push', '--follow-tags'])
  }
])
