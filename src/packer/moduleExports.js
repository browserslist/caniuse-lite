import * as t from 'babel-types';

export default function moduleExports (what) {
    return t.expressionStatement(
        t.assignmentExpression(
            '=',
            t.memberExpression(
                t.identifier('module'),
                t.identifier('exports')
            ),
            what
        )
    );
} 
