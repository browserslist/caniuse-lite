import Listr from 'listr'

import packBrowsers from './browsers'

/* Subsequent tasks need to be lazily loaded as the generator order matters,
   and the files are destroyed/re-created on each packing step. */

const tasks = new Listr([
  {
    title: 'Browsers - Mangle application name',
    task: packBrowsers
  },
  {
    title: 'Browsers - Mangle version naming & agents usage',
    task: () => require('./agents').default()
  },
  {
    title: 'Features - Mangle support data',
    task: () => require('./feature').default()
  },
  {
    title: 'Regional - Mangle browser usage data',
    task: () => require('./region').default()
  }
])

tasks.run().catch(err => console.error(err))
