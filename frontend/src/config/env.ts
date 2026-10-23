import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api'),
});

const parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid frontend environment variables:', parsed.error.format());
  throw new Error('Frontend environment variable validation failed');
}

export const env = parsed.data;
