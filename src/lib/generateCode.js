const R = require('ramda')
const generate = require('@babel/generator').default

const appendString = R.flip(R.concat)

module.exports = R.compose(
  appendString('\n'),
  R.prop('code'),
  R.flip(R.binary(generate))({ minified: true })
)
