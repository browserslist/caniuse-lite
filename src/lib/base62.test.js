import {encode, decode} from './base62';

function testEquality (num) {
    const encoded = encode(num);
    const decoded = decode(encoded);
    return decoded === num;
}

it('should encode and decode numbers', () => {
    for (let num = 0; num < 5000; num++) {
        expect(testEquality(num)).toBeTruthy();
    }
});
