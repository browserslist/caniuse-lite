/* Create a mapping from browser version strings to shorter identifiers. */

import { promises as fs } from 'fs'
import * as R from 'ramda'
import path from 'path'

import stringifyObject from '../lib/stringifyObject'
import { encode } from '../lib/base62'

function getBrowsers(data) {
  let feature = Object.keys(data)[0]
  let browsers = Object.keys(data[feature].stats)

  return browsers.reduce((packed, browser, index) => {
    packed[encode(index)] = browser
    return packed
  }, {})
}

const packBrowsers = () =>
  fs.writeFile(
    path.join(__dirname, '..', '..', 'data', 'browsers.js'),
    R.compose(
      stringifyObject,
      getBrowsers,
      R.prop('data')
    )(require('caniuse-db/data.json'))
  )

export default packBrowsers
