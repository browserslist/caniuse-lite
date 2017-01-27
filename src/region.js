import browsers from './browsers';

export function region (data) {
    return Object.keys(data).reduce((list, key) => {
        list[browsers[key]] = data[key];
        return list;
    }, {});
}
