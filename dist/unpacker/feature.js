'use strict'

const statuses = require('../lib/statuses')
const supported = require('../lib/supported')
const agents = require('./agents').agents
const browsers = require('./browsers').browsers
const featureSupport = require('../../data/featureSupport')

const MATH2LOG = Math.log(2)

/*
 * Packed stats is a string with the support of every agent version, browser
 * after browser. Since support rarely changes between versions, the string
 * has a support value and the number of versions which have it in a row.
 * This number is omitted when the value is the same until the last version.
 *
 * Each character is a token. The alphabet is printable ASCII without
 * the quote and the backslash. Tokens by their index in the alphabet:
 *
 *    0-34  support value by its position in data/featureSupport.js
 *   35-37  prefix of a 2-token position for less popular support values
 *   38-92  digit of the number of versions (bijective base 55)
 */
const TOKENS = 93
const POPULAR = 35
const LENGTH = 38
const LENGTH_BASE = 55

const browserKeys = Object.keys(browsers)
const versionLists = browserKeys.reduce((lists, key) => {
  let agent = agents[browsers[key]]
  lists[key] = agent ? agent.versions.filter(Boolean) : []
  return lists
}, {})

const supportCache = {}

function unpackSupport(cipher) {
  let cached = supportCache[cipher]
  if (cached !== undefined) return cached

  // bit flags
  let stats = Object.keys(supported).reduce((list, support) => {
    if (cipher & supported[support]) list.push(support)
    return list
  }, [])

  // notes
  let notes = cipher >> 7
  let notesArray = []
  while (notes) {
    let note = Math.floor(Math.log(notes) / MATH2LOG) + 1
    notesArray.unshift(`#${note}`)
    notes -= Math.pow(2, note - 1)
  }

  return (supportCache[cipher] = stats.concat(notesArray).join(' '))
}

function token(packed, pos) {
  let code = packed.charCodeAt(pos)
  if (code > 92) code--
  if (code > 34) code--
  return code - 32
}

function unpackVersions(packed, pos, versions, stats) {
  let total = versions.length
  let groups = {}
  let from = 0
  while (from < total) {
    let index = token(packed, pos++)
    if (index >= POPULAR) {
      index = POPULAR + (index - POPULAR) * TOKENS + token(packed, pos++)
    }
    let length = 0
    let digit = token(packed, pos) - LENGTH
    while (digit >= 0) {
      length = length * LENGTH_BASE + digit + 1
      digit = token(packed, ++pos) - LENGTH
    }
    let to = length ? from + length : total
    let cipher = featureSupport[index]
    if (!groups[cipher]) groups[cipher] = []
    groups[cipher].push(from, to)
    from = to
  }

  // caniuse-lite always sorted versions by their support
  for (let cipher in groups) {
    let support = unpackSupport(cipher)
    let ranges = groups[cipher]
    for (let i = 0; i < ranges.length; i += 2) {
      for (let j = ranges[i]; j < ranges[i + 1]; j++) {
        stats[versions[j]] = support
      }
    }
  }
  return pos
}

function unpackExplicit(packed, stats) {
  Object.keys(packed).forEach(cipher => {
    let support = unpackSupport(cipher)
    packed[cipher].split(' ').forEach(version => {
      stats[version] = support
    })
  })
}

function unpackFeature(packed) {
  let unpacked = {
    status: statuses[packed.B],
    title: packed.C,
    shown: packed.D
  }
  let stats = {}
  if (typeof packed.A === 'string') {
    let pos = 0
    browserKeys.forEach(key => {
      let browserStats = {}
      pos = unpackVersions(packed.A, pos, versionLists[key], browserStats)
      stats[browsers[key]] = browserStats
    })
  } else {
    // Feature has another set of browsers
    Object.keys(packed.A).forEach(key => {
      let browser = packed.A[key]
      let browserStats = {}
      if (typeof browser === 'string') {
        unpackVersions(browser, 0, versionLists[key], browserStats)
      } else {
        // Browser has another set of versions
        unpackExplicit(browser, browserStats)
      }
      stats[browsers[key]] = browserStats
    })
  }
  unpacked.stats = stats
  return unpacked
}

module.exports = unpackFeature
module.exports.default = unpackFeature
