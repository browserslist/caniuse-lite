'use strict'

const browsers = require('./browsers').browsers
const regionVersions = require('../../data/regionVersions')

const browserKeys = Object.keys(regionVersions)
const versionLists = browserKeys.map(key => regionVersions[key].split(' '))

/*
 * A packed region is a string with the usage of every version from
 * data/regionVersions.js, browser after browser. Each character is a token.
 * The alphabet is printable ASCII without the quote and the backslash,
 * so the string needs no escaping. Tokens by their index in the alphabet:
 *
 *    0-44  last digit of a number (base 45)
 *   45-66  leading digit of a number (base 22)
 *   67-86  1-20 versions without data
 *   87-90  2-5 versions with zero usage
 *   91     change the unit to the next number (0 resets it)
 *   92     no data for the rest of browser versions
 *
 * A number is the usage in units. Most of the usage numbers in a region are
 * multiples of the same step, so with the right unit they become small.
 */
const LAST_DIGITS = 45
const LEAD_DIGITS = 22
const NULLS = 67
const ZEROS = 87
const UNIT = 91
const UNIT_SCALE = 1e4
const USAGE_SCALE = 1e5

function unpackExplicit(packed) {
  return Object.keys(packed).reduce((list, browser) => {
    let data = packed[browser]
    list[browsers[browser]] = Object.keys(data).reduce((memo, key) => {
      let stats = data[key]
      if (key === '_') {
        stats.split(' ').forEach(version => (memo[version] = null))
      } else {
        memo[key] = stats
      }
      return memo
    }, {})
    return list
  }, {})
}

function unpackRegion(packed) {
  // Regions which do not fit data/regionVersions.js are stored as objects
  if (typeof packed !== 'string') return unpackExplicit(packed)

  let region = {}
  let pos = 0
  let unit = UNIT_SCALE

  function token() {
    let code = packed.charCodeAt(pos++)
    if (code > 92) code--
    if (code > 34) code--
    return code - 32
  }

  function number(index) {
    let result = 0
    while (index >= LAST_DIGITS) {
      result = result * LEAD_DIGITS + index - LAST_DIGITS
      index = token()
    }
    return result * LAST_DIGITS + index
  }

  for (let i = 0; i < browserKeys.length; i++) {
    let versions = versionLists[i]
    let total = versions.length
    let usage = []
    let firstNull = total

    while (usage.length < total) {
      let index = token()
      if (index < NULLS) {
        usage.push(
          Math.round((number(index) * unit) / UNIT_SCALE) / USAGE_SCALE
        )
      } else if (index < UNIT) {
        let value = index < ZEROS ? null : 0
        let count = index < ZEROS ? index - NULLS + 1 : index - ZEROS + 2
        if (value === null && firstNull === total) firstNull = usage.length
        while (count--) usage.push(value)
      } else if (index === UNIT) {
        unit = number(token()) || UNIT_SCALE
      } else {
        if (firstNull === total) firstNull = usage.length
        while (usage.length < total) usage.push(null)
      }
    }

    // caniuse-lite always moved versions without data
    // to the place of the first of them
    let stats = {}
    for (let j = 0; j < firstNull; j++) {
      stats[versions[j]] = usage[j]
    }
    for (let j = firstNull; j < total; j++) {
      if (usage[j] === null) stats[versions[j]] = null
    }
    for (let j = firstNull; j < total; j++) {
      if (usage[j] !== null) stats[versions[j]] = usage[j]
    }
    region[browsers[browserKeys[i]]] = stats
  }

  return region
}

module.exports = unpackRegion
module.exports.default = unpackRegion
