import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';

import {
    BLOB_CHUNK_BYTES,
    openSealedRange,
    openSealedStream,
    sealedSize,
    sealStream
} from './devb';

const KEY = crypto.createHash('sha256').update('test key').digest();

async function* once(data: Buffer): AsyncGenerator<Buffer> {
    yield data;
}

/** Hands a slice back in small pieces, as a network read would. */
async function* sliced(data: Buffer, start: number, end: number): AsyncGenerator<Buffer> {
    for (let at = start; at <= end; at += 70_001) {
        yield data.subarray(at, Math.min(at + 70_001, end + 1));
    }
}

async function collect(source: AsyncIterable<Buffer>): Promise<Buffer> {
    const parts: Buffer[] = [];
    for await (const chunk of source) parts.push(chunk);
    return Buffer.concat(parts);
}

const seal = (data: Buffer, source?: AsyncIterable<Buffer>) =>
    collect(sealStream(KEY, source ?? once(data)));

describe('sealStream / openSealedStream', () => {
    it('gives back exactly what it was given, empty included, at every chunk boundary', async () => {
        for (const size of [
            0,
            1,
            1024,
            BLOB_CHUNK_BYTES - 1,
            BLOB_CHUNK_BYTES,
            BLOB_CHUNK_BYTES + 1
        ]) {
            const data = crypto.randomBytes(size);
            const sealed = await seal(data);
            assert.equal(sealed.length, sealedSize(size), `sealed size of ${size}`);
            assert.deepEqual(
                await collect(openSealedStream(KEY, once(sealed))),
                data,
                `size ${size}`
            );
        }
    });

    it('ignores how the source is cut', async () => {
        const data = crypto.randomBytes(BLOB_CHUNK_BYTES + 9999);
        async function* ragged(): AsyncGenerator<Buffer> {
            let offset = 0;
            for (const size of [1, 7, 100_000, 3, BLOB_CHUNK_BYTES, 512]) {
                if (offset >= data.length) break;
                yield data.subarray(offset, Math.min(offset + size, data.length));
                offset += size;
            }
            if (offset < data.length) yield data.subarray(offset);
        }
        assert.deepEqual(
            await collect(openSealedStream(KEY, once(await seal(data, ragged())))),
            data
        );
    });

    it('refuses a truncated blob, a tampered one, and another key', async () => {
        const sealed = await seal(crypto.randomBytes(BLOB_CHUNK_BYTES * 2));
        await assert.rejects(() =>
            collect(openSealedStream(KEY, once(sealed.subarray(0, sealed.length - 64))))
        );
        const tampered = Buffer.from(sealed);
        tampered[tampered.length - 40] ^= 0xff;
        await assert.rejects(() => collect(openSealedStream(KEY, once(tampered))));
        const other = crypto.createHash('sha256').update('other key').digest();
        await assert.rejects(() => collect(openSealedStream(other, once(sealed))));
    });
});

describe('openSealedRange', () => {
    const C = BLOB_CHUNK_BYTES;

    it('reads any inclusive range, within a chunk or across several, up to the last byte', async () => {
        for (const size of [1, 5000, C, C + 1, 3 * C + 17]) {
            const data = crypto.randomBytes(size);
            const sealed = await seal(data);
            const read = (r: { start: number; end: number }) => sliced(sealed, r.start, r.end);
            const clamp = (n: number) => Math.min(size - 1, Math.max(0, n));
            const ranges = [
                [0, 0],
                [0, size - 1],
                [size - 1, size - 1],
                [Math.floor(size / 2), size - 1],
                [clamp(C - 3), clamp(C + 2)],
                [clamp(C), clamp(2 * C + 5)]
            ];
            for (const [start, end] of ranges) {
                const got = await collect(openSealedRange(KEY, read, size, { start, end }));
                assert.deepEqual(
                    got,
                    data.subarray(start, end + 1),
                    `size ${size}, ${start}-${end}`
                );
            }
        }
    });

    it('reads only the header and the chunks that hold the range', async () => {
        const size = 3 * C + 10;
        const sealed = await seal(crypto.randomBytes(size));
        const reads: { start: number; end: number }[] = [];
        const read = (r: { start: number; end: number }) => {
            reads.push(r);
            return sliced(sealed, r.start, r.end);
        };
        await collect(openSealedRange(KEY, read, size, { start: C + 5, end: C + 10 }));
        assert.equal(reads.length, 2);
        assert.equal(reads[1].end - reads[1].start + 1, C + 16);
    });

    it('refuses a range outside the blob, a tampered chunk, and a short read', async () => {
        const size = 2 * C;
        const sealed = await seal(crypto.randomBytes(size));
        const read = (r: { start: number; end: number }) => sliced(sealed, r.start, r.end);
        await assert.rejects(() =>
            collect(openSealedRange(KEY, read, size, { start: 0, end: size }))
        );
        await assert.rejects(() => collect(openSealedRange(KEY, read, size, { start: 5, end: 4 })));
        const tampered = Buffer.from(sealed);
        tampered[C + 100] ^= 0xff;
        const readTampered = (r: { start: number; end: number }) =>
            sliced(tampered, r.start, r.end);
        await assert.rejects(() =>
            collect(openSealedRange(KEY, readTampered, size, { start: C - 10, end: C + 10 }))
        );
        const short = (r: { start: number; end: number }) =>
            sliced(sealed, r.start, Math.min(r.end, r.start + 100));
        await assert.rejects(() =>
            collect(openSealedRange(KEY, short, size, { start: 0, end: 10 }))
        );
    });
});
