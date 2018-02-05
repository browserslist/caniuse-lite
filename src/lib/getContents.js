import path from 'path';
import fs from 'mz/fs';

const getContentsFactory = base => files =>
    Promise.all(
        files.map(file =>
            fs.readFile(path.join(base, file), 'utf8').then(data => ({
                name: path.basename(file, '.json'),
                contents: JSON.parse(data)
            }))
        )
    );

export default getContentsFactory;
