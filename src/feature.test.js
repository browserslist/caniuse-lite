const path = require('path')
const fs = require('fs').promises

const getContentsFactory = require('./lib/getContents')
const features = require('./unpacker/feature')

let fulldata = {}

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

const getContents = getContentsFactory(base)

beforeAll(() => {
  return fs
    .readdir(base)
    .then(getContents)
    .then(features2 => {
      features2.forEach(feature => {
        fulldata[feature.name] = feature.contents
      })
    })
})

it('should be 1:1', () => {
  Object.keys(fulldata).forEach(key => {
    let data = fulldata[key]
    let packed = require(path.join(__dirname, `../data/features/${key}.js`))
    let unpacked = features(packed)
    expect(Object.keys(unpacked.stats)).toEqual(Object.keys(data.stats))
    Object.keys(unpacked.stats).forEach(browser => {
      Object.keys(unpacked.stats[browser]).forEach(version => {
        let unpackedSupport = unpacked.stats[browser][version].split(' ')
        let originalSupport = data.stats[browser][version].split(' ')
        unpackedSupport.forEach(value => {
          expect(originalSupport).toContain(value)
        })
      })
    })
    expect(unpacked.status).toEqual(data.status)
    expect(unpacked.title).toEqual(data.title)
  })
})
