const { test } = require('uvu')
const { equal } = require('uvu/assert')
const path = require('path')
const fs = require('fs').promises

const getContentsFactory = require('./lib/getContents')
const regions = require('../dist/unpacker/region')

let fulldata = {}

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

const getContents = getContentsFactory(base)

test.before(() => {
  return fs
    .readdir(base)
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
    let packed = require(path.join(__dirname, `../data/regions/${key}.js`))
    let unpacked = regions(packed)
    equal(unpacked, data.data)
  })
})

test.run()
