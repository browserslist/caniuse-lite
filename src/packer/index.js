const path = require('node:path')
const fs = require('node:fs').promises

const runTasks = require('../lib/runTasks')
const packBrowsers = require('./browsers')

/* Subsequent tasks need to be lazily loaded as the generator order matters,
   and the files are destroyed/re-created on each packing step. */

runTasks([
  {
    title: 'Create folders',
    async task() {
      await fs.mkdir(path.join(__dirname, '..', '..', 'data', 'features'), {
        recursive: true
      })
      await fs.mkdir(path.join(__dirname, '..', '..', 'data', 'regions'), {
        recursive: true
      })
    }
  },
  {
    title: 'Browsers - Mangle application name',
    task: packBrowsers
  },
  {
    title: 'Browsers - Mangle version naming & agents usage',
    task: () => require('./agents')()
  },
  {
    title: 'Features - Mangle support data',
    task: () => require('./feature')()
  },
  {
    title: 'Regional - Mangle browser usage data',
    task: () => require('./region')()
  }
])
