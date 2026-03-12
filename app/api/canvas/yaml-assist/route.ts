import { NextResponse } from 'next/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { OpenRouterClient } from '@/server/openrouter';
import { extractOpenRouterTextContent, parseJsonObject } from '@/server/transformationMapAi';
import { buildYamlAssistMessages, normalizeYamlAssistResult } from '@/server/yamlAssist';
import {
  DEFAULT_IMPORT_YAML_ASSIST_PROMPT,
  IMPORT_YAML_ASSIST_MODEL_FALLBACK,
  type ImportYamlAssistRequest,
} from '@/canvas/yamlAssist';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as ImportYamlAssistRequest;
    if (!body.notes?.trim()) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    const client = OpenRouterClient.fromEnv('AgentCanvas YAML Import');
    const model =
      body.model?.trim() ||
      process.env.OPENROUTER_YAML_ASSIST_MODEL ||
      IMPORT_YAML_ASSIST_MODEL_FALLBACK;

    const response = await client.chat({
      model,
      messages: buildYamlAssistMessages(
        body,
        body.promptOverride?.trim() || DEFAULT_IMPORT_YAML_ASSIST_PROMPT
      ),
      temperature: 0.2,
      maxTokens: 2200,
      responseFormat: { type: 'json_object' },
    });

    const rawText = extractOpenRouterTextContent(response);
    const parsed = parseJsonObject<Record<string, unknown>>(rawText);
    return NextResponse.json({
      ok: true,
      ...normalizeYamlAssistResult(parsed, model),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate YAML' },
      { status: 500 }
    );
  }
}
