let { test } = require('uvu')
let { equal, ok } = require('uvu/assert')

let browsers = require('../../data/browsers')
let regionVersions = require('../../data/regionVersions')
let unpackRegion = require('../../dist/unpacker/region')
let char = require('../lib/tokenChar')
let fromEntries = require('../util/fromEntries')
let {
  findCommonLayout,
  getLayout,
  isCompactable,
  packCompact,
  packExplicit,
  planUnits
} = require('./region')

const NULLS = 67
const ZEROS = 87
const UNIT = 91
const REST = 92
const NO_UNIT = 1e4
const USAGE_SCALE = 1e5

let alphabet = Array.from({ length: 93 }, (_, index) => char(index))

function tokens(packed) {
  return packed.split('').map(character => alphabet.indexOf(character))
}

function count(list, value) {
  return list.filter(item => item === value).length
}

// Packs browsers, which have a version for each item of their usage
function packBrowsers(browsersUsage) {
  let data = {}
  let testLayout = browsersUsage.map((usage, browserIndex) => {
    let browser = `browser${browserIndex}`
    let versions = usage.map((_, index) => String(index + 1))
    data[browser] = fromEntries(
      versions.map((version, index) => [version, usage[index]])
    )
    return [browser, versions]
  })
  return tokens(packCompact(data, testLayout))
}

function packBrowser(usage) {
  return packBrowsers([usage])
}

function repeat(value, length) {
  return Array.from({ length }, () => value)
}

// Unpacker can read only the versions from the data folder
let layout = Object.entries(regionVersions).map(([key, versions]) => [
  browsers[key],
  versions.split(' ')
])

// Creates a region with usage in 0.00001 or null for all the versions
function createRegion(getUsage) {
  return fromEntries(
    layout.map(([browser, versions], browserIndex) => [
      browser,
      fromEntries(
        versions.map((version, index) => {
          let usage = getUsage(browserIndex, index)
          return [version, usage === null ? null : usage / USAGE_SCALE]
        })
      )
    ])
  )
}

// Checks that the unpacker reads the region back and returns its tokens
function roundTrip(region) {
  ok(isCompactable(region, JSON.stringify(layout)))
  let packed = packCompact(region, layout)
  equal(unpackRegion(packed), region)
  return tokens(packed)
}

function createRandom(seed) {
  let state = seed
  return max => {
    state = (state * 1103515245 + 12345) % 2147483648
    return Math.floor((state / 2147483648) * max)
  }
}

test('should pack usage as a number in base 45', () => {
  equal(packBrowser([0]), [0])
  equal(packBrowser([0.00001]), [1])
  equal(packBrowser([0.00044]), [44])
})

test('should add leading digits in base 22 to bigger numbers', () => {
  equal(packBrowser([0.00045]), [46, 0])
  equal(packBrowser([0.00989]), [45 + 21, 44])
  equal(packBrowser([0.0099]), [46, 45, 0])
  equal(packBrowser([100]), [65, 64, 48, 45, 10])
})

test('should pack versions without data in a row as a token', () => {
  equal(packBrowser([0, null, 0]), [0, NULLS, 0])
  equal(packBrowser([null, null, null, 0]), [NULLS + 2, 0])
  equal(packBrowser([0, ...repeat(null, 20), 0]), [0, NULLS + 19, 0])
  equal(packBrowser([0, ...repeat(null, 21), 0]), [0, NULLS + 19, NULLS, 0])
})

test('should pack versions without data at the end as a token', () => {
  equal(packBrowser([0, null]), [0, REST])
  equal(packBrowser([0.00001, null, 0, ...repeat(null, 30)]), [
    1,
    NULLS,
    0,
    REST
  ])
  equal(packBrowser(repeat(null, 30)), [REST])
})

test('should pack zeros in a row as a token', () => {
  equal(packBrowser([0, 0, 0.00001]), [ZEROS, 1])
  equal(packBrowser(repeat(0, 5)), [ZEROS + 3])
  equal(packBrowser(repeat(0, 6)), [ZEROS + 3, 0])
  equal(packBrowser(repeat(0, 7)), [ZEROS + 3, ZEROS])
  equal(packBrowser([0, 0, null, 0, 0, 0]), [ZEROS, NULLS, ZEROS + 1])
})

