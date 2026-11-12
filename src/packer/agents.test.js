let { test } = require('uvu')
let { equal } = require('uvu/assert')

let {
  packReleaseDate,
  packUsage,
  packVersions,
  relevantKeys
} = require('./agents')

const DAY = 86400

test('should pack versions between empty cells to strings', () => {
  equal(packVersions([null, null, '1', '2', null, '3', null, null, null]), [
    2,
    '1 2',
    1,
    '3',
    3
  ])
  equal(packVersions(['4.2-4.3', '5.0-5.1', 'TP']), ['4.2-4.3 5.0-5.1 TP'])
  equal(packVersions(['all', null]), ['all', 1])
  equal(packVersions([null]), [1])
  equal(packVersions([]), [])
})

test('should keep only numbers for usage of agent versions', () => {
  equal(
    packUsage(['9', '10', 'TP'], { 9: 0.5, 10: 0, TP: 1.25 }),
    [0.5, 0, 1.25]
  )
  // Integer keys have the same order in any object
  equal(packUsage(['10', '9'], { 9: 0.5, 10: 0 }), [0, 0.5])
  equal(packUsage([], {}), [])
})

test('should keep usage with another set of versions as is', () => {
  let extra = { 9: 0.5, 10: 0, 11: 1 }
  equal(packUsage(['9', '10'], extra), extra)

  let reordered = { 3.6: 0.5, 3.5: 0 }
  equal(packUsage(['3.5', '3.6'], reordered), reordered)
})

test('should pack release dates as days since the previous one', () => {
  equal(
    packReleaseDate(['1', '2', '3'], { 1: 10 * DAY, 2: 25 * DAY, 3: 26 * DAY }),
    [10, 15, 1]
  )
  // Dates before 1970 and versions released out of order
  equal(
    packReleaseDate(['1', '2', '3'], { 1: -5 * DAY, 2: 20 * DAY, 3: 7 * DAY }),
    [-5, 25, -13]
  )
  equal(packReleaseDate([], {}), [])
})

test('should pack unknown release dates as null', () => {
  equal(
    packReleaseDate(['1', '2', '3', 'TP'], {
      1: 10 * DAY,
      2: null,
      3: 12 * DAY,
      TP: null
    }),
    [10, null, 2, null]
  )
  equal(packReleaseDate(['TP'], { TP: null }), [null])
})

test('should keep release dates which do not fit to days as is', () => {
  let withTime = { 1: 10 * DAY, 2: 25 * DAY + 3600 }
  equal(packReleaseDate(['1', '2'], withTime), withTime)

  let extra = { 1: 10 * DAY, 2: 25 * DAY, 3: 26 * DAY }
  equal(packReleaseDate(['1', '2'], extra), extra)

  let reordered = { 3.6: 25 * DAY, 3.5: 10 * DAY }
  equal(packReleaseDate(['3.5', '3.6'], reordered), reordered)
})

test('should pack agents', () => {
  let packed = relevantKeys(
    {
      ie: {
        browser: 'IE',
        long_name: 'Internet Explorer',
        abbr: 'IE',
        prefix: 'ms',
        type: 'desktop',
        usage_global: { 10: 0.1, 11: 0.4 },
        versions: [null, null, '10', '11', null]
      },
      opera: {
        browser: 'Opera',
        prefix: 'webkit',
        prefix_exceptions: { 9: 'o', 12.1: 'o' },
        usage_global: { 9: 0, 15: 0.02, 12.1: 0.01 },
        versions: ['9', '12.1', '15']
      }
    },
    {
      ie: {
        version_list: [
          { version: '10', release_date: 15600 * DAY, era: -1 },
          { version: '11', release_date: 16000 * DAY, era: 0 }
        ]
      },
      opera: {
        version_list: [
          { version: '9', release_date: 13000 * DAY },
          { version: '12.1', release_date: 15600 * DAY },
          { version: '15', release_date: null }
        ]
      }
    }
  )
  equal(packed, {
    A: {
      A: [0.1, 0.4],
      B: 'ms',
      C: [2, '10 11', 1],
      E: 'IE',
      F: [15600, 400]
    },
    F: {
      A: [0, 0.01, 0.02],
      B: 'webkit',
      C: ['9 12.1 15'],
      D: { 9: 'o', 12.1: 'o' },
      E: 'Opera',
      F: [13000, 2600, null]
    }
  })
})

test('should pack agents with another versions in usage', () => {
  let packed = relevantKeys(
    {
      edge: {
        browser: 'Edge',
        prefix: 'webkit',
        usage_global: { 12: 0.1, 13: 0.2, 14: 0.3 },
        versions: ['12', '13']
      }
    },
    {
      edge: {
        version_list: [{ version: '12', release_date: 16600 * DAY }]
      }
    }
  )
  equal(packed, {
    B: {
      A: { 12: 0.1, 13: 0.2, 14: 0.3 },
      B: 'webkit',
      C: ['12 13'],
      E: 'Edge',
      F: { 12: 16600 * DAY }
    }
  })
})

test.run()
