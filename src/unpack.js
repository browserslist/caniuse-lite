import supported from './supported';

export default function unpack (cipher) {
    // bit flags
    const stats = Object.keys(supported).reduce((list, support) => {
        if (cipher & supported[support]) list.push(support);
        return list;
    }, []);

    // notes
    let notes = cipher >> 7;
    while (notes) {
        let note = Math.floor(Math.log2(notes)) + 1;
        stats.push(`#${note}`);
        notes -= Math.pow(2, note - 1);
    }

    return stats.join(' ');
}
