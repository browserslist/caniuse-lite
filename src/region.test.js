const { join, dirname } = require('path')
const { readdir } = require('fs').promises
const { equal } = require('uvu/assert')
const { test } = require('uvu')

const getContentsFactory = require('./lib/getContents')
const regions = require('../dist/unpacker/region')

let fulldata = {}

const base = join(
  dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

const getContents = getContentsFactory(base)

test.before(() => {
  return readdir(base)
    .then(getContents)
    .then(regions2 => {
      regions2.forEach(region => {
        fulldata[region.name] = region.contents
      })
    })
})

test('should be 1:1', () => {
  Object.keys(fulldata).forEach(key => {
    let data = fulldata[key]
    let packed = require(join(__dirname, `../data/regions/${key}.js`))
    let unpacked = regions(packed)
    equal(unpacked, data.data)
  })
})

test.run()
