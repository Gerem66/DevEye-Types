import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapLimit } from './pool';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapLimit', () => {
    it('keeps the order and never runs more than the limit at once', async () => {
        let running = 0;
        let peak = 0;
        const out = await mapLimit([30, 5, 20, 1, 10, 2], 2, async (ms, i) => {
            running++;
            peak = Math.max(peak, running);
            await sleep(ms);
            running--;
            return `${i}:${ms}`;
        });
        assert.deepEqual(out, ['0:30', '1:5', '2:20', '3:1', '4:10', '5:2']);
        assert.equal(peak, 2);
    });

    it('lets fast items pass a slow one instead of waiting for it', async () => {
        const done: number[] = [];
        await mapLimit([50, 1, 1, 1], 2, async (ms, i) => {
            await sleep(ms);
            done.push(i);
        });
        assert.deepEqual(done, [1, 2, 3, 0]);
    });

    it('resolves at once on nothing, and treats a limit below one as one', async () => {
        assert.deepEqual(await mapLimit([], 4, () => Promise.resolve(1)), []);
        assert.deepEqual(await mapLimit([1, 2], 0, (n) => Promise.resolve(n * 2)), [2, 4]);
    });
});
