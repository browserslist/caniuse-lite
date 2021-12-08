const R = require('ramda')
const generate = require('@babel/generator').default
const t = require('@babel/types')

const appendString = R.flip(R.concat)

module.exports = R.compose(
  appendString('\n'),
  R.prop('code'),
  R.flip(R.binary(generate))({ minified: true }),
  t.program
)
