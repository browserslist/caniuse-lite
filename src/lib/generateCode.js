import generate from 'babel-generator';

export default function generateCode (ast) {
    return generate(ast, {minified: true}).code + '\n';
}
