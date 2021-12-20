const t = require('@babel/types')

function moduleExports(expression) {
  return t.expressionStatement(
    t.assignmentExpression(
      '=',
      t.memberExpression(t.identifier('module'), t.identifier('exports')),
      expression
    )
  )
}

module.exports = moduleExports
