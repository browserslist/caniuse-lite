import * as R from 'ramda'

import pow from '../util/pow'

const characters =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function encode(integer) {
  let remainder = integer
  let result = ''
  do {
    result += characters[remainder % 62]
    remainder = Math.floor(remainder / 62)
  } while (remainder)
  return result
}

export const decode = R.compose(
  R.sum,
  R.addIndex(R.map)((character, index) =>
    R.multiply(characters.indexOf(character), pow(62, index))
  ),
  R.split('')
)
