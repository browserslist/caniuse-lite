function invertObj(object) {
  let result = {}

  for (let [value, key] of Object.entries(object)) {
    result[key] = value
  }

  return result
}

module.exports = invertObj
