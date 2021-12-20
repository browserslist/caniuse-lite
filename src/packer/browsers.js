/* Create a mapping from browser version strings to shorter identifiers. */

const path = require('path')
const fs = require('fs').promises

const stringifyObject = require('../lib/stringifyObject')
const { encode } = require('../lib/base62')
const fromEntries = require('../util/fromEntries')

function getBrowsers({ data }) {
  let feature = Object.keys(data)[0]
  let browsers = Object.keys(data[feature].stats)

  return stringifyObject(
    fromEntries(browsers.map((browser, index) => [encode(index), browser]))
  )
}

module.exports = () =>
  fs.writeFile(
    path.join(__dirname, '..', '..', 'data', 'browsers.js'),
    getBrowsers(require('caniuse-db/data.json'))
  )
