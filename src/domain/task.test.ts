import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sessionFrameSchema } from './maintenance';
import { taskRemovedSchema, taskRosterSchema, taskSchema } from './task';

const ID = '0b6f5e0a-2a57-4a55-9a56-0d7c1d2a3b4c';

const running = {
    id: ID,
    state: 'running',
    title: 'Suppression du point de restauration',
    subject: 'Documents',
    feature: 'cloudsync',
    itemId: '12',
    key: 'snapshot.delete',
    workspaceId: 3,
    startedAt: 1_794_000_000_000,
    endedAt: null,
    progress: { done: 2, total: 8, step: 'Libération' },
    done: 'Point de restauration supprimé.',
    failed: 'Suppression impossible.',
    error: null
};

describe('taskSchema', () => {
    it('reads a running operation, measured or not', () => {
        assert.equal(taskSchema.parse(running).progress?.done, 2);
        assert.equal(taskSchema.parse({ ...running, progress: null }).progress, null);
        assert.equal(taskSchema.parse({ ...running, progress: {} }).progress?.total, undefined);
    });

    it('carries the code and the sentence of a failure, nothing else', () => {
        const failed = taskSchema.parse({
            ...running,
            state: 'failed',
            endedAt: 1_794_000_009_000,
            error: { code: 'conflict', message: 'Déjà en cours.', details: { input: 'secret' } }
        });
        assert.deepEqual(failed.error, { code: 'conflict', message: 'Déjà en cours.' });
        assert.equal(
            taskSchema.safeParse({
                ...running,
                state: 'failed',
                error: { code: 'nope', message: 'x' }
            }).success,
            false
        );
    });

    it('refuses a state the area does not know and an operation without a workspace', () => {
        assert.equal(taskSchema.safeParse({ ...running, state: 'lost' }).success, false);
        assert.equal(taskSchema.safeParse({ ...running, workspaceId: 0 }).success, false);
    });
});

describe('the roster of the session frame', () => {
    it('travels with the frame, which stays valid without it', () => {
        const frame = { userId: 1, version: '0.26.1' };
        assert.equal(sessionFrameSchema.parse(frame).tasks, undefined);
        const withTasks = sessionFrameSchema.parse({
            ...frame,
            tasks: { epoch: 'a', list: [running] }
        });
        assert.equal(withTasks.tasks?.list[0]?.id, ID);
        assert.equal(taskRosterSchema.safeParse({ epoch: '', list: [] }).success, false);
    });

    it('names the operations a dismissal removes', () => {
        assert.deepEqual(taskRemovedSchema.parse({ ids: [ID] }).ids, [ID]);
        assert.equal(taskRemovedSchema.safeParse({ ids: ['../x'] }).success, false);
    });
});
