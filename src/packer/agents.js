const path = require('path')
const fs = require('fs').promises
const R = require('ramda')

const stringifyObject = require('../lib/stringifyObject')
const browsersData = require('../../data/browsers')
const { encode } = require('../lib/base62')

const browsers = R.invertObj(browsersData)

function relevantKeys(agents, versions, fullAgents) {
  let versionsInverted = R.invertObj(versions)
  return Object.keys(agents).reduce((map, key) => {
    let agent = agents[key]
    map[browsers[key]] = {
      A: Object.keys(agent.usage_global).reduce((list, k) => {
        let val = agent.usage_global[k]
        list[versionsInverted[k]] = val
        return list
      }, {}),
      B: agent.prefix,
      C: R.compose(
        R.unnest,
        R.map(
          R.ifElse(
            R.equals(null),
            R.always(''),
            R.flip(R.prop)(versionsInverted)
          )
        )
      )(agent.versions),
      E: agent.browser,
      F: fullAgents[key].version_list.reduce((map2, item) => {
        map2[versionsInverted[item.version]] = item.release_date
        return map2
      }, {})
    }
    if (agent.prefix_exceptions) {
      map[browsers[key]].D = Object.keys(agent.prefix_exceptions).reduce(
        (list, k) => {
          let val = agent.prefix_exceptions[k]
          list[versionsInverted[k]] = val
          return list
        },
        {}
      )
    }
    return map
  }, {})
}

function packBrowserVersions(agents) {
  let browserVersions = Object.keys(agents)
    .reduce((map, key) => {
      let versions = Object.keys(agents[key].usage_global)
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

const getAgents = R.compose(R.prop('agents'), JSON.parse)

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
