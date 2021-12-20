const path = require('path')
const fs = require('fs').promises

const stringifyObject = require('../lib/stringifyObject')
const browsersData = require('../../data/browsers')
const { encode } = require('../lib/base62')
const fromEntries = require('../util/fromEntries')
const invertObj = require('../util/invertObj')

const browsers = invertObj(browsersData)

function relevantKeys(agents, versions, fullAgents) {
  let versionsInverted = invertObj(versions)

  return fromEntries(
    Object.entries(agents).map(([key, agent]) => {
      let map = {
        A: fromEntries(
          Object.entries(agent.usage_global).map(([k, value]) => [
            versionsInverted[k],
            value
          ])
        ),
        B: agent.prefix,
        C: agent.versions.flatMap(version =>
          version === null ? [''] : versionsInverted[version]
        ),
        E: agent.browser,
        F: fromEntries(
          fullAgents[key].version_list.map(item => [
            versionsInverted[item.version],
            item.release_date
          ])
        )
      }

      if (agent.prefix_exceptions) {
        map.D = fromEntries(
          Object.entries(agent.prefix_exceptions).map(([k, value]) => [
            versionsInverted[k],
            value
          ])
        )
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
    .sort((a, b) => b.count - a.count)
    .reduce((map, version, index) => {
      map[encode(index)] = version.version
      return map
    }, {})

  return fs
    .writeFile(
      path.join(__dirname, '..', '..', 'data', 'browserVersions.js'),
      stringifyObject(browserVersions)
    )
    .then(() => [agents, browserVersions])
}

function getAgents(data) {
  return JSON.parse(data).agents
}

module.exports = async function packAgents() {
  // We're not requiring the JSON because it nukes the null values
  let [[agents, browserVersions], fullAgents] = await Promise.all([
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

  let output = relevantKeys(agents, browserVersions, fullAgents)

  return fs.writeFile(
    path.join(__dirname, '..', '..', 'data', 'agents.js'),
    stringifyObject(output)
  )
}