test('should pack nothing for browser without versions', () => {
  equal(packCompact({ ie: {} }, [['ie', []]]), '')
})

test('should pack browsers one after another', () => {
  let packed = packCompact(
    { ie: { 6: 0, 7: null }, edge: { 12: 0.00002 }, firefox: { 2: null } },
    [
      ['ie', ['6', '7']],
      ['edge', ['12']],
      ['firefox', ['2']]
    ]
  )
  equal(tokens(packed), [0, REST, 2, REST])
})

test('should take versions in the order of layout', () => {
  let packed = packCompact({ firefox: { 2: 0, 3: null, 3.5: 0.00035 } }, [
    ['firefox', ['3.5', '2', '3']]
  ])
  equal(tokens(packed), [35, 0, REST])
})

test('should not look for unit without several numbers', () => {
  equal(planUnits([]), [])
  equal(planUnits([[], [403], []]), [NO_UNIT, NO_UNIT, NO_UNIT])
})

test('should use the biggest step of numbers as unit', () => {
  let [unit] = planUnits([[403, 1209, 806, 4030]])
  ok(unit > NO_UNIT)
  equal(
    [403, 1209, 806, 4030].map(value => Math.round((value * NO_UNIT) / unit)),
    [1, 3, 2, 10]
  )
})

test('should find unit when the lowest number has several units', () => {
  let [unit] = planUnits([[806, 1209, 2015]])
  equal(
    [806, 1209, 2015].map(value => Math.round((value * NO_UNIT) / unit)),
    [2, 3, 5]
  )
})

test('should use the same unit for browsers in a row', () => {
  let plan = planUnits([
    [403, 806, 1209],
    [2015],
    [],
    [1612, 403],
    [517, 1034, 1551],
    []
  ])
  ok(plan[0] > NO_UNIT)
  equal(plan[1], plan[0])
  equal(plan[2], plan[0])
  equal(plan[3], plan[0])
  ok(plan[4] > NO_UNIT)
  ok(plan[4] !== plan[0])
  equal(Math.round((517 * NO_UNIT) / plan[4]), 1)
  equal(plan[5], NO_UNIT)
})

test('should pack numbers in units', () => {
  let packed = packBrowser([0.00403, 0.01209, 0, null, 0.00806])
  equal(packed[0], UNIT)
  equal(packed.slice(-5), [1, 3, 0, NULLS, 2])
})

test('should set unit once for browsers with the same step', () => {
  let packed = packBrowsers([
    [0.00403, 0.00806, 0.01209],
    [0, 0.02015],
    [null],
    [0.01612, 0.00403]
  ])
  equal(packed[0], UNIT)
  equal(count(packed, UNIT), 1)
  equal(packed.slice(-8), [1, 2, 3, 0, 5, REST, 4, 1])
})

test('should change unit for browsers with another step', () => {
  let packed = packBrowsers([
    [0.00403, 0.00806],
    [0.00517, 0.01551]
  ])
  equal(packed[0], UNIT)
  equal(count(packed, UNIT), 2)
  equal(packed.slice(-2), [1, 3])
})

test('should reset unit for browsers without a step', () => {
  let packed = packBrowsers([
    [0.00403, 0.00806],
    [0.10007, 0.20011, 0.30047, 0.40093],
    [0.00403, 0.00806]
  ])
  equal(count(packed, UNIT), 3)
  // Zero as unit means numbers as is
  let reset = packed.indexOf(UNIT, 1)
  equal(packed.slice(reset, reset + 5), [UNIT, 0, 55, 47, 17])
  equal(packed.slice(-2), [1, 2])
})

test('should unpack regions without data', () => {
  let packed = roundTrip(createRegion(() => null))
  ok(packed.every(index => index === REST))
})

test('should unpack regions with zero usage', () => {
  let packed = roundTrip(createRegion(() => 0))
  ok(packed.every(index => index === 0 || index >= ZEROS))
  equal(count(packed, UNIT), 0)
  equal(count(packed, REST), 0)
})

test('should unpack regions with the same step in all browsers', () => {
  roundTrip(createRegion((browser, index) => (index % 7) * 403))
})

