import { z } from 'zod';

export const logEntrySchema = z.object({
    id: z.number().int().nonnegative(),
    uid: z.number().int().nonnegative(),
    ip: z.string(),
    level: z.number().int(),
    type: z.string(),
    description: z.string(),
    date: z.number().int().nonnegative()
});

export type LogEntry = z.infer<typeof logEntrySchema>;

export interface LogRow {
    id: number;
    uid: number;
    ip: string;
    level: number;
    type: string;
    description: string;
    date: number;
}
