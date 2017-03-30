import test from 'ava';
import {encode, decode} from './base62';

function testEquality (t, num) {
    const encoded = encode(num);
    const decoded = decode(encoded);
    t.is(decoded, num);
}

test('should encode and decode numbers', t => {
    for (let num = 0; num < 5000; num++) {
        testEquality(t, num);
    }
});
