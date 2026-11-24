import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calendarDaySchema, isCalendarDay } from './day';

test('a calendar day is a day that exists, in the one spelling a DATE column takes', () => {
    for (const day of ['2026-11-24', '2024-02-29', '1000-01-01', '9999-12-31']) {
        assert.equal(isCalendarDay(day), true, day);
    }
    for (const day of [
        '2026-99-99',
        '2026-02-30',
        '2025-02-29',
        '2026-00-10',
        '2026-10-00',
        '0999-12-31',
        '0000-00-00',
        '2026-1-5',
        '26-11-24',
        '2026-11-24T10:00:00Z',
        ' 2026-11-24',
        '2026/11/24',
        ''
    ]) {
        assert.equal(isCalendarDay(day), false, day);
    }
});

test('calendarDaySchema refuses with the message it was given', () => {
    const schema = calendarDaySchema('Date attendue au format AAAA-MM-JJ');
    assert.equal(schema.parse('2026-11-24'), '2026-11-24');
    const refused = schema.safeParse('2026-02-30');
    assert.equal(refused.success, false);
    assert.equal(refused.error?.issues[0]?.message, 'Date attendue au format AAAA-MM-JJ');
    assert.equal(schema.safeParse(20261124).success, false);
});
