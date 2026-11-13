let { test } = require('uvu')
let { equal, not, ok, throws } = require('uvu/assert')

let browsers = require('../../data/browsers')
let featureSupport = require('../../data/featureSupport')
let { agents } = require('../../dist/unpacker/agents')
let unpackFeature = require('../../dist/unpacker/feature')
let char = require('../lib/tokenChar')
let fromEntries = require('../util/fromEntries')
let invertObj = require('../util/invertObj')
let {
  checkFeature,
  countSupportValues,
  getRuns,
  hasAgentVersions,
  packExplicit,
  packLength,
  packRuns,
  packStats,
  packSupport
} = require('./feature')

const RARE = 35
const LENGTH = 38

let browserKeys = invertObj(browsers)
let alphabet = Array.from({ length: 93 }, (_, index) => char(index))

function tokens(packed) {
  return packed.split('').map(character => alphabet.indexOf(character))
}

function getVersions(browser) {
  return agents[browser].versions.filter(Boolean)
}

// Creates browser stats in the way they are prepared for packing
function createStats(names, getSupport) {
  return names.map(browser => {
    let versions = getVersions(browser)
    let support = fromEntries(
      versions.map((version, index) => [version, getSupport(browser, index)])
    )
    return { browser, support, runs: getRuns(versions, support) }
  })
}

// Checks that the unpacker reads the same support and returns packed stats
function roundTrip(stats, supportValues = featureSupport) {
  let packed = packStats(stats, supportValues)
  let unpacked = unpackFeature({ A: packed, B: 1, C: 'Test', D: true })
  equal(
    Object.keys(unpacked.stats),
    stats.map(({ browser }) => browser)
  )
  for (let { browser, support } of stats) {
    equal(
      fromEntries(
        Object.entries(unpacked.stats[browser]).map(([version, value]) => [
          version,
          packSupport(value)
        ])
      ),
      support
    )
  }
  return packed
}

function createContents() {
  return {
    status: 'cr',
    title: 'Test',
    shown: true,
    stats: {
      ie: { 10: 'a x #1', 11: 'y' },
      edge: { 12: 'n' }
    }
  }
}

test('should pack support flags to bits', () => {
  equal(packSupport('y'), 1)
  equal(packSupport('n'), 2)
  equal(packSupport('a'), 4)
  equal(packSupport('p'), 8)
  equal(packSupport('u'), 16)
  equal(packSupport('x'), 32)
  equal(packSupport('d'), 64)
  equal(packSupport('y x'), 33)
  equal(packSupport('x y'), 33)
})

test('should pack support notes to bits', () => {
  equal(packSupport('y #1'), 129)
  equal(packSupport('a x #1'), 164)
  equal(packSupport('n #2 #4'), 2 + 256 + 1024)
  equal(packSupport('a #12'), 4 + 2 ** 18)
})

test('should find versions in a row with the same support', () => {
  equal(getRuns([], {}), [])
  equal(getRuns(['1', '2', '3', '4', '5'], { 1: 2, 2: 2, 3: 1, 4: 2, 5: 2 }), [
    { support: 2, length: 2 },
    { support: 1, length: 1 },
    { support: 2, length: 2 }
  ])
  // Versions are taken in the order of agent versions
  equal(getRuns(['3.5', '2', '3'], { 2: 1, 3: 2, 3.5: 1 }), [
    { support: 1, length: 2 },
    { support: 2, length: 1 }
  ])
})

test('should detect browsers with the same versions as in agents', () => {
  let versions = getVersions('firefox')
  let support = fromEntries(versions.map(version => [version, 1]))
  ok(hasAgentVersions('firefox', support))

  // Versions like 3.5 are kept in the order of the source
  let reversed = fromEntries(Object.entries(support).toReversed())
  ok(!hasAgentVersions('firefox', reversed))

  let { [versions[0]]: first, ...withoutVersion } = support
  equal(first, 1)
  ok(!hasAgentVersions('firefox', withoutVersion))
  ok(!hasAgentVersions('firefox', { ...support, 9999: 1 }))
  ok(!hasAgentVersions('firefox', {}))
  ok(!hasAgentVersions('unknown', support))
})

test('should pack length without zero digit', () => {
  equal(packLength(0), '')
  equal(tokens(packLength(1)), [LENGTH])
  equal(tokens(packLength(2)), [LENGTH + 1])
  equal(tokens(packLength(55)), [92])
  equal(tokens(packLength(56)), [LENGTH, LENGTH])
  equal(tokens(packLength(110)), [LENGTH, 92])
  equal(tokens(packLength(111)), [LENGTH + 1, LENGTH])
  equal(tokens(packLength(55 * 55 + 55)), [92, 92])
  equal(tokens(packLength(55 * 55 + 56)), [LENGTH, LENGTH, LENGTH])
})

test('should pack runs as support position and length', () => {
  let supportValues = [1, 2, 132]
  let runs = [
    { support: 2, length: 3 },
    { support: 132, length: 60 },
    { support: 1, length: 1 },
    { support: 2, length: 7 }
  ]
  equal(tokens(packRuns(runs, supportValues)), [
    1,
    LENGTH + 2,
    2,
    LENGTH,
    LENGTH + 4,
    0,
    LENGTH,
    // The last run has no length
    1
  ])
  equal(tokens(packRuns([{ support: 132, length: 100 }], supportValues)), [2])
  equal(packRuns([], supportValues), '')
})

