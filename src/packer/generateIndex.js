import * as t from 'babel-types';
import generate from 'babel-generator';
import moduleExports from './moduleExports';

function requireCall (path) {
    return t.callExpression(
        t.identifier('require'), [
            t.stringLiteral(path),
        ]
    );
}

export default function index (data) {
    const ast = t.program([
        moduleExports(
            t.objectExpression(Object.keys(data).reduce((list, key) => {
                const value = data[key];
                list.push(
                    t.objectProperty(
                        t.stringLiteral(key),
                        requireCall(value)
                    )
                );
                return list;
            }, []))
        ),
    ]);

    return generate(ast).code;
}
