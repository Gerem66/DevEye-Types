import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clientMessageSchema, commandTaskSchema, TASK_TITLE_MAX } from './envelope';

const ID = '0b6f5e0a-2a57-4a55-9a56-0d7c1d2a3b4c';

describe('commandTaskSchema', () => {
    it('accepts the label a client sends with a long command', () => {
        const tag = commandTaskSchema.parse({
            id: ID,
            title: '  Suppression du partage  ',
            subject: 'Documents',
            feature: 'cloudsync',
            itemId: '12',
            key: 'share.delete',
            done: 'Partage supprimé.',
            failed: 'Suppression impossible.'
        });
        assert.equal(tag.title, 'Suppression du partage');
    });

    it('refuses an id that is not one, an empty title and a title too long', () => {
        assert.equal(commandTaskSchema.safeParse({ id: 'short', title: 'x' }).success, false);
        assert.equal(commandTaskSchema.safeParse({ id: `${ID}/../x`, title: 'x' }).success, false);
        assert.equal(commandTaskSchema.safeParse({ id: ID, title: '   ' }).success, false);
        assert.equal(
            commandTaskSchema.safeParse({ id: ID, title: 'x'.repeat(TASK_TITLE_MAX + 1) }).success,
            false
        );
    });
});

describe('clientMessageSchema', () => {
    it('carries the task tag beside the workspace, and stays valid without it', () => {
        const base = { requestId: 'r-1', command: 'cloudSync.deleteShare', payload: {} };
        assert.equal(clientMessageSchema.parse(base).task, undefined);
        assert.equal(
            clientMessageSchema.parse({ ...base, task: { id: ID, title: 'Suppression' } }).task?.id,
            ID
        );
        assert.equal(clientMessageSchema.safeParse({ ...base, task: { id: ID } }).success, false);
    });
});
