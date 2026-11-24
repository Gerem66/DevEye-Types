import { z } from 'zod';

/** A day that exists, written `YYYY-MM-DD`, within what a `DATE` column holds (year 1000 onwards). */
export function isCalendarDay(text: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return false;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (year < 1000) return false;
    const at = new Date(Date.UTC(year, month - 1, day));
    return (
        at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day
    );
}

/**
 * A calendar day, `YYYY-MM-DD`. A bare pattern accepts `2026-99-99`, which
 * then fails on the `DATE` column as a server error instead of a refused
 * input. `message` is yours, in the language of your interface.
 */
export function calendarDaySchema(message = 'Expected a calendar day, YYYY-MM-DD') {
    return z.string().refine(isCalendarDay, message);
}
