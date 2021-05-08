import * as R from 'ramda'
import generate from 'babel-generator'

const appendString = R.flip(R.concat)

const generator = R.compose(
  appendString('\n'),
  R.prop('code'),
  R.flip(R.binary(generate))({ minified: true })
)

export default generator
