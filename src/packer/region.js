const path = require('path')
const fs = require('fs').promises
const { invertObj } = require('ramda')

const getContentsFactory = require('../lib/getContents')
const stringifyObject = require('../lib/stringifyObject')
const browsers = require('../../data/browsers')

const browsersInverted = invertObj(browsers)

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

const getContents = getContentsFactory(base)

module.exports = function packRegion() {
  return fs
    .readdir(base)
    .then(getContents)
    .then(regions =>
      Promise.all(
        regions.map(region => {
          let { data } = region.contents
          let packed = Object.keys(data).reduce((list, key) => {
            let stats = data[key]
            list[browsersInverted[key]] = Object.keys(stats).reduce((l, k) => {
              let stat = stats[k]
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
            return list
          }, {})

          return fs.writeFile(
            path.join(__dirname, `../../data/regions/${region.name}.js`),
            stringifyObject(packed)
          )
        })
      )
    )
}
