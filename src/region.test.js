let { join, dirname } = require('node:path')
let { readdir } = require('node:fs').promises
let { test } = require('uvu')
let { equal } = require('uvu/assert')

let regions = require('../dist/unpacker/region')
let getContentsFactory = require('./lib/getContents')

let fulldata = {}

let base = join(
  dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

let getContents = getContentsFactory(base)

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
