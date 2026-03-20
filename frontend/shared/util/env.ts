import { z } from "zod"

const envSchema = z.object({
    BACKEND_API_URL: z.string().url(),
})

const _env = envSchema.safeParse({
    BACKEND_API_URL: process.env.BACKEND_API_URL,
})

if (!_env.success) {
    console.error('Invalid environment variables', _env.error.format())
    throw new Error('Invalid environment variables')
}

export const ENV = _env.data