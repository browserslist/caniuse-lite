/* Create a mapping from browser version strings to shorter identifiers. */

const path = require('path')
const fs = require('fs').promises
const R = require('ramda')

const stringifyObject = require('../lib/stringifyObject')
const { encode } = require('../lib/base62')

function getBrowsers(data) {
  let feature = Object.keys(data)[0]
  let browsers = Object.keys(data[feature].stats)

  return browsers.reduce((packed, browser, index) => {
    packed[encode(index)] = browser
    return packed
  }, {})
}

module.exports = () =>
  fs.writeFile(
    path.join(__dirname, '..', '..', 'data', 'browsers.js'),
    R.compose(
      stringifyObject,
      getBrowsers,
      R.prop('data')
    )(require('caniuse-db/data.json'))
  )
