'use strict'

const browsers = require('./browsers').browsers
const agentsData = require('../../data/agents')

const DAY = 86400

function copy(object) {
  return Object.keys(object).reduce((result, key) => {
    result[key] = object[key]
    return result
  }, {})
}

function unpackUsage(versions, packed) {
  // Usage is an object if its versions are different from the agent versions
  if (!Array.isArray(packed)) return copy(packed)
  return versions.reduce((usage, version, index) => {
    usage[version] = packed[index]
    return usage
  }, {})
}

function unpackReleaseDate(versions, packed) {
  if (!Array.isArray(packed)) return copy(packed)
  // Dates are stored as a number of days since the previous release
  let days = 0
  return versions.reduce((dates, version, index) => {
    if (packed[index] === null) {
      dates[version] = null
    } else {
      days += packed[index]
      dates[version] = days * DAY
    }
    return dates
  }, {})
}

function unpackAgent(packed) {
  // Versions are stored as strings of space-separated versions
  // and numbers of empty cells between them
  let versions = []
  let released = []
  packed.C.forEach(item => {
    if (typeof item === 'number') {
      for (let i = 0; i < item; i++) versions.push(null)
    } else {
      item.split(' ').forEach(version => {
        versions.push(version)
        released.push(version)
      })
    }
  })

  let agent = {
    usage_global: unpackUsage(released, packed.A),
    prefix: packed.B,
    versions: versions,
    browser: packed.E,
    release_date: unpackReleaseDate(released, packed.F)
  }
  if (packed.D) agent.prefix_exceptions = copy(packed.D)
  return agent
}

module.exports.agents = Object.keys(agentsData).reduce((map, key) => {
  map[browsers[key]] = unpackAgent(agentsData[key])
  return map
}, {})
