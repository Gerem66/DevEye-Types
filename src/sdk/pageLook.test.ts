import assert from 'node:assert/strict';
import test from 'node:test';

import { accentInk, accentSoft, pageAccentSchema, resolvePageAccent } from './pageLook';

test('an accent is an account colour, a #rrggbb, or none', () => {
    assert.equal(resolvePageAccent('blue'), '#4da8ff');
    assert.equal(resolvePageAccent(' #ABCDEF '), '#abcdef');
    assert.equal(resolvePageAccent(''), null);
    assert.equal(resolvePageAccent('#fff'), null);
    assert.equal(resolvePageAccent('#000;}body{display:none'), null);
});

test('the schema keeps only what resolves, normalised', () => {
    assert.equal(pageAccentSchema.parse(' Purple '), 'purple');
    assert.equal(pageAccentSchema.parse('#A1B2C3'), '#a1b2c3');
    assert.equal(pageAccentSchema.parse(''), '');
    assert.equal(pageAccentSchema.safeParse('javascript:alert(1)').success, false);
});

test('the ink on an accent follows its luminance, its soft tone the theme', () => {
    assert.equal(accentInk('#ffd54a'), '#10202e');
    assert.equal(accentInk('#0f172a'), '#ffffff');
    assert.equal(accentSoft('#b088ff', 'dark'), 'rgba(176, 136, 255, 0.22)');
    assert.equal(accentSoft('#b088ff', 'light'), 'rgba(176, 136, 255, 0.14)');
});
