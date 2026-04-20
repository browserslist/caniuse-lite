let { test } = require('uvu')
let { type } = require('uvu/assert')

let lite = require('../dist/unpacker/index')

test('should have the appropriate keys', () => {
  type(lite.agents, 'object')
  type(lite.feature, 'function')
  type(lite.features, 'object')
  type(lite.region, 'function')
})

test.run()
