const { test } = require('uvu')
const { type } = require('uvu/assert')

const lite = require('../dist/unpacker/index')

test('should have the appropriate keys', () => {
  type(lite.agents, 'object')
  type(lite.feature, 'function')
  type(lite.features, 'object')
  type(lite.region, 'function')
})

test.run()
