import path from 'path';
import fs from 'mz/fs';

export default function getContentsFactory (base) {
    return function getContents (files) {
        return Promise.all(
            files.map(file => fs.readFile(path.join(base, file), 'utf8')
                .then(data => {
                    return {
                        name: path.basename(file, '.json'),
                        contents: JSON.parse(data),
                    };
                }))
        );
    }
}
