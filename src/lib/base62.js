const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function encode(integer) {
    let remainder = integer;
    let result = '';
    do {
        result += characters[remainder % 62];
        remainder = Math.floor(remainder / 62);
    } while (remainder);
    return result;
}

export const decode = string =>
    string
        .split('')
        .reduce(
            (memo, character, index) =>
                memo + characters.indexOf(character) * Math.pow(62, index),
            0
        );
