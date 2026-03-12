import { describe, expect, it } from 'vitest';
import { OpenRouterClient } from '@/server/openrouter';

describe('OpenRouterClient', () => {
  it('throws when OPENROUTER_API_KEY is missing', () => {
    const previous = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    expect(() => OpenRouterClient.fromEnv()).toThrow(
      'OPENROUTER_API_KEY is not configured'
    );

    if (previous) {
      process.env.OPENROUTER_API_KEY = previous;
    }
  });
});
