import * as t from '@babel/types';
import * as R from 'ramda';

const moduleExports = R.compose(
    t.expressionStatement,
    R.apply(t.assignmentExpression),
    R.concat([
        "=",
        t.memberExpression(t.identifier("module"), t.identifier("exports")),
    ]),
    R.of
);

export default moduleExports;
