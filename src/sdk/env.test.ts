import assert from 'node:assert/strict';
import test from 'node:test';

import { defineModuleEnv, moduleEnvProblem, readModuleEnv } from './env';

const SPEC = defineModuleEnv({
    X_TICK_SECONDS: { kind: 'int', default: 60 },
    X_PORT: { kind: 'int', default: 2525, min: 0 },
    X_NAME: { kind: 'text', default: 'eur' },
    X_DIR: { kind: 'path', default: '/data/x' },
    X_SITE_URL: { kind: 'url', default: 'https://deveye.fr' },
    X_IPV4_ONLY: { kind: 'flag', default: true },
    X_DIRECTORY: { kind: 'choice', default: 'production', choices: ['production', 'staging'] },
    X_SECRET: { kind: 'secret' },
    X_CLIENT_ID: { kind: 'text', default: '', optional: true }
});

test('readModuleEnv: an empty environment gets every default, and names each one', () => {
    const { values, defaulted } = readModuleEnv(SPEC, {});
    assert.deepEqual(values, {
        X_TICK_SECONDS: 60,
        X_PORT: 2525,
        X_NAME: 'eur',
        X_DIR: '/data/x',
        X_SITE_URL: 'https://deveye.fr',
        X_IPV4_ONLY: true,
        X_DIRECTORY: 'production',
        X_SECRET: '',
        X_CLIENT_ID: ''
    });
    // An optional variable left unset is an option the install does not use: no word.
    assert.deepEqual(
        defaulted.map((d) => d.name),
        [
            'X_TICK_SECONDS',
            'X_PORT',
            'X_NAME',
            'X_DIR',
            'X_SITE_URL',
            'X_IPV4_ONLY',
            'X_DIRECTORY',
            'X_SECRET'
        ]
    );
    assert.ok(defaulted.every((d) => d.reason === 'unset'));
    assert.deepEqual(
        defaulted.find((d) => d.name === 'X_SITE_URL'),
        { name: 'X_SITE_URL', reason: 'unset', value: 'https://deveye.fr' }
    );
});

test('readModuleEnv: explicit values are read and trimmed, and nothing is reported', () => {
    const { values, defaulted } = readModuleEnv(SPEC, {
        X_TICK_SECONDS: ' 30 ',
        X_PORT: '0',
        X_NAME: 'usd',
        X_DIR: '/srv/x',
        X_SITE_URL: 'https://exemple.fr',
        X_IPV4_ONLY: 'FALSE',
        X_DIRECTORY: 'staging',
        X_SECRET: 's3cr3t',
        X_CLIENT_ID: 'abc'
    });
    assert.equal(values.X_TICK_SECONDS, 30);
    assert.equal(values.X_PORT, 0);
    assert.equal(values.X_NAME, 'usd');
    assert.equal(values.X_DIR, '/srv/x');
    assert.equal(values.X_SITE_URL, 'https://exemple.fr');
    assert.equal(values.X_IPV4_ONLY, false);
    assert.equal(values.X_DIRECTORY, 'staging');
    assert.equal(values.X_SECRET, 's3cr3t');
    assert.equal(values.X_CLIENT_ID, 'abc');
    assert.deepEqual(defaulted, []);
});

test('readModuleEnv: an empty string is explicit, falls back quietly, and means "none" for an address', () => {
    const blanks = Object.fromEntries(Object.keys(SPEC).map((name) => [name, '']));
    const { values, defaulted } = readModuleEnv(SPEC, blanks);
    assert.equal(values.X_TICK_SECONDS, 60);
    assert.equal(values.X_DIR, '/data/x');
    assert.equal(values.X_NAME, 'eur');
    assert.equal(values.X_IPV4_ONLY, true);
    assert.equal(values.X_DIRECTORY, 'production');
    assert.equal(values.X_SITE_URL, '');
    assert.equal(values.X_SECRET, '');
    assert.deepEqual(defaulted, []);
});

test('readModuleEnv: an unreadable value falls back and is reported as invalid', () => {
    const { values, defaulted } = readModuleEnv(SPEC, {
        X_TICK_SECONDS: '0',
        X_PORT: '-1',
        X_SITE_URL: 'deveye.fr',
        X_IPV4_ONLY: 'oui',
        X_DIRECTORY: 'test'
    });
    assert.equal(values.X_TICK_SECONDS, 60);
    assert.equal(values.X_PORT, 2525);
    assert.equal(values.X_SITE_URL, 'https://deveye.fr');
    assert.equal(values.X_IPV4_ONLY, true);
    assert.equal(values.X_DIRECTORY, 'production');
    const invalid = defaulted.filter((d) => d.reason === 'invalid').map((d) => d.name);
    assert.deepEqual(invalid, [
        'X_TICK_SECONDS',
        'X_PORT',
        'X_SITE_URL',
        'X_IPV4_ONLY',
        'X_DIRECTORY'
    ]);
});

test('readModuleEnv: an integer must be whole and at least its minimum', () => {
    const spec = defineModuleEnv({ X_RATIO: { kind: 'int', default: 30, min: 2 } });
    assert.equal(readModuleEnv(spec, { X_RATIO: '2' }).values.X_RATIO, 2);
    assert.equal(readModuleEnv(spec, { X_RATIO: '1' }).values.X_RATIO, 30);
    assert.equal(readModuleEnv(spec, { X_RATIO: '2.5' }).values.X_RATIO, 30);
    assert.equal(readModuleEnv(spec, { X_RATIO: 'abc' }).values.X_RATIO, 30);
});

test('readModuleEnv: an invalid optional value is still reported', () => {
    const spec = defineModuleEnv({ X_HOOK: { kind: 'url', default: '', optional: true } });
    assert.deepEqual(readModuleEnv(spec, {}).defaulted, []);
    assert.deepEqual(readModuleEnv(spec, { X_HOOK: 'ftp://x' }).defaulted, [
        { name: 'X_HOOK', reason: 'invalid', value: '' }
    ]);
});

test('readModuleEnv: the values stay writable, for tests that redirect a directory', () => {
    const { values } = readModuleEnv(SPEC, {});
    values.X_DIR = '/tmp/scratch';
    assert.equal(values.X_DIR, '/tmp/scratch');
});

test('moduleEnvProblem: refuses what the host could not read', () => {
    assert.equal(moduleEnvProblem(SPEC), null);
    assert.match(
        moduleEnvProblem({ 'x-tick': { kind: 'int', default: 1 } }) ?? '',
        /not an environment variable name/
    );
    assert.match(
        moduleEnvProblem({ X_TICK: { kind: 'number', default: 1 } }) ?? '',
        /unknown kind/
    );
    assert.match(moduleEnvProblem({ X_TICK: null }) ?? '', /unknown kind/);
    assert.match(
        moduleEnvProblem({ X_MODE: { kind: 'choice', default: 'c', choices: ['a', 'b'] } }) ?? '',
        /not one of the choices/
    );
    assert.match(moduleEnvProblem(null) ?? '', /not an object/);
});
