import * as t from 'babel-types';
import generate from 'babel-generator';
import moduleExports from './moduleExports';

export default function browsersMap (data) {
    const ast = t.program([
        moduleExports(
            t.objectExpression(data.reduce((list, version, index) => {
                list.push(
                    t.objectProperty(
                        t.numericLiteral(index + 1),
                        t.stringLiteral(version)
                    )
                );
                return list;
            }, []))
        )
    ]);

    return generate(ast).code;
}
