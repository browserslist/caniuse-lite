const t = require('babel-types')
const R = require('ramda')

const generateCode = require('./generateCode')
const moduleExports = require('./moduleExports')

function getKey(encoded) {
  if (/\d/.test(encoded[0])) {
    return t.stringLiteral(encoded)
  }
  return t.identifier(encoded)
}

function stringify(list) {
  return Object.keys(list).reduce((ast, key) => {
    let data = list[key]
    let value
    if (data === null) {
      value = t.nullLiteral()
    } else if (typeof data === 'undefined') {
      value = t.identifier('undefined')
    } else if (typeof data === 'string') {
      value = t.stringLiteral(data)
    } else if (typeof data === 'number') {
      value = t.numericLiteral(data)
    } else if (Array.isArray(data)) {
      value = t.arrayExpression(
        data.map(function child(d) {
          if (d === null) {
            return t.nullLiteral()
          }
          if (typeof d === 'undefined') {
            return t.identifier('undefined')
          }
          if (typeof d === 'string') {
            return t.stringLiteral(d)
          }
          if (typeof d === 'number') {
            return t.numericLiteral(d)
          }
          if (Array.isArray(d)) {
            return t.arrayExpression(d.map(child))
          }
          return ''
        })
      )
    } else if (data === Object(data)) {
      value = t.objectExpression(stringify(data))
    }
    return ast.concat(t.objectProperty(getKey(key), value))
  }, [])
}

module.exports = R.compose(
  generateCode,
  t.program,
  R.of,
  moduleExports,
  t.objectExpression,
  stringify
)
