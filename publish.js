const { spawn } = require('child_process')
const git = require('gift')

const runTasks = require('./src/lib/runTasks')
const pkg = require('./package.json')

const repo = git(__dirname)

const version = pkg.devDependencies['caniuse-db']

async function exec(cmd, args) {
  await new Promise((resolve, reject) => {
    let execution = spawn(cmd, args, {
      env: process.env,
      maxBuffer: 20 * 1024 * 1024
    })

    let output = ''
    execution.stdout.on('data', data => {
      process.stdout.write(data)
      output += data.toString()
    })
    execution.stderr.on('data', data => {
      process.stderr.write(data)
      output += data.toString()
    })

    execution.on('exit', code => {
      if (code === 0) {
        if (output.includes('npm ERR!')) {
          reject(Error('npm error'))
        } else {
          resolve()
        }
      } else {
        process.stderr.write(output)
        reject(new Error('Exit code ' + code))
      }
    })
  })
}

runTasks([
  {
    title: 'Copying unpacker',
    task: () => exec('yarn', ['run', 'prepublish'])
  },
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
    task: () =>
      new Promise((resolve, reject) => {
        repo.commit(`Update caniuse-db to ${version}`, err => {
          if (err) {
            return reject(err)
          }
          return resolve()
        })
      })
  },
  {
    title: 'Updating version',
    task: () => exec('npm', ['version', version])
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
