import statuses from '../lib/statuses';
import supported from '../lib/supported';
import {browsers} from './browsers';
import {browserVersions as versions} from './browserVersions';

function unpackSupport (cipher) {
    // bit flags
    const stats = Object.keys(supported).reduce((list, support) => {
        if (cipher & supported[support]) list.push(support);
        return list;
    }, []);

    // notes
    let notes = cipher >> 7;
    let notesArray = [];
    while (notes) {
        let note = Math.floor(Math.log2(notes)) + 1;
        notesArray.unshift(`#${note}`);
        notes -= Math.pow(2, note - 1);
    }

    return stats.concat(notesArray).join(' ');
}

export default function unpackFeature (packed) {
    const unpacked = {status: statuses[packed.B]};
    unpacked.stats = Object.keys(packed.A).reduce((browserStats, key) => {
        const browser = packed.A[key];
        browserStats[browsers[key]] = Object.keys(browser).reduce((stats, support) => {
            const packedVersions = browser[support].split(' ');
            const unpacked = unpackSupport(support);
            packedVersions.forEach(v => stats[versions[v]] = unpacked);
            return stats;
        }, {});
        return browserStats;
    }, {});
    return unpacked;
}
