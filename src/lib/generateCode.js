let generate = require('@babel/generator').default
let t = require('@babel/types')

function generateCode(programStatements) {
  let { code } = generate(t.program(programStatements), { minified: true })

  return `${code}\n`
}

module.exports = generateCode
