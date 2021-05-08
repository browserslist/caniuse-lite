const t = require('@babel/types')
const R = require('ramda')

module.exports = R.compose(
  t.expressionStatement,
  R.apply(t.assignmentExpression),
  R.concat([
    '=',
    t.memberExpression(t.identifier('module'), t.identifier('exports'))
  ]),
  R.of
)
