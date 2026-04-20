// This is Object.fromEntries to be compatible with Node 8
let fromEntries = pairs => {
  let output = {}

  for (let [key, value] of pairs) {
    output[key] = value
  }

  return output
}

module.exports = fromEntries
