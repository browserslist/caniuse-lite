let { runInThisContext } = require('node:vm')
let { test } = require('uvu')
let { equal, throws } = require('uvu/assert')

let stringifyObject = require('./stringifyObject')

function evaluate(code) {
  let module = { exports: {} }
  runInThisContext(`(function (module) {${code}})`)(module)
  return module.exports
}

test('should generate a module', () => {
  equal(stringifyObject({ A: 'ie' }), 'module.exports={A:"ie"};\n')
  equal(stringifyObject('ie'), 'module.exports="ie";\n')
  equal(stringifyObject([1, 2]), 'module.exports=[1,2];\n')
})

test('should keep all types of packed data', () => {
  let data = {
    A: [0, 0.165034, 11138, null, 1e21],
    B: 'ms',
    C: [154, '5.5 6 7', 3],
    D: { '9': 'o', '12.1': 'o', '_': '2 3', 'all': '' },
    E: true,
    F: false,
    G: [],
    H: {},
    I: [undefined]
  }
  let code = stringifyObject(data)
  equal(evaluate(code), data)
  equal(Object.keys(evaluate(code)), Object.keys(data))
})

test('should keep negative numbers', () => {
  let data = { F: [11138, -13, 0, -0.5, null] }
  let code = stringifyObject(data)
  equal(code, 'module.exports={F:[11138,-13,0,-0.5,null]};\n')
  equal(evaluate(code), data)
})

test('should keep strings with any characters', () => {
  let data = [' !#$', 'a"b', "a'b", 'a\\b', 'a\nb', '</script>', 'a\tb', '']
  equal(evaluate(stringifyObject(data)), data)
})

test('should not escape characters of packed strings', () => {
  let packed = ''
  for (let code = 32; code < 127; code++) {
    let character = String.fromCharCode(code)
    if (character !== '"' && character !== '\\') packed += character
  }
  equal(stringifyObject(packed), `module.exports="${packed}";\n`)
})

test('should quote only keys which are not identifiers', () => {
  equal(
    stringifyObject({ 'A': 1, '_': 2, '164': 3, '12.1': 4, '9a': 5 }),
    'module.exports={"164":3,A:1,_:2,"12.1":4,"9a":5};\n'
  )
})

test('should throw on unknown types', () => {
  throws(() => stringifyObject({ A: Symbol('a') }), 'Unhandled type "symbol"')
  throws(() => stringifyObject([1n]), 'Unhandled type "bigint"')
})

test.run()
