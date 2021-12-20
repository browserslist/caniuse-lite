const path = require('path')
const fs = require('fs').promises
const t = require('@babel/types')

const generateCode = require('../lib/generateCode')
const getContentsFactory = require('../lib/getContents')
const moduleExports = require('../lib/moduleExports')
const stringifyObject = require('../lib/stringifyObject')
const statuses = require('../../dist/lib/statuses')
const supported = require('../../dist/lib/supported')
const fromEntries = require('../util/fromEntries')
const invertObj = require('../util/invertObj')
const parseDecimal = require('../util/parseDecimal')
const sum = require('../util/sum')
const browsers = require('../../data/browsers')
const versions = require('../../data/browserVersions')

const browsersInverted = invertObj(browsers)
const statusesInverted = invertObj(statuses)
const versionsInverted = invertObj(versions)

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

const getContents = getContentsFactory(base)

const requireCall = moduleName =>
  t.callExpression(t.identifier('require'), [t.stringLiteral(moduleName)])

function featureIndex(features) {
  let index = t.objectExpression(
    features.map(({ name }) =>
      t.objectProperty(t.stringLiteral(name), requireCall(`./features/${name}`))
    )
  )

  return generateCode([moduleExports(index)])
}

function packSupport(supportData) {
  return sum(
    supportData.split(' ').map(support => {
      if (support in supported) {
        return supported[support]
      }
      return 2 ** (6 + parseDecimal(support.slice(1)))
    })
  )
}

module.exports = async function packFeature() {
  let features = await fs.readdir(base).then(getContents)

  await Promise.all(
    features.map(({ name, contents }) => {
      let packed = {}

      packed.A = fromEntries(
        Object.entries(contents.stats).map(([key, browser]) => {
          let supportData = fromEntries(
            Object.entries(browser).map(([version, support]) => [
              versionsInverted[version],
              packSupport(support)
            ])
          )

          let compacted = Object.entries(supportData).reduce(
            (min, [k, value]) => {
              if (!min[value]) {
                min[value] = k
              } else {
                min[value] += ` ${k}`
              }
              return min
            },
            {}
          )

          return [browsersInverted[key], compacted]
        })
      )
      packed.B = parseDecimal(statusesInverted[contents.status])
      packed.C = contents.title
      return fs.writeFile(
        path.join(__dirname, `../../data/features/${name}.js`),
        stringifyObject(packed)
      )
    })
  )

  return fs.writeFile(
    path.join(__dirname, '../../data/features.js'),
    featureIndex(features)
  )
}
