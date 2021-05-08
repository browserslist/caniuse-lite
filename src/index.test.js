const lite = require('../dist/unpacker/index')

it('should have the appropriate keys', () => {
  expect(lite.agents).toBeDefined()
  expect(lite.feature).toBeDefined()
  expect(lite.features).toBeDefined()
  expect(lite.region).toBeDefined()
})
