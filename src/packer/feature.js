const path = require('path')
const fs = require('fs').promises
const t = require('@babel/types')
const R = require('ramda')

const generateCode = require('../lib/generateCode')
const getContentsFactory = require('../lib/getContents')
const moduleExports = require('../lib/moduleExports')
const stringifyObject = require('../lib/stringifyObject')
const statuses = require('../../dist/lib/statuses')
const supported = require('../../dist/lib/supported')
const parseDecimal = require('../util/parseDecimal')
const browsers = require('../../data/browsers')
const versions = require('../../data/browserVersions')

const browsersInverted = R.invertObj(browsers)
const statusesInverted = R.invertObj(statuses)
const versionsInverted = R.invertObj(versions)

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

const getContents = getContentsFactory(base)

const callExpression = R.curryN(2, t.callExpression)

const requireCall = R.compose(
  callExpression(t.identifier('require')),
  R.of,
  t.stringLiteral
)

const featureIndex = R.compose(
  generateCode,
  t.program,
  R.of,
  moduleExports,
  t.objectExpression,
  R.map(({ name }) =>
    t.objectProperty(t.stringLiteral(name), requireCall(`./features/${name}`))
  )
)

const packSupport = R.compose(
  R.sum,
  R.map(
    R.ifElse(
      R.flip(R.has)(supported),
      R.flip(R.prop)(supported),
      R.compose(num => 2 ** num, R.add(6), parseDecimal, R.slice(1, Infinity))
    )
  ),
  R.split(' ')
)

module.exports = function packFeature() {
  return fs
    .readdir(base)
    .then(getContents)
    .then(
      R.tap(features =>
        Promise.all(
          features.map(feature => {
            let { name, contents } = feature
            let packed = {}
            packed.A = Object.keys(contents.stats).reduce(
              (browserStats, key) => {
                let browser = contents.stats[key]
                let supportData = Object.keys(browser).reduce(
                  (stats, version) => {
                    let support = browser[version]
                    stats[versionsInverted[version]] = packSupport(support)
                    return stats
                  },
                  {}
                )
                let compacted = Object.keys(supportData).reduce((min, k) => {
                  let value = supportData[k]
                  if (!min[value]) {
                    min[value] = k
                  } else {
                    min[value] += ` ${k}`
                  }
                  return min
                }, {})
                browserStats[browsersInverted[key]] = compacted
                return browserStats
              },
              {}
            )
            packed.B = parseDecimal(statusesInverted[contents.status])
            packed.C = contents.title
            return fs.writeFile(
              path.join(__dirname, `../../data/features/${name}.js`),
              stringifyObject(packed)
            )
          })
        )
      )
    )
    .then(features =>
      fs.writeFile(
        path.join(__dirname, '../../data/features.js'),
        featureIndex(features)
      )
    )
}
