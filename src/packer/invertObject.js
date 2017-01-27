export default function (obj) {
    return Object.keys(obj).reduce((map, key) => {
        map[obj[key]] = key;
        return map;
    }, {});
}
