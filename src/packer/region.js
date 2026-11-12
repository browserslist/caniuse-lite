let path = require('node:path')
let { isDeepStrictEqual } = require('node:util')
let fs = require('node:fs').promises

let browsers = require('../../data/browsers')
let getContentsFactory = require('../lib/getContents')
let stringifyObject = require('../lib/stringifyObject')
let fromEntries = require('../util/fromEntries')
let invertObj = require('../util/invertObj')

let browsersInverted = invertObj(browsers)

let base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

let getContents = getContentsFactory(base)

// The token alphabet. Keep in sync with dist/unpacker/region.js
const LAST_DIGITS = 45
const LEAD_DIGITS = 22
const NULLS = 67
const MAX_NULLS = 20
const ZEROS = 87
const MAX_ZEROS = 5
const UNIT = 91
const REST = 92
const UNIT_SCALE = 1e4
const USAGE_SCALE = 1e5
// Lowest usage is expected to be not more than this number of units
const MAX_UNITS_IN_LOWEST = 12

function char(index) {
  // Printable ASCII without " and \
  let code = index + 32
  if (code >= 34) code++
  if (code >= 92) code++
  return String.fromCharCode(code)
}

function number(value) {
  let result = char(value % LAST_DIGITS)
  let rest = Math.floor(value / LAST_DIGITS)
  while (rest > 0) {
    result = char(LAST_DIGITS + (rest % LEAD_DIGITS)) + result
    rest = Math.floor(rest / LEAD_DIGITS)
  }
  return result
}

function inUnits(value, unit) {
  return Math.round((value * UNIT_SCALE) / unit)
}

function fits(values, unit) {
  return values.every(
    value => Math.round((inUnits(value, unit) * unit) / UNIT_SCALE) === value
  )
}

function findUnits(values) {
  let lowest = Math.min(...values)
  let units = []
  for (let count = 1; count <= MAX_UNITS_IN_LOWEST; count++) {
    let min = Math.ceil(((lowest - 0.5) * UNIT_SCALE) / count)
    let max = Math.floor(((lowest + 0.5) * UNIT_SCALE) / count)
    for (let unit = max; unit >= min && unit > UNIT_SCALE; unit--) {
      if (fits(values, unit)) units.push(unit)
    }
  }
  return units
}

/* Usage numbers are multiples of a step, which depends on the sample size
   of the data source. Find the biggest step for each run of browsers. */
function planUnits(browsersValues) {
  let plan = browsersValues.map(() => UNIT_SCALE)
  let start = 0
  while (start < browsersValues.length) {
    let units = browsersValues[start].length > 1
      ? findUnits(browsersValues[start])
      : []
    let end = start
    if (units.length > 0) {
      for (let i = start + 1; i < browsersValues.length; i++) {
        let values = browsersValues[i]
        if (values.length === 0) continue
        let common = units.filter(unit => fits(values, unit))
        if (common.length === 0) break
        units = common
        end = i
      }
      let unit = Math.max(...units)
      for (let i = start; i <= end; i++) plan[i] = unit
    }
    start = end + 1
  }
  return plan
}

function run(length, max, first) {
  let result = ''
  while (length > 0) {
    let part = Math.min(length, max)
    result += char(first + part - 1)
    length -= part
  }
  return result
}

function toInteger(usage) {
  return Math.round(usage * USAGE_SCALE)
}

function packCompact(data, layout) {
  let browsersUsage = layout.map(([browser, versions]) =>
    versions.map(version => data[browser][version])
  )
  let browsersValues = browsersUsage.map(usage =>
    usage.filter(Boolean).map(toInteger)
  )
  let plan = planUnits(browsersValues)

  let unit = UNIT_SCALE
  let result = ''
  browsersUsage.forEach((usage, index) => {
    let values = browsersValues[index]
    if (values.length > 0 && plan[index] !== unit) {
      if (unit === UNIT_SCALE || !fits(values, unit)) {
        unit = plan[index]
        result += char(UNIT) + number(unit === UNIT_SCALE ? 0 : unit)
      }
    }

    let end = usage.length
    while (end > 0 && usage[end - 1] === null) end--

    let i = 0
    while (i < end) {
      let value = usage[i]
      let next = i + 1
      while (next < end && usage[next] === value) next++
      if (value === null) {
        result += run(next - i, MAX_NULLS, NULLS)
        i = next
      } else if (value === 0 && next - i > 1) {
        // Zeros token starts from 2, since a single zero is a number
        let zeros = Math.min(next - i, MAX_ZEROS)
        result += char(ZEROS + zeros - 2)
        i += zeros
      } else {
        result += number(inUnits(toInteger(value), unit))
        i++
      }
    }
    if (end < usage.length) result += char(REST)
  })
  return result
}

function packExplicit(data) {
  return fromEntries(
    Object.entries(data).map(([key, stats]) => [
      browsersInverted[key],
      Object.entries(stats).reduce((l, [k, stat]) => {
        if (stat === null) {
          if (l._) {
            l._ += ` ${k}`
          } else {
            l._ = k
          }
          return l
        }
        l[k] = stat
        return l
      }, {})
    ])
  )
}

function getLayout(data) {
  return Object.entries(data).map(([browser, stats]) => [
    browser,
    Object.keys(stats)
  ])
}

/* All regions have the same browsers and versions, so we keep this list once
   and regions contain only usage numbers in the same order. */
function findCommonLayout(regions) {
  let counts = new Map()
  let common
  for (let { contents } of regions) {
    let layout = JSON.stringify(getLayout(contents.data))
    let count = (counts.get(layout) || 0) + 1
    counts.set(layout, count)
    if (!common || count > counts.get(common)) common = layout
  }
  return common
}

function isCompactable(data, commonLayout) {
  return (
    JSON.stringify(getLayout(data)) === commonLayout &&
    Object.values(data).every(stats =>
      Object.values(stats).every(
        usage =>
          usage === null ||
          (typeof usage === 'number' &&
            usage >= 0 &&
            toInteger(usage) / USAGE_SCALE === usage)
      )
    )
  )
}

module.exports = async function packRegion() {
  let regions = await fs.readdir(base).then(getContents)

  let commonLayout = findCommonLayout(regions)
  let layout = JSON.parse(commonLayout)
  await fs.writeFile(
    path.join(__dirname, '../../data/regionVersions.js'),
    stringifyObject(
      fromEntries(
        layout.map(([browser, versions]) => [
          browsersInverted[browser],
          versions.join(' ')
        ])
      )
    )
  )

  // Unpacker needs the file above
  let unpackRegion = require('../../dist/unpacker/region')

  return Promise.all(
    regions.map(region => {
      let {
        contents: { data }
      } = region

      let packed
      if (isCompactable(data, commonLayout)) {
        packed = packCompact(data, layout)
        if (!isDeepStrictEqual(unpackRegion(packed), data)) {
          throw new Error(`Region ${region.name} was packed with a mistake`)
        }
      } else {
        packed = packExplicit(data)
      }

      return fs.writeFile(
        path.join(__dirname, `../../data/regions/${region.name}.js`),
        stringifyObject(packed)
      )
    })
  )
}
