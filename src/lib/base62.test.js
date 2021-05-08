import { encode, decode } from './base62'

function testEquality(num) {
  let encoded = encode(num)
  let decoded = decode(encoded)
  return decoded === num
}

it('should encode and decode numbers', () => {
  for (let num = 0; num < 5000; num++) {
    expect(testEquality(num)).toBe(true)
  }
})
