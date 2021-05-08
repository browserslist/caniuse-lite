const R = require('ramda')

const pow = require('../util/pow')

const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

module.exports.encode = function encode(integer) {
  let remainder = integer
  let result = ''
  do {
    result += characters[remainder % 62]
    remainder = Math.floor(remainder / 62)
  } while (remainder)
  return result
}

module.exports.decode = R.compose(
  R.sum,
  R.addIndex(R.map)((character, index) =>
    R.multiply(characters.indexOf(character), pow(62, index))
  ),
  R.split('')
)
