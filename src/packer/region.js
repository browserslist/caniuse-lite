import path from 'path'
import { promises as fs } from 'fs'
import { invertObj } from 'ramda'

import getContentsFactory from '../lib/getContents'
import stringifyObject from '../lib/stringifyObject'

const browsers = require('../../data/browsers')

const browsersInverted = invertObj(browsers)

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `region-usage-json`
)

const getContents = getContentsFactory(base)

export default function packRegion() {
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
