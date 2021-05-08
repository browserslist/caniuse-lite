import path from 'path'
import fs from 'mz/fs'
import writeFile from 'write-file-promise'
import * as t from 'babel-types'
import * as R from 'ramda'

import generateCode from '../lib/generateCode'
import getContentsFactory from '../lib/getContents'
import moduleExports from '../lib/moduleExports'
import stringifyObject from '../lib/stringifyObject'
import statuses from '../lib/statuses'
import supported from '../lib/supported'
import parseDecimal from '../util/parseDecimal'
import pow from '../util/pow'

const browsers = require('../../data/browsers')
const versions = require('../../data/browserVersions')

const browsersInverted = R.invertObj(browsers)
const statusesInverted = R.invertObj(statuses)
const versionsInverted = R.invertObj(versions)

const objFromKeys = R.curry((fn, keys) => R.zipObj(keys, R.map(fn, keys)))

const base = path.join(
  path.dirname(require.resolve(`caniuse-db/data.json`)),
  `features-json`
)

const getContents = getContentsFactory(base)

const callExpression = R.curryN(2, t.callExpression)

const requireCall = R.compose(
  callExpression(t.identifier('require')),
  R.of,
  t.stringLiteral
)

const featureIndex = R.compose(
  generateCode,
  t.program,
  R.of,
  moduleExports,
  t.objectExpression,
  R.values,
  R.mapObjIndexed((value, key) =>
    t.objectProperty(t.stringLiteral(key), requireCall(value))
  ),
  objFromKeys(R.concat('./features/')),
  R.map(R.prop('name'))
)

const packSupport = R.compose(
  R.sum,
  R.map(
    R.ifElse(
      R.flip(R.has)(supported),
      R.flip(R.prop)(supported),
      R.compose(pow(2), R.add(6), parseDecimal, R.slice(1, Infinity))
    )
  ),
  R.split(' ')
)

export default function packFeature() {
  return fs
    .readdir(base)
    .then(getContents)
    .then(
      R.tap(features =>
        Promise.all(
          features.map(feature => {
            let { name, contents } = feature
            let packed = {}
            packed.A = Object.keys(contents.stats).reduce(
              (browserStats, key) => {
                let browser = contents.stats[key]
                let supportData = Object.keys(browser).reduce(
                  (stats, version) => {
                    let support = browser[version]
                    stats[versionsInverted[version]] = packSupport(support)
                    return stats
                  },
                  {}
                )
                let compacted = Object.keys(supportData).reduce((min, k) => {
                  let value = supportData[k]
                  if (!min[value]) {
                    min[value] = k
                  } else {
                    min[value] += ` ${k}`
                  }
                  return min
                }, {})
                browserStats[browsersInverted[key]] = compacted
                return browserStats
              },
              {}
            )
            packed.B = parseDecimal(statusesInverted[contents.status])
            packed.C = contents.title
            return writeFile(
              path.join(__dirname, `../../data/features/${name}.js`),
              stringifyObject(packed)
            )
          })
        )
      )
    )
    .then(features =>
      writeFile(
        path.join(__dirname, '../../data/features.js'),
        featureIndex(features)
      )
    )
}
