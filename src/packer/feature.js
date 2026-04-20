let path = require('node:path')
let fs = require('node:fs').promises
let t = require('@babel/types')

let browsers = require('../../data/browsers')
let versions = require('../../data/browserVersions')
let statuses = require('../../dist/lib/statuses')
let supported = require('../../dist/lib/supported')
let generateCode = require('../lib/generateCode')
let getContentsFactory = require('../lib/getContents')
let moduleExports = require('../lib/moduleExports')
let stringifyObject = require('../lib/stringifyObject')
let fromEntries = require('../util/fromEntries')
let invertObj = require('../util/invertObj')
let parseDecimal = require('../util/parseDecimal')
let sum = require('../util/sum')

let browsersInverted = invertObj(browsers)
let statusesInverted = invertObj(statuses)
let versionsInverted = invertObj(versions)

let base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

let getContents = getContentsFactory(base)

let requireCall = moduleName =>
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
      packed.D = contents.shown
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
