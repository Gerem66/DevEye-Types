import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contentDisposition, parseByteRange } from './download';

describe('contentDisposition', () => {
    it('keeps a safe ASCII fallback and the real name in filename*', () => {
        assert.equal(
            contentDisposition('Été "final"\r\n.pdf'),
            `attachment; filename="_t_ final__.pdf"; filename*=UTF-8''${encodeURIComponent('Été "final"\r\n.pdf')}`
        );
        assert.match(contentDisposition('é', 'inline'), /^inline; filename="_"/);
        assert.match(contentDisposition('   '), /filename="fichier"/);
    });
});

describe('parseByteRange', () => {
    it('reads the three forms, clamped to the body', () => {
        assert.deepEqual(parseByteRange('bytes=0-99', 1000), { start: 0, end: 99 });
        assert.deepEqual(parseByteRange('bytes=900-', 1000), { start: 900, end: 999 });
        assert.deepEqual(parseByteRange('bytes=-100', 1000), { start: 900, end: 999 });
        assert.deepEqual(parseByteRange('bytes=-5000', 1000), { start: 0, end: 999 });
        assert.deepEqual(parseByteRange('bytes=10-5000', 1000), { start: 10, end: 999 });
    });

    it('serves the whole body when there is nothing it can honour', () => {
        assert.equal(parseByteRange(undefined, 1000), null);
        assert.equal(parseByteRange('bytes=0-1,5-9', 1000), null);
        assert.equal(parseByteRange('items=0-1', 1000), null);
        assert.equal(parseByteRange('bytes=-', 1000), null);
        assert.equal(parseByteRange('bytes=9-5', 1000), null);
    });

    it('calls out what lies past the end', () => {
        assert.equal(parseByteRange('bytes=1000-', 1000), 'unsatisfiable');
        assert.equal(parseByteRange('bytes=-0', 1000), 'unsatisfiable');
        assert.equal(parseByteRange('bytes=0-', 0), 'unsatisfiable');
        assert.equal(parseByteRange('bytes=-10', 0), 'unsatisfiable');
    });
});
