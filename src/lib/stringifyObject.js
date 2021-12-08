const t = require('@babel/types')
const R = require('ramda')

const generateCode = require('./generateCode')
const moduleExports = require('./moduleExports')

function getKey(encoded) {
  if (/\d/.test(encoded[0])) {
    return t.stringLiteral(encoded)
  }
  return t.identifier(encoded)
}

function stringifyRecursive(data) {
  if (data === null) {
    return t.nullLiteral()
  } else if (typeof data === 'undefined') {
    return t.identifier('undefined')
  } else if (typeof data === 'string') {
    return t.stringLiteral(data)
  } else if (typeof data === 'number') {
    return t.numericLiteral(data)
  } else if (Array.isArray(data)) {
    return t.arrayExpression(data.map(stringifyRecursive))
  } else if (data === Object(data)) {
    return t.objectExpression(
      Object.entries(data).map(([key, value]) =>
        t.objectProperty(getKey(key), stringifyRecursive(value))
      )
    )
  } else {
    throw new Error(`Unhandled type "${typeof data}" when creating object`)
  }
}

module.exports = R.compose(
  generateCode,
  t.program,
  R.of,
  moduleExports,
  stringifyRecursive
)
