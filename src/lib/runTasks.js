async function run(tasks) {
  let ctx = {}
  for (let task of tasks) {
    if (!task.enabled || task.enabled(ctx)) {
      process.stdout.write(task.title + '\n')
      await task.task(ctx, task)
    }
  }
}

module.exports = function runTasks(tasks) {
  run(tasks).catch(err => {
    if (typeof err === 'string') {
      process.stderr.write(err + '\n')
    } else {
      process.stderr.write(err.stack + '\n')
    }
    process.exit(1)
  })
}
