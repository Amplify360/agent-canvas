const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type OpenRouterMessageRole = 'system' | 'user' | 'assistant';

export interface OpenRouterMessage {
  role: OpenRouterMessageRole;
  content: string | Array<Record<string, unknown>>;
}

export interface OpenRouterChatOptions {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
}

export class OpenRouterClient {
  constructor(
    private readonly apiKey: string,
    private readonly appTitle = 'AgentCanvas',
    private readonly referer = process.env.BASE_URL ?? 'http://localhost:3000'
  ) {}

  static fromEnv(appTitle?: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    return new OpenRouterClient(apiKey, appTitle);
  }

  async chat({
    model,
    messages,
    temperature,
    maxTokens,
    responseFormat,
  }: OpenRouterChatOptions) {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.referer,
        'X-Title': this.appTitle,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
}
