let path = require('node:path')
let fs = require('node:fs').promises
let t = require('@babel/types')

let browsers = require('../../data/browsers')
let versions = require('../../data/browserVersions')
let statuses = require('../../dist/lib/statuses')
let supported = require('../../dist/lib/supported')
let { encode } = require('../lib/base62.js')
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

const MIN_PAIR = 4
const MAX_GROUPS = 8000
const PAIR_RADIX = 0x1000000

function buildGroups(sequences) {
  let tokenToId = new Map()
  let literals = [] // id -> literal version-key (or undefined for a rule)
  let seqs = sequences.map(tokens => tokens.map(token => {
    let id = tokenToId.get(token)
    if (id === undefined) {
      id = literals.length
      literals.push(token)
      tokenToId.set(token, id)
    }
    return id
  }))
  let groupParts = [] // id -> [left, right]

  while (groupParts.length < MAX_GROUPS) {
    // These are pairs of IDs. e.g. [1, 2, 3, 4] represents the pairs (1, 2) and (3, 4).
    // Their values are the number of times they occur in the sequences.
    // Map<Pair, Count>
    let pairs = new Map()
    let best = -1
    let bestCount = MIN_PAIR - 1
    for (let seq of seqs) {
      for (let i = 0; i + 1 < seq.length; i++) {
        let pair = seq[i] * PAIR_RADIX + seq[i + 1]
        let count = (pairs.get(pair) || 0) + 1
        pairs.set(pair, count)
        if (count > bestCount || (count === bestCount && pair < best)) {
          bestCount = count
          best = pair
        }
      }
    }
    if (best < 0) break

    let left = Math.floor(best / PAIR_RADIX)
    let right = best % PAIR_RADIX
    let id = literals.length
    literals.push(undefined)
    groupParts[id] = [left, right]

    // Replace all occurrences of the best pair with the new rule ID.
    for (let seq of seqs) {
      let write = 0
      for (let i = 0; i < seq.length; i++) {
        if (i + 1 < seq.length && seq[i] === left && seq[i + 1] === right) {
          seq[write++] = id
          i++
        } else {
          seq[write++] = seq[i]
        }
      }
      // Discard the tail of the sequence that has been overwritten.
      seq.length = write
    }
  }

  // Keep only rules that survive in the output (directly or via other rules),
  // and hand the most-used ones the shortest keys.
  let usedLiterals = Array.from({ length: literals.length }, () => 0)
  for (let seq of seqs) {
    for (let id of seq) {
      usedLiterals[id]++
    }
  }
  for (let id = literals.length - 1; id >= 0; id--) {
    if (groupParts[id] && usedLiterals[id]) {
      usedLiterals[groupParts[id][0]]++
      usedLiterals[groupParts[id][1]]++
    }
  }
  let kept = [...literals.keys()]
    .filter(id => groupParts[id] && usedLiterals[id])
    .toSorted((a, b) => usedLiterals[b] - usedLiterals[a] || a - b)
  let keyOf = Array.from({ length: literals.length })
  kept.forEach((id, index) => {
    keyOf[id] = encode(index)
  })

  let symbol = id => (groupParts[id] ? `_${keyOf[id]}` : literals[id])
  let groups = {}
  for (let id of kept) {
    let [left, right] = groupParts[id]
    groups[keyOf[id]] = `${symbol(left)} ${symbol(right)}`
  }
  let encoded = seqs.map(seq => seq.map(symbol).join(' '))
  return { groups, encoded }
}

module.exports = async function packFeature() {
  let features = await fs.readdir(base).then(getContents)

  let cells = []
  let packedFeatures = features.map(({ name, contents }) => {
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

        for (let support of Object.keys(compacted)) {
          cells.push({ list: compacted, support })
        }

        return [browsersInverted[key], compacted]
      })
    )
    packed.B = parseDecimal(statusesInverted[contents.status])
    packed.C = contents.title
    packed.D = contents.shown
    return { name, packed }
  })

  let { groups, encoded } = buildGroups(
    cells.map(cell => cell.list[cell.support].split(' '))
  )
  cells.forEach((cell, index) => {
    cell.list[cell.support] = encoded[index]
  })

  await Promise.all(
    packedFeatures.map(({ name, packed }) =>
      fs.writeFile(
        path.join(__dirname, `../../data/features/${name}.js`),
        stringifyObject(packed)
      )
    )
  )

  await fs.writeFile(
    path.join(__dirname, '../../data/versionGroups.js'),
    stringifyObject(groups)
  )

  return fs.writeFile(
    path.join(__dirname, '../../data/features.js'),
    featureIndex(features)
  )
}
