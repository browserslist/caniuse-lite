const R = require('ramda')

const parseInteger = R.curryN(2, R.flip(parseInt))
module.exports = parseInteger(10)
