/* Packed strings use printable ASCII without " and \ to avoid escaping.
   It gives 93 different tokens. */
function tokenChar(index) {
  let code = index + 32
  if (code >= 34) code++
  if (code >= 92) code++
  return String.fromCharCode(code)
}

module.exports = tokenChar
