let { join, dirname } = require('node:path')
let { equal, ok } = require('uvu/assert')
let { readdir } = require('node:fs').promises
let { test } = require('uvu')

let features = require('../dist/unpacker/feature')
let getContentsFactory = require('./lib/getContents')

let fulldata = {}

let base = join(
  dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

let getContents = getContentsFactory(base)

test.before(() => {
  return readdir(base)
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
    let packed = require(join(__dirname, `../data/features/${key}.js`))
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
    equal(unpacked.shown, data.shown)
  })
})

test('should unpack features with another set of browsers', () => {
  let packed = require('../data/features/css-autofill.js')
  equal(typeof packed.A, 'object')
  equal(
    Object.keys(features(packed).stats),
    Object.keys(fulldata['css-autofill'].stats)
  )
})

test('should unpack browsers with another set of versions', () => {
  let unpacked = features({
    A: { A: { 1: '11 TP', 2: '9', 164: '10' }, H: ' ' },
    B: 6,
    C: 'Test',
    D: true
  })
  equal(unpacked, {
    status: 'other',
    title: 'Test',
    shown: true,
    stats: {
      ie: { '9': 'n', '10': 'a x #1', '11': 'y', 'TP': 'y' },
      op_mini: { all: 'y' }
    }
  })
})

test.run()
