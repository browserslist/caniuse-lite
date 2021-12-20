const path = require('path')
const fs = require('fs').promises

const getContentsFactory = require('../lib/getContents')
const stringifyObject = require('../lib/stringifyObject')
const fromEntries = require('../util/fromEntries')
const invertObj = require('../util/invertObj')
const browsers = require('../../data/browsers')

const browsersInverted = invertObj(browsers)

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

const getContents = getContentsFactory(base)

module.exports = async function packRegion() {
  let regions = await fs.readdir(base).then(getContents)

  return Promise.all(
    regions.map(region => {
      let {
        contents: { data }
      } = region
      let packed = fromEntries(
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

      return fs.writeFile(
        path.join(__dirname, `../../data/regions/${region.name}.js`),
        stringifyObject(packed)
      )
    })
  )
}
