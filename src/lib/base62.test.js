const { test } = require('uvu')
const { ok } = require('uvu/assert')

const { encode, decode } = require('./base62')

function testEquality(num) {
  let encoded = encode(num)
  let decoded = decode(encoded)
  return decoded === num
}

test('should encode and decode numbers', () => {
  for (let num = 0; num < 5000; num++) {
    ok(testEquality(num))
  }
})

test.run()
