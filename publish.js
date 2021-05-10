const { spawn } = require('child_process')
const git = require('gift')

const runTasks = require('./src/lib/runTasks')

const repo = git(__dirname)

// With thanks: https://github.com/sindresorhus/np
const exec = async (cmd, args) => {
  await new Promise((resolve, reject) => {
    let execution = spawn(cmd, args, { env: process.env })

    let output = ''
    execution.stdout.on('data', data => {
      output += data.toString()
    })
    execution.stderr.on('data', data => {
      output += data.toString()
    })

    execution.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        process.stderr.write(output)
        reject(new Error('Exit code ' + code))
      }
    })
  })
}

runTasks([
  {
    title: 'Packing Can I Use data',
    task: () => exec('node', ['src/packer/index.js'])
  },
  {
    title: 'Running tests',
    task: () => exec('npx', ['jest'])
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
