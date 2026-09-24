import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pathExclusionProblem } from './pathExclusions';

describe('pathExclusionProblem', () => {
    it('accepts a relative path, refuses one that escapes or starts at the root', () => {
        assert.equal(pathExclusionProblem('path', 'build/cache'), null);
        assert.notEqual(pathExclusionProblem('path', '/etc'), null);
        assert.notEqual(pathExclusionProblem('path', 'a/../b'), null);
        assert.notEqual(pathExclusionProblem('path', 'a//b'), null);
        assert.notEqual(pathExclusionProblem('path', 'a\\b'), null);
    });

    it('refuses a name with a separator', () => {
        assert.equal(pathExclusionProblem('name', 'node_modules'), null);
        assert.notEqual(pathExclusionProblem('name', 'a/b'), null);
        assert.notEqual(pathExclusionProblem('name', '..'), null);
    });

    it('refuses what the agent’s regex engine cannot run', () => {
        assert.equal(pathExclusionProblem('regex', '\\.log$'), null);
        assert.equal(pathExclusionProblem('regex', '^(?<dir>tmp)/'), null);
        assert.notEqual(pathExclusionProblem('regex', '('), null);
        assert.notEqual(pathExclusionProblem('regex', 'foo(?=bar)'), null);
        assert.notEqual(pathExclusionProblem('regex', '(?<!x)y'), null);
        assert.notEqual(pathExclusionProblem('regex', '(a)\\1'), null);
    });
});
