import * as t from 'babel-types';

const moduleExports = what =>
    t.expressionStatement(
        t.assignmentExpression(
            '=',
            t.memberExpression(t.identifier('module'), t.identifier('exports')),
            what
        )
    );

export default moduleExports;
