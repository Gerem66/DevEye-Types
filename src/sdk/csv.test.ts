import assert from 'node:assert/strict';
import test from 'node:test';

import { csvCell, toCsv } from './csv';

test('csvCell: a formula trigger gets an apostrophe, a number does not, a separator gets quotes', () => {
    assert.equal(csvCell('=SUM(A1:A9)'), "'=SUM(A1:A9)");
    assert.equal(csvCell('@cmd'), "'@cmd");
    assert.equal(csvCell('+33 6 12 34 56 78'), "'+33 6 12 34 56 78");
    assert.equal(csvCell('-12.50'), '-12.50');
    assert.equal(csvCell('-12,50'), '-12,50');
    assert.equal(csvCell('a;b'), '"a;b"');
    assert.equal(csvCell('a,b', ','), '"a,b"');
    assert.equal(csvCell('a,b'), 'a,b');
    assert.equal(csvCell('dit "oui"'), '"dit ""oui"""');
    assert.equal(csvCell('ligne\nsuite'), '"ligne\nsuite"');
});

test('toCsv: a byte order mark, CRLF rows, the separator of choice', () => {
    assert.equal(
        toCsv([
            ['a', 'b'],
            ['1', '=2']
        ]),
        "\ufeffa;b\r\n1;'=2"
    );
    assert.equal(toCsv([['a', 'b']], ','), '\ufeffa,b');
});
