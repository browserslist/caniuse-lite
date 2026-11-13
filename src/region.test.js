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

test('should unpack regions stored as objects', () => {
  equal(regions({ C: { '115': 0.5, _: '2 3.6', '3.5': 0 }, H: { all: 0 } }), {
    firefox: { '2': null, '115': 0.5, '3.6': null, '3.5': 0 },
    op_mini: { all: 0 }
  })
})

test.run()
