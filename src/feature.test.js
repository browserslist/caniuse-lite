const { test } = require('uvu')
const { equal, ok } = require('uvu/assert')
const path = require('path')
const fs = require('fs').promises

const getContentsFactory = require('./lib/getContents')
const features = require('../dist/unpacker/feature')

let fulldata = {}

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

const getContents = getContentsFactory(base)

test.before(() => {
  return fs
    .readdir(base)
    .then(getContents)
    .then(features2 => {
      features2.forEach(feature => {
        fulldata[feature.name] = feature.contents
      })
    })
})

test('should be 1:1', () => {
  Object.keys(fulldata).forEach(key => {
    let data = fulldata[key]
    let packed = require(path.join(__dirname, `../data/features/${key}.js`))
    let unpacked = features(packed)
    equal(Object.keys(unpacked.stats), Object.keys(data.stats))
    Object.keys(unpacked.stats).forEach(browser => {
      Object.keys(unpacked.stats[browser]).forEach(version => {
        let unpackedSupport = unpacked.stats[browser][version].split(' ')
        let originalSupport = data.stats[browser][version].split(' ')
        unpackedSupport.forEach(value => {
          ok(originalSupport.includes(value))
        })
      })
    })
    equal(unpacked.status, data.status)
    equal(unpacked.title, data.title)
  })
})

test.run()
