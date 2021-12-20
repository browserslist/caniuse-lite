const sum = require('../util/sum')

const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function encode(integer) {
  let remainder = integer
  let result = ''
  do {
    result += characters[remainder % 62]
    remainder = Math.floor(remainder / 62)
  } while (remainder)
  return result
}

function decode(base62) {
  return sum(
    base62
      .split('')
      .map((character, index) => characters.indexOf(character) * 62 ** index)
  )
}

module.exports = { encode, decode }
