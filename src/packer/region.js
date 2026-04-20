let path = require('node:path')
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
