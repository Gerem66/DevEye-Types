import { z } from 'zod';
import {
    weatherFormatSchema,
    weatherLocationSchema,
    weatherProviderSchema,
    weatherReportSchema
} from '../domain/weather';

const locationId = z.string().uuid();

export const weatherList = {
    command: 'weather.list' as const,
    input: z.object({}),
    output: z.object({ locations: z.array(weatherLocationSchema) })
};

/** Add a weather widget by city name; the server geocodes it to coordinates. */
export const weatherAdd = {
    command: 'weather.add' as const,
    input: z.object({
        query: z.string().min(1).max(120),
        format: weatherFormatSchema.default('current'),
        days: z.number().int().min(1).max(16).default(7),
        provider: weatherProviderSchema.default('open-meteo')
    }),
    output: z.object({ location: weatherLocationSchema })
};

export const weatherUpdate = {
    command: 'weather.update' as const,
    input: z.object({
        id: locationId,
        format: weatherFormatSchema.optional(),
        days: z.number().int().min(1).max(16).optional(),
        position: z.number().int().nonnegative().optional()
    }),
    output: z.object({ location: weatherLocationSchema })
};

export const weatherRemove = {
    command: 'weather.remove' as const,
    input: z.object({ id: locationId }),
    output: z.object({ id: locationId })
};

/** Fetch a live report for a configured location. */
export const weatherGet = {
    command: 'weather.get' as const,
    input: z.object({ id: locationId }),
    output: z.object({ report: weatherReportSchema })
};

/** Store or clear the per-account API key for an advanced provider. */
export const weatherSetKey = {
    command: 'weather.setKey' as const,
    input: z.object({
        provider: weatherProviderSchema,
        key: z.string().max(256)
    }),
    output: z.object({ provider: weatherProviderSchema, hasKey: z.boolean() })
};

export const weatherCommands = [
    weatherList,
    weatherAdd,
    weatherUpdate,
    weatherRemove,
    weatherGet,
    weatherSetKey
] as const;
