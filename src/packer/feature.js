let path = require('node:path')
let fs = require('node:fs').promises
let t = require('@babel/types')

let browsers = require('../../data/browsers')
let statuses = require('../../dist/lib/statuses')
let supported = require('../../dist/lib/supported')
let { agents } = require('../../dist/unpacker/agents')
let generateCode = require('../lib/generateCode')
let getContentsFactory = require('../lib/getContents')
let moduleExports = require('../lib/moduleExports')
let stringifyObject = require('../lib/stringifyObject')
let char = require('../lib/tokenChar')
let fromEntries = require('../util/fromEntries')
let invertObj = require('../util/invertObj')
let parseDecimal = require('../util/parseDecimal')
let sum = require('../util/sum')

let browsersInverted = invertObj(browsers)
let statusesInverted = invertObj(statuses)

let base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

let getContents = getContentsFactory(base)

// The token alphabet. Keep in sync with dist/unpacker/feature.js
const TOKENS = 93
const POPULAR = 35
const LENGTH = 38
const LENGTH_BASE = 55
const MAX_SUPPORT_VALUES = POPULAR + (LENGTH - POPULAR) * TOKENS

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

/* Support rarely changes between versions, so for agent versions we keep
   only the support and the number of versions in a row which have it. */
function getRuns(versions, support) {
  let runs = []
  for (let version of versions) {
    let last = runs[runs.length - 1]
    if (last && last.support === support[version]) {
      last.length++
    } else {
      runs.push({ support: support[version], length: 1 })
    }
  }
  return runs
}

function hasAgentVersions(browser, support) {
  if (!agents[browser]) return false
  let versions = agents[browser].versions.filter(Boolean)
  // Object.keys() to compare versions in the order used by JS objects
  let keys = Object.keys(fromEntries(versions.map(version => [version, 1])))
  return JSON.stringify(Object.keys(support)) === JSON.stringify(keys)
}

function packLength(length) {
  let result = ''
  while (length > 0) {
    let digit = (length - 1) % LENGTH_BASE
    result = char(LENGTH + digit) + result
    length = (length - 1 - digit) / LENGTH_BASE
  }
  return result
}

function packRuns(runs, supportValues) {
  return runs
    .map((run, index) => {
      let position = supportValues.indexOf(run.support)
      let result
      if (position < POPULAR) {
        result = char(position)
      } else {
        let rare = position - POPULAR
        result = char(POPULAR + Math.floor(rare / TOKENS)) + char(rare % TOKENS)
      }
      // Last value is used until the last version
      if (index < runs.length - 1) result += packLength(run.length)
      return result
    })
    .join('')
}

function packExplicit(support) {
  return Object.entries(support).reduce((min, [version, value]) => {
    if (!min[value]) {
      min[value] = version
    } else {
      min[value] += ` ${version}`
    }
    return min
  }, {})
}

function packStats(stats, supportValues) {
  let packed = fromEntries(
    stats.map(({ browser, support, runs }) => {
      let isPackable =
        runs &&
        runs.every(run => {
          let position = supportValues.indexOf(run.support)
          return position !== -1 && position < MAX_SUPPORT_VALUES
        })
      return [
        browsersInverted[browser],
        isPackable ? packRuns(runs, supportValues) : packExplicit(support)
      ]
    })
  )
  // Most of the features have all browsers, so we can avoid browser keys
  let values = Object.values(packed)
  let isAllBrowsers =
    Object.keys(packed).join() === Object.keys(browsers).join() &&
    values.every(value => typeof value === 'string')
  return isAllBrowsers ? values.join('') : packed
}

function countSupportValues(features) {
  let counts = new Map()
  for (let { stats } of features) {
    for (let { runs } of stats) {
      for (let run of runs || []) {
        counts.set(run.support, (counts.get(run.support) || 0) + 1)
      }
    }
  }
  // The most popular values will have the shortest token
  return [...counts.keys()].toSorted(
    (a, b) => counts.get(b) - counts.get(a) || a - b
  )
}

function checkFeature(name, unpacked, contents) {
  let isSame =
    unpacked.status === contents.status &&
    unpacked.title === contents.title &&
    unpacked.shown === contents.shown &&
    JSON.stringify(Object.keys(unpacked.stats)) ===
      JSON.stringify(Object.keys(contents.stats)) &&
    Object.entries(contents.stats).every(([browser, support]) => {
      let versions = Object.keys(support)
      return (
        versions.length === Object.keys(unpacked.stats[browser]).length &&
        versions.every(
          version =>
            typeof unpacked.stats[browser][version] === 'string' &&
            packSupport(unpacked.stats[browser][version]) ===
              packSupport(support[version])
        )
      )
    })
  if (!isSame) {
    throw new Error(`Feature ${name} was packed with a mistake`)
  }
}

module.exports = async function packFeature() {
  let features = await fs.readdir(base).then(getContents)

  let parsed = features.map(({ name, contents }) => ({
    name,
    contents,
    stats: Object.entries(contents.stats).map(([browser, browserSupport]) => {
      let support = fromEntries(
        Object.entries(browserSupport).map(([version, value]) => [
          version,
          packSupport(value)
        ])
      )
      let runs
      if (hasAgentVersions(browser, support)) {
        runs = getRuns(agents[browser].versions.filter(Boolean), support)
      }
      return { browser, support, runs }
    })
  }))

  let supportValues = countSupportValues(parsed)
  await fs.writeFile(
    path.join(__dirname, '../../data/featureSupport.js'),
    stringifyObject(supportValues)
  )

  // Unpacker needs the file above
  let unpackFeature = require('../../dist/unpacker/feature')

  await Promise.all(
    parsed.map(({ name, contents, stats }) => {
      let packed = {
        A: packStats(stats, supportValues),
        B: parseDecimal(statusesInverted[contents.status]),
        C: contents.title,
        D: contents.shown
      }
      checkFeature(name, unpackFeature(packed), contents)

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

// For tests
module.exports.checkFeature = checkFeature
module.exports.countSupportValues = countSupportValues
module.exports.getRuns = getRuns
module.exports.hasAgentVersions = hasAgentVersions
module.exports.packExplicit = packExplicit
module.exports.packLength = packLength
module.exports.packRuns = packRuns
module.exports.packStats = packStats
module.exports.packSupport = packSupport
