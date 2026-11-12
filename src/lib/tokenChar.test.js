let { test } = require('uvu')
let { equal, ok } = require('uvu/assert')

let char = require('./tokenChar')

const TOKENS = 93

test('should have a character for every token', () => {
  let chars = new Set()
  for (let index = 0; index < TOKENS; index++) {
    chars.add(char(index))
  }
  equal(chars.size, TOKENS)
})

test('should use printable ASCII which needs no escaping', () => {
  for (let index = 0; index < TOKENS; index++) {
    let character = char(index)
    ok(/^[ -~]$/.test(character), `Token ${index} is not printable`)
    ok(character !== '"', `Token ${index} is a quote`)
    ok(character !== '\\', `Token ${index} is a backslash`)
  }
})

test('should skip the quote and the backslash', () => {
  equal(char(0), ' ')
  equal(char(1), '!')
  equal(char(2), '#')
  equal(char(58), '[')
  equal(char(59), ']')
  equal(char(92), '~')
})

test.run()
