const R = require('ramda')

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
  chars =>
    chars.map(
      (character, index) => characters.indexOf(character) * 62 ** index
    ),
  R.split('')
)
