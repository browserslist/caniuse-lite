const { execSync } = require('child_process')
const git = require('gift')

const runTasks = require('./src/lib/runTasks')
const pkg = require('./package.json')

const repo = git(__dirname)

const version = pkg.devDependencies['caniuse-db']

runTasks([
  {
    title: 'Copying unpacker',
    task: () => execSync('yarn run prepublish', { stdio: 'inherit' })
  },
  {
    title: 'Packing Can I Use data',
    task: () => execSync('node src/packer/index.js', { stdio: 'inherit' })
  },
  {
    title: 'Running tests',
    task: () => execSync('npx jest', { stdio: 'inherit' })
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
    task: () => execSync('npm version ' + version, { stdio: 'inherit' })
  },
  {
    title: 'Publishing to npm',
    task: () => {
      let out = execSync('npx clean-publish')
      process.stdout.write(out.toString())
      if (out.toString().includes('npm ERR!')) {
        throw new Error('npm error')
      }
    }
  },
  {
    title: 'Syncing repo & tags to GitHub',
    task: () => execSync('git push --follow-tags', { stdio: 'inherit' })
  }
])