test('should pack rare support by 2 tokens', () => {
  // Value is the same as its position
  let supportValues = Array.from({ length: 314 }, (_, index) => index)
  let pack = support => {
    return tokens(
      packRuns(
        [
          { support, length: 2 },
          { support: 0, length: 1 }
        ],
        supportValues
      )
    )
  }
  equal(pack(34), [34, LENGTH + 1, 0])
  equal(pack(35), [RARE, 0, LENGTH + 1, 0])
  equal(pack(36), [RARE, 1, LENGTH + 1, 0])
  equal(pack(127), [RARE, 92, LENGTH + 1, 0])
  equal(pack(128), [RARE + 1, 0, LENGTH + 1, 0])
  equal(pack(313), [RARE + 2, 92, LENGTH + 1, 0])
})

test('should pack versions by support for explicit format', () => {
  equal(packExplicit({ 9: 2, 10: 164, 11: 1, TP: 1 }), {
    1: '11 TP',
    2: '9',
    164: '10'
  })
  equal(packExplicit({}), {})
})

test('should sort support values by popularity', () => {
  let features = [
    {
      stats: [
        { runs: [{ support: 4 }, { support: 2 }, { support: 4 }] },
        // Browser in explicit format
        { support: { 1: 8 } }
      ]
    },
    // Values with the same popularity are sorted by number
    { stats: [{ runs: [{ support: 260 }, { support: 2 }, { support: 1 }] }] },
    { stats: [{ runs: [{ support: 2 }] }, { runs: [] }] }
  ]
  equal(countSupportValues(features), [2, 4, 1, 260])
  equal(countSupportValues([]), [])
})

test('should pack all browsers to a string', () => {
  let stats = createStats(Object.values(browsers), (browser, index) => {
    return featureSupport[index % 3]
  })
  let packed = roundTrip(stats)
  equal(typeof packed, 'string')
  equal(
    packed,
    stats.map(({ runs }) => packRuns(runs, featureSupport)).join('')
  )
})

test('should pack browsers with the same support in all versions', () => {
  let stats = createStats(Object.values(browsers), () => featureSupport[0])
  equal(
    tokens(roundTrip(stats)),
    stats.map(() => 0)
  )
})

test('should pack long runs and rare support', () => {
  let rare = [featureSupport[RARE], featureSupport[featureSupport.length - 1]]
  let stats = createStats(Object.values(browsers), (browser, index) => {
    if (index < 3) return rare[0]
    if (index < 60) return featureSupport[1]
    if (index < 61) return rare[1]
    return featureSupport[0]
  })
  let packed = roundTrip(stats)
  equal(typeof packed, 'string')
  ok(tokens(packed).includes(RARE))
})

test('should keep browser names for another set of browsers', () => {
  let names = Object.values(browsers)
  let getSupport = (browser, index) => featureSupport[index % 2]

  let without = names.filter(browser => browser !== 'edge')
  let packed = roundTrip(createStats(without, getSupport))
  equal(
    Object.keys(packed),
    without.map(browser => browserKeys[browser])
  )
  ok(Object.values(packed).every(value => typeof value === 'string'))

  let reversed = roundTrip(createStats(names.toReversed(), getSupport))
  equal(typeof reversed, 'object')

  let single = roundTrip(createStats(['chrome'], getSupport))
  equal(Object.keys(single), [browserKeys.chrome])
})

test('should pack browsers with another set of versions explicitly', () => {
  let stats = createStats(Object.values(browsers), () => featureSupport[0])
  let edge = stats.findIndex(({ browser }) => browser === 'edge')
  stats[edge] = { browser: 'edge', support: { 12: 2, 13: 1, 9999: 1 } }
  let packed = roundTrip(stats)
  equal(packed[browserKeys.edge], { 1: '13 9999', 2: '12' })
  equal(packed[browserKeys.ie], char(0))
  equal(Object.keys(packed).length, stats.length)
})

test('should pack unknown support explicitly', () => {
  let supportValues = featureSupport.slice(0, 2)
  let [unknown] = featureSupport.slice(2)
  let stats = createStats(['ie', 'edge'], (browser, index) => {
    return browser === 'ie' && index === 0 ? unknown : supportValues[1]
  })
  let packed = roundTrip(stats, supportValues)
  equal(packed[browserKeys.ie], packExplicit(stats[0].support))
  equal(packed[browserKeys.edge], char(1))
})

test('should accept the same feature after unpacking', () => {
  let contents = createContents()
  not.throws(() => checkFeature('test', createContents(), contents))

  // Flags could be in a different order
  let unpacked = createContents()
  unpacked.stats.ie[10] = 'x a #1'
  not.throws(() => checkFeature('test', unpacked, contents))
})

test('should throw on changes after unpacking', () => {
  let contents = createContents()
  let check = change => {
    let unpacked = createContents()
    change(unpacked)
    throws(
      () => checkFeature('test', unpacked, contents),
      'Feature test was packed with a mistake'
    )
  }

  check(unpacked => {
    unpacked.status = 'wd'
  })
  check(unpacked => {
    unpacked.title = 'Another'
  })
  check(unpacked => {
    unpacked.shown = false
  })
  check(unpacked => {
    unpacked.stats.ie[11] = 'n'
  })
  check(unpacked => {
    unpacked.stats.ie[10] = 'a x'
  })
  check(unpacked => {
    delete unpacked.stats.ie[11]
  })
  check(unpacked => {
    unpacked.stats.ie[9] = 'n'
  })
  check(unpacked => {
    unpacked.stats = { edge: unpacked.stats.edge, ie: unpacked.stats.ie }
  })
  check(unpacked => {
    unpacked.stats.firefox = { 2: 'n' }
  })
  check(unpacked => {
    unpacked.stats.ie = { 10: 'a x #1', 12: 'y' }
  })
})

test.run()
