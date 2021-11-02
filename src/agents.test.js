const { test } = require('uvu')
const { equal } = require('uvu/assert')

const { agents } = require('../dist/unpacker/agents')

test('should be 1:1', () => {
  let fulldata = require('caniuse-db/data.json').agents
  Object.keys(agents).forEach(key => {
    let data = agents[key]
    equal(data.usage_global, fulldata[key].usage_global)
    equal(data.prefix, fulldata[key].prefix)
    equal(data.versions, fulldata[key].versions)
    equal(data.prefix_exceptions, fulldata[key].prefix_exceptions)
    equal(data.browser, fulldata[key].browser)
  })
})

test('should properly process release dates', () => {
  let fulldata = require('caniuse-db/fulldata-json/data-2.0.json')
  Object.keys(agents).forEach(key => {
    let data = agents[key]
    fulldata.agents[key].version_list.forEach(({ version, release_date }) => {
      equal(data.release_date[version], release_date)
    })
  })
})

test.run()
