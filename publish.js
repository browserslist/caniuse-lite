const git = require('gift')
const fetch = require('node-fetch')
const execa = require('execa')
const Listr = require('listr')
const split = require('split')
const fs = require('fs').promises
require('any-observable/register/rxjs-all')
const { merge } = require('rxjs')
const { filter } = require('rxjs/operators')
const streamToObservable = require('@samverschueren/stream-to-observable')

const pkg = require('./package.json')

// Cache this so we don't exit early.
const currentVersion = pkg.devDependencies['caniuse-db']

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

const enabled = ctx => ctx.version !== currentVersion

const tasks = new Listr([
  {
    title: 'Querying for a new caniuse-db version',
    task: (ctx, task) =>
      fetch('https://registry.npmjs.org/caniuse-db')
        .then(response => response.json())
        .then(body => {
          let version = (ctx.version = body['dist-tags'].latest)
          if (enabled(ctx)) {
            task.title = `Upgrading ${currentVersion} => ${version}`
          } else {
            task.title = `Already up to date! (v${version})`
          }
        })
  },
  {
    title: 'Syncing local repository',
    task: () =>
      new Promise((resolve, reject) => {
        repo.pull(err => {
          if (err) {
            return reject(err)
          }
          return resolve()
        })
      }),
    enabled
  },
  {
    title: 'Updating local caniuse-db version',
    task: ctx => {
      pkg.devDependencies['caniuse-db'] = ctx.version
      return fs.writeFile('./package.json', `${JSON.stringify(pkg, null, 2)}\n`)
    },
    enabled
  },
  {
    title: 'Retrieving dependencies from npm',
    task: () => exec('yarn', ['install']),
    enabled
  },
  {
    title: 'Packing caniuse data',
    task: () => exec('npx', ['babel-node', 'src/packer/index.js']),
    enabled
  },
  {
    title: 'Running tests',
    task: () => exec('yarn', ['test']),
    enabled
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
      }),
    enabled
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
      }),
    enabled
  },
  {
    title: 'Updating version',
    task: ctx => exec('npm', ['version', ctx.version]),
    enabled
  },
  {
    title: 'Publishing to npm',
    task: () => exec('npx', ['clean-publish']),
    enabled
  },
  {
    title: 'Syncing repo & tags to GitHub',
    task: () => exec('git', ['push', '--follow-tags']),
    enabled
  }
])

tasks.run().catch(err => {
  console.error(err.stack)
})
