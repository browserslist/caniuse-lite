function sum(numbers) {
  let result = 0

  for (let number of numbers) {
    result += number
  }

  return result
}

module.exports = sum
