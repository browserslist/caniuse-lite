import test from 'ava';
import unpack from './unpack';

function testUnpack (t, packed, unpacked) {
    t.is(unpack(packed), unpacked);
}

test(
    testUnpack,
    1,
    "y"
);

test(
    testUnpack,
    2,
    "n"
);

test(
    testUnpack,
    4,
    "a"
);

test(
    testUnpack,
    8,
    "p"
);

test(
    testUnpack,
    16,
    "u"
);

test(
    testUnpack,
    32,
    "x"
);

test(
    testUnpack,
    64,
    "d"
);

test(
    testUnpack,
    128,
    "#1"
);

test(
    testUnpack,
    256,
    "#2"
);

test(
    testUnpack,
    260,
    "a #2"
);