test('should unpack regions with different steps', () => {
  roundTrip(
    createRegion((browser, index) => {
      return ((index % 7) + 1) * (browser % 2 === 0 ? 403 : 517)
    })
  )
})

test('should unpack regions with a step only in some browsers', () => {
  let random = createRandom(1)
  roundTrip(
    createRegion((browser, index) => {
      if (browser % 3 === 1) return 10007 + random(90000)
      return ((index % 7) + 1) * 403
    })
  )
})

test('should unpack regions with long rows of the same usage', () => {
  roundTrip(
    createRegion((browser, index) => {
      if (index < 3) return 100
      if (index < 50) return null
      if (index < 70) return 0
      if (index < 75) return 12345
      return null
    })
  )
})

test('should unpack regions with data only in the last versions', () => {
  roundTrip(
    createRegion((browser, index) => {
      let { length } = layout[browser][1]
      return index < length - 2 ? null : 9999999 - index
    })
  )
})

test('should unpack regions with any usage', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let random = createRandom(seed)
    let step = 1 + random(600)
    roundTrip(
      createRegion(() => {
        let type = random(10)
        if (type < 2) return null
        if (type < 4) return 0
        if (type < 8) return step * random(200)
        return random(100 * USAGE_SCALE)
      })
    )
  }
})

test('should describe versions of each browser in layout', () => {
  equal(getLayout({ ie: { 6: 0, 7: 1 }, firefox: { 2: null, 3.5: 0, 3: 0 } }), [
    ['ie', ['6', '7']],
    ['firefox', ['2', '3', '3.5']]
  ])
})

test('should find the most popular layout', () => {
  let first = { ie: { 6: 0 } }
  let second = { ie: { 6: 0, 7: 0 } }
  let regions = [first, second, { ie: { 6: 1, 7: null } }].map(data => {
    return { contents: { data } }
  })
  equal(findCommonLayout(regions), JSON.stringify(getLayout(second)))
  equal(findCommonLayout(regions.slice(0, 2)), JSON.stringify(getLayout(first)))
})

test('should use compact format only for regions with common layout', () => {
  let common = JSON.stringify([
    ['ie', ['6', '7']],
    ['firefox', ['3.5', '3.6']]
  ])
  let check = data => isCompactable(data, common)

  ok(check({ ie: { 6: 0, 7: 99.99999 }, firefox: { 3.5: null, 3.6: 1 } }))
  // Another browsers
  ok(!check({ ie: { 6: 0, 7: 0 } }))
  ok(!check({ firefox: { 3.5: 0, 3.6: 0 }, ie: { 6: 0, 7: 0 } }))
  ok(!check({ ie: { 6: 0, 7: 0 }, edge: { 3.5: 0, 3.6: 0 } }))
  // Another versions
  ok(!check({ ie: { 6: 0 }, firefox: { 3.5: 0, 3.6: 0 } }))
  ok(!check({ ie: { 6: 0, 7: 0, 8: 0 }, firefox: { 3.5: 0, 3.6: 0 } }))
  ok(!check({ ie: { 6: 0, 7: 0 }, firefox: { 3.6: 0, 3.5: 0 } }))
})

test('should use compact format only for usage it can keep', () => {
  let common = JSON.stringify([['ie', ['6']]])
  let check = usage => isCompactable({ ie: { 6: usage } }, common)

  ok(check(0))
  ok(check(null))
  ok(check(0.00001))
  ok(check(12.34567))
  ok(!check(0.000001))
  ok(!check(12.345678))
  ok(!check(-1))
  ok(!check('1'))
  ok(!check(undefined))
  ok(!check(NaN))
})

test('should pack regions with another layout to objects', () => {
  let data = {
    firefox: { 2: null, 3: 0.5, 3.5: null, 3.6: 0 },
    op_mini: { all: 12.345678 },
    ie: { 6: null }
  }
  let packed = packExplicit(data)
  equal(packed, {
    C: { 3: 0.5, 3.6: 0, _: '2 3.5' },
    H: { all: 12.345678 },
    A: { _: '6' }
  })
  equal(Object.keys(packed), ['C', 'H', 'A'])
  equal(unpackRegion(packed), data)
})

test.run()
