import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FEATURE_REGISTRY } from './featureRegistry';

test('every native that notifies says when, and none says it without notifying', () => {
    for (const feature of FEATURE_REGISTRY) {
        if (feature.notifies) {
            assert.ok(
                feature.notifications?.hint.trim(),
                `${feature.id}: notifies without notifications.hint`
            );
        } else {
            assert.equal(
                feature.notifications,
                undefined,
                `${feature.id}: notifications.hint without notifies`
            );
        }
    }
});

test('no registry sentence carries an em dash', () => {
    for (const feature of FEATURE_REGISTRY) {
        for (const text of [
            feature.description,
            feature.sources?.hint,
            feature.notifications?.hint
        ]) {
            if (text) assert.equal(text.includes('—'), false, `${feature.id}: « ${text} »`);
        }
    }
});
