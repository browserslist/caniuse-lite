import * as R from 'ramda';

const parseInteger = R.curryN(2, R.flip(parseInt));
const parseDecimal = parseInteger(10);

export default parseDecimal;
