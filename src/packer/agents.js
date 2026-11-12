let path = require('node:path')
let fs = require('node:fs').promises

let browsersData = require('../../data/browsers')
let { encode } = require('../lib/base62')
let stringifyObject = require('../lib/stringifyObject')
let fromEntries = require('../util/fromEntries')
let invertObj = require('../util/invertObj')

let browsers = invertObj(browsersData)

const DAY = 86400

function sameJSON(a, b) {
  // Unlike deep equal, it also checks the order of keys
  return JSON.stringify(a) === JSON.stringify(b)
}

/* Versions list has a lot of empty cells to align browsers on the website.
   We keep versions between them as strings and the cells as a number. */
function packVersions(versions) {
  let packed = []
  let i = 0
  while (i < versions.length) {
    let isCell = versions[i] === null
    let next = i
    while (next < versions.length && (versions[next] === null) === isCell) {
      next++
    }
    packed.push(isCell ? next - i : versions.slice(i, next).join(' '))
    i = next
  }
  return packed
}

/* Usage and release dates have the same versions in the same order
   as the versions list, so we can keep only values. */
function packUsage(versions, usage) {
  let packed = versions.map(version => usage[version])
  let unpacked = fromEntries(versions.map(version => [version, usage[version]]))
  return sameJSON(unpacked, usage) ? packed : usage
}

function packReleaseDate(versions, dates) {
  let days = 0
  let packed = versions.map(version => {
    if (dates[version] === null) return null
    let diff = dates[version] / DAY - days
    days += diff
    return diff
  })
  let unpacked = fromEntries(versions.map(version => [version, dates[version]]))
  let isPackable =
    sameJSON(unpacked, dates) &&
    packed.every(diff => diff === null || Number.isInteger(diff))
  return isPackable ? packed : dates
}

function relevantKeys(agents, fullAgents) {
  return fromEntries(
    Object.entries(agents).map(([key, agent]) => {
      let versions = agent.versions.filter(version => version !== null)
      let map = {
        A: packUsage(versions, agent.usage_global),
        B: agent.prefix,
        C: packVersions(agent.versions),
        E: agent.browser,
        F: packReleaseDate(
          versions,
          fromEntries(
            fullAgents[key].version_list.map(item => [
              item.version,
              item.release_date
            ])
          )
        )
      }

      if (agent.prefix_exceptions) {
        map.D = agent.prefix_exceptions
      }

      return [browsers[key], map]
    })
  )
}

function packBrowserVersions(agents) {
  let browserVersions = Object.values(agents)
    .reduce((map, agent) => {
      let versions = Object.keys(agent.usage_global)
      versions.forEach(version => {
        let exists = map.find(v => v.version === version)
        if (exists) {
          exists.count++
        } else {
          map.push({ version, count: 1 })
        }
      })
      return map
    }, [])
    .toSorted((a, b) => b.count - a.count)
    .reduce((map, version, index) => {
      map[encode(index)] = version.version
      return map
    }, {})

  return fs
    .writeFile(
      path.join(__dirname, '..', '..', 'data', 'browserVersions.js'),
      stringifyObject(browserVersions)
    )
    .then(() => agents)
}

function getAgents(data) {
  return JSON.parse(data).agents
}

module.exports = async function packAgents() {
  // We're not requiring the JSON because it nukes the null values
  let [agents, fullAgents] = await Promise.all([
    fs
      .readFile(require.resolve('caniuse-db/data.json'), 'utf8')
      .then(getAgents)
      .then(packBrowserVersions),
    fs
      .readFile(
        require.resolve('caniuse-db/fulldata-json/data-2.0.json'),
        'utf8'
      )
      .then(getAgents)
  ])

  let output = relevantKeys(agents, fullAgents)

  return fs.writeFile(
    path.join(__dirname, '..', '..', 'data', 'agents.js'),
    stringifyObject(output)
  )
}
