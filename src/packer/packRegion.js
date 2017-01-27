import browsers from './browsersInverted';

export default function regionPack (region) {
    const {data} = region;
    return Object.keys(data).reduce((map, key) => {
        const usage = data[key];
        map[browsers[key]] = Object.keys(usage).reduce((filtered, key) => {
            if (usage[key] === null) {
                return filtered;
            }
            filtered[key] = usage[key];
            return filtered;
        }, {});
        return map;
    }, {});
}
